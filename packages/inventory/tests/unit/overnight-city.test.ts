import { describe, expect, it } from "vitest"

import type { DraftDay } from "../../src/import/draft.js"
import { resolveOvernightCities } from "../../src/import/overnight-city.js"

function day(input: Partial<DraftDay> & { dayNumber: number }): DraftDay {
  return {
    title: "",
    routeChain: [],
    distanceKm: null,
    driveMinutes: null,
    meals: {},
    accommodation: null,
    bodyHtml: "",
    pois: [],
    ...input,
  }
}

describe("每日落脚城市", () => {
  it("住宿写成城市名时直接取它", () => {
    // 住宿按定义就是过夜地,写成城市名时比任何推断都准。
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["喀什", "白沙湖", "塔吉克家访"], accommodation: "塔县" }),
    ])
    expect(cities).toEqual(["塔县"])
  })

  it("住宿写成酒店全名时不当城市用", () => {
    // 「伊宁玛格丽特民宿或同级」里的城市取不出来,硬取会把酒店名印上总览表。
    const cities = resolveOvernightCities([
      day({
        dayNumber: 1,
        routeChain: ["全国各地", "伊宁"],
        accommodation: "伊宁玛格丽特民宿或同级",
      }),
      day({ dayNumber: 2, routeChain: ["伊宁", "赛里木湖"] }),
    ])
    expect(cities[0]).toBe("伊宁")
  })

  it("无住宿时取次日行程的起点", () => {
    // 行程都是从昨晚睡的地方写起,次日起点即昨日落脚点。
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["乌鲁木齐", "101省道", "独山子大峡谷"] }),
      day({ dayNumber: 2, routeChain: ["奎屯", "赛里木湖"] }),
    ])
    expect(cities[0]).toBe("奎屯")
  })

  it("末日没有次日可参照,退回自己的末站", () => {
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["乌鲁木齐"] }),
      day({ dayNumber: 2, routeChain: ["乌鲁木齐", "库尔勒"] }),
    ])
    expect(cities[1]).toBe("库尔勒")
  })

  it("次日起点是占位地名时跳过它", () => {
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["乌鲁木齐"] }),
      day({ dayNumber: 2, routeChain: ["出发地", "喀什"] }),
    ])
    expect(cities[0]).toBe("喀什")
  })

  it("末站是占位地名时向前找", () => {
    // 末日常写作「喀什-送机-返回温暖的家」,不能把「温暖的家」当落脚城市。
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["喀什", "送机", "返回温暖的家"] }),
    ])
    expect(cities[0]).toBe("送机")
  })

  it("推不出来时留空,不拿活动名冒充", () => {
    const cities = resolveOvernightCities([day({ dayNumber: 1, routeChain: ["全国各地"] })])
    expect(cities).toEqual([null])
  })

  it("住宿含分隔符时不当城市用", () => {
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["喀什"], accommodation: "温泉花间堂·阿日相" }),
    ])
    expect(cities[0]).toBe("喀什")
  })

  it("住宿过长时不当城市用", () => {
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["奎屯"], accommodation: "赛里木湖畔星空帐篷营地" }),
    ])
    expect(cities[0]).toBe("奎屯")
  })
})

describe("地名归一", () => {
  it("剥掉「一日」这类行程限定词", () => {
    // 「库尔德宁一日-中沟秘境感受」里的「一日」说的是在那儿待一整天,
    // 照抄下来总览表就会出现「库尔德宁一日」这么个城市。
    const cities = resolveOvernightCities([
      day({ dayNumber: 1, routeChain: ["昭苏", "库尔德宁"] }),
      day({ dayNumber: 2, routeChain: ["库尔德宁一日", "中沟秘境感受"] }),
    ])
    expect(cities[0]).toBe("库尔德宁")
  })

  it("限定词剥光后不留空名", () => {
    const cities = resolveOvernightCities([day({ dayNumber: 1, routeChain: ["自由活动"] })])
    expect(cities[0]).toBe("自由活动")
  })
})

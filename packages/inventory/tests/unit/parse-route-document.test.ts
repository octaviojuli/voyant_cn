/// <reference types="node" />

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseRouteDocument } from "../../src/import/parse-route-document.js"

// 夹具是三家真实供应商资料的节选(头部 + 前两日 + 费用与须知),
// 三份的写法各不相同,正好覆盖解析器要扛的差异。
const FIXTURES = join(import.meta.dirname, "../fixtures/route-documents")
const read = (name: string) => readFileSync(join(FIXTURES, name), "utf8")

describe("parseRouteDocument", () => {
  describe("南疆胡杨 12 日(标准写法)", () => {
    const draft = parseRouteDocument(read("south-xinjiang-12d.txt"))

    it("认出品牌、线路名与天数", () => {
      expect(draft.brand).toBe("湖燃之间")
      expect(draft.days).toBe(12)
      expect(draft.nights).toBe(11)
      expect(draft.title).toContain("新疆南疆胡杨")
      // 线路名里不该残留 ★ # 这类装饰,它要直接用作产品名。
      expect(draft.title).not.toMatch(/[★#]/)
    })

    it("拆出井号标签", () => {
      expect(draft.tags).toEqual(expect.arrayContaining(["私家出行", "乌起喀止"]))
    })

    it("按 D 标记切出每日行程", () => {
      expect(draft.itinerary.length).toBeGreaterThanOrEqual(2)
      expect(draft.itinerary[0]?.dayNumber).toBe(1)
      expect(draft.itinerary[1]?.dayNumber).toBe(2)
    })

    it("识别餐食与住宿", () => {
      const day1 = draft.itinerary[0]
      expect(day1?.meals.breakfast).toBe("自理")
      expect(day1?.accommodation).toContain("乌鲁木齐")
      // 餐宿被剥离后不该再留在正文里,否则宣传册会重复出现。
      expect(day1?.bodyHtml).not.toContain("早餐")
      expect(day1?.bodyHtml).not.toContain("住宿：")
    })

    it("从日行标题括号里取出里程与车程", () => {
      const day2 = draft.itinerary[1]
      expect(day2?.distanceKm).toBe(45)
      expect(day2?.driveMinutes).toBe(120)
      // 括号内容已被吸收,标题只留路线链。
      expect(day2?.title).not.toContain("KM")
    })

    it("把日行标题拆成途经点", () => {
      expect(draft.itinerary[0]?.routeChain).toEqual(["全国各地", "乌鲁木齐"])
    })

    it("抽出景点词条", () => {
      const names = draft.itinerary.flatMap((day) => day.pois.map((poi) => poi.name))
      expect(names).toContain("乌鲁木齐")
      const poi = draft.itinerary
        .flatMap((day) => day.pois)
        .find((entry) => entry.name === "乌鲁木齐")
      expect(poi?.descriptionHtml).toContain("优美的牧场")
    })

    it("费用包含与不含解析成条目列表", () => {
      expect(draft.inclusionsHtml).toContain("<li>")
      expect(draft.inclusionsHtml).toContain("动车")
      expect(draft.exclusionsHtml).toContain("<li>")
      expect(draft.exclusionsHtml).toContain("单房差")
    })

    it("取出出发与结束城市供封面使用", () => {
      expect(draft.startCity).toBe("乌鲁木齐")
      expect(draft.endCity).toBeTruthy()
    })
  })

  describe("北疆 6 日(标题与 D1 黏连)", () => {
    const draft = parseRouteDocument(read("north-xinjiang-6d.txt"))

    it("即使 D1 紧跟在标题文字后也能切出行程", () => {
      // 原件写作「…夜雪探寻D1 全国各地✈阿勒泰」,没有换行。
      expect(draft.itinerary[0]?.dayNumber).toBe(1)
      expect(draft.itinerary[0]?.routeChain).toContain("阿勒泰")
    })

    it("仍能解析天数与品牌", () => {
      expect(draft.brand).toBe("寻穿北境")
      expect(draft.days).toBe(6)
      expect(draft.nights).toBe(5)
    })

    it("每日重复出现的温馨提示不影响费用章节定位", () => {
      // 这份资料每天都有「温馨提示」,费用章节仍应取自最后一日之后。
      expect(draft.exclusionsHtml).toBeTruthy()
    })
  })

  describe("伊犁 7 日", () => {
    const draft = parseRouteDocument(read("ili-7d.txt"))

    it("解析出品牌、天数与行程", () => {
      expect(draft.brand).toBe("不念城光")
      expect(draft.days).toBe(7)
      expect(draft.itinerary.length).toBeGreaterThan(0)
      expect(draft.startCity).toBe("伊宁")
    })
  })

  describe("Word 类资料(第N天 写法)", () => {
    const ili = parseRouteDocument(read("ili-8d-word.txt"))
    const south = parseRouteDocument(read("south-xinjiang-8d-word.txt"))

    it("认得中文数字的日期标记", () => {
      // 这两份资料没有 D1/D2,用的是「第一天：」。
      expect(ili.itinerary.map((day) => day.dayNumber).slice(0, 3)).toEqual([1, 2, 3])
      expect(south.itinerary.length).toBeGreaterThanOrEqual(3)
    })

    it("日行标题不残留「第一天:」前缀", () => {
      expect(ili.itinerary[0]?.title).not.toMatch(/^第.{1,3}天/)
    })

    it("三餐写在同一行时也能拆开", () => {
      const day = ili.itinerary.find((entry) => entry.meals.lunch)
      expect(day?.meals.breakfast).toBeTruthy()
      expect(day?.meals.lunch).toBeTruthy()
      expect(day?.meals.dinner).toBeTruthy()
    })

    it("认得「住：」这种简写", () => {
      expect(ili.itinerary[0]?.accommodation).toBe("乌鲁木齐")
    })

    it("途经点剔除卖点文案与住宿尾巴", () => {
      // 原文是「出发地-乌鲁木齐【和田二街的烤肉…】  住：乌鲁木齐」。
      expect(ili.itinerary[0]?.routeChain).toEqual(["出发地", "乌鲁木齐"])
    })

    it("起止城市跳过「出发地」「家」这类占位词", () => {
      expect(ili.startCity).toBe("乌鲁木齐")
      expect(south.startCity).toBe("喀什")
      expect(ili.endCity).not.toBe("家")
    })

    it("费用包含解析成条目", () => {
      expect(ili.inclusionsHtml).toContain("<li>")
      expect(south.inclusionsHtml).toContain("<li>")
    })
  })

  describe("异常与边界", () => {
    it("没有 D 标记时明确报未识别,而不是返回空行程了事", () => {
      const draft = parseRouteDocument("某某旅行社\n新疆风光 5 天 4 晚\n正文若干")
      expect(draft.itinerary).toHaveLength(0)
      expect(draft.unresolved.map((item) => item.field)).toContain("itinerary")
    })

    it("标称天数与解析天数不符时报出来", () => {
      // 节选夹具只保留了前两日,与标题的 12 天不符,必须提示人工复核。
      const draft = parseRouteDocument(read("south-xinjiang-12d.txt"))
      const mismatch = draft.unresolved.find((item) => item.field === "itinerary")
      expect(mismatch?.reason).toContain("标称")
    })

    it("缺少费用章节时逐项报出", () => {
      const draft = parseRouteDocument("品牌\n线路 3 天 2 晚\nD1 甲地-乙地\n早餐：自理\n正文")
      const fields = draft.unresolved.map((item) => item.field)
      expect(fields).toContain("inclusionsHtml")
      expect(fields).toContain("exclusionsHtml")
    })

    it("正文里顺带提到的 D3 不会被当成第三天", () => {
      const draft = parseRouteDocument(
        "品牌\n线路 2 天 1 晚\nD1 甲地-乙地\n正文\nD2 乙地-丙地\n参考 D3 的安排\n",
      )
      expect(draft.itinerary).toHaveLength(2)
    })

    it("HTML 特殊字符被转义,不会破坏富文本", () => {
      const draft = parseRouteDocument("品牌\n线路 1 天 0 晚\nD1 甲地\n含 <script> 与 & 符号\n")
      expect(draft.itinerary[0]?.bodyHtml).toContain("&lt;script&gt;")
      expect(draft.itinerary[0]?.bodyHtml).not.toContain("<script>")
    })
  })

  describe("线路名", () => {
    it("卖点串不当标题,哪怕天数写在那一行上", () => {
      // 真实的 Word 资料就长这样:标题在首行,而「8天7晚」写在次行的卖点
      // 串上。原先按「带天数的那行是标题」来取,产品名就成了一长串菜名。
      const draft = parseRouteDocument(
        [
          "【伊犁奇遇】夏日风光8日游",
          "S101+沙湾大盘鸡+独山子大峡谷+赛里木湖+帆船体验+湖边火锅+独库公路 8天7晚",
          "第一天：出发地-乌鲁木齐　住：乌鲁木齐",
        ].join("\n"),
      )

      expect(draft.title).toBe("【伊犁奇遇】夏日风光8日游")
      // 天数仍要从卖点行上取到——两件事解耦,不是二选一。
      expect(draft.days).toBe(8)
      expect(draft.nights).toBe(7)
    })

    it("短的首行仍认作品牌,标题取下一行", () => {
      const draft = parseRouteDocument(
        ["湖燃之间", "---新疆南疆胡杨★12 天 11 晚★---", "D1 全国各地✈乌鲁木齐"].join("\n"),
      )

      expect(draft.brand).toBe("湖燃之间")
      expect(draft.title).toBe("新疆南疆胡杨")
    })

    it("带括号的首行是标题而不是品牌", () => {
      const draft = parseRouteDocument(
        [
          "【多巴胺南疆-一眼千年8天7晚】",
          "中国西极石碑+斯姆哈纳村+贝壳山+白沙湖",
          "第一天：喀什",
        ].join("\n"),
      )

      expect(draft.brand).toBeNull()
      expect(draft.title).toContain("多巴胺南疆")
    })

    it("抠掉天数后不留下悬空的连接号", () => {
      const draft = parseRouteDocument(
        ["寻穿北境", "-冬季北疆喀纳斯禾木-6 天 5 晚-夜雪探寻-", "D1 全国各地✈阿勒泰"].join("\n"),
      )

      expect(draft.title).toBe("冬季北疆喀纳斯禾木-夜雪探寻")
    })

    it("标签单独成行时也能取到", () => {
      const draft = parseRouteDocument(
        ["湖燃之间", "---新疆南疆胡杨★12 天 11 晚★---", "#私家出行#乌起喀止", "D1 甲地"].join("\n"),
      )

      expect(draft.tags).toEqual(expect.arrayContaining(["私家出行", "乌起喀止"]))
    })
  })
})

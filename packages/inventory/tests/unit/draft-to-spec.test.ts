/// <reference types="node" />

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { validateProductGraph } from "../../src/authoring/validate.js"
import { draftToProductGraphSpec } from "../../src/import/draft-to-spec.js"
import { parseRouteDocument } from "../../src/import/parse-route-document.js"

const FIXTURES = join(import.meta.dirname, "../fixtures/route-documents")
const read = (name: string) => readFileSync(join(FIXTURES, name), "utf8")

const OPTIONS = { sellCurrency: "CNY", timezone: "Asia/Shanghai" }

describe("draftToProductGraphSpec", () => {
  const draft = parseRouteDocument(read("south-xinjiang-12d.txt"))
  const spec = draftToProductGraphSpec(draft, OPTIONS)

  it("产出的规格能通过 composeProduct 的校验", () => {
    // 校验不过就意味着助手会在最后一步失败,必须在这里挡住。
    expect(validateProductGraph(spec)).toEqual([])
  })

  it("一律建成草稿且不公开", () => {
    // 助手不允许直接上架,发布要人在产品页另行确认。
    expect(spec.product.status).toBe("draft")
    expect(spec.product.visibility).toBe("private")
  })

  it("不从文档里猜售价", () => {
    // 文档里的价格写法千变万化,猜错就是赔钱,留空由人工填。
    expect(spec.product.sellAmountCents).toBeNull()
    expect(spec.product.sellCurrency).toBe("CNY")
  })

  it("建出成人与儿童单元,且带上编码与年龄区间", () => {
    const units = spec.options[0]?.units ?? []
    const adult = units.find((unit) => unit.code === "adult")
    const child = units.find((unit) => unit.code === "child")

    // 出行人分档按编码与年龄匹配到单元;缺了这些,儿童会被按成人计价。
    expect(adult?.minAge).toBe(12)
    expect(child?.minAge).toBe(2)
    expect(child?.maxAge).toBe(11)
  })

  it("不建任何价格规则,避免带着 0 元价格被误发布", () => {
    // 没有价格的产品卖不出去,总好过 0 元卖出去。定价由人工填。
    expect(spec.options[0]?.priceRules).toEqual([])
  })

  it("多日线路用 itinerary 预订模式", () => {
    // date 是单日游模式,多日线路用它会被校验拒绝。
    expect(spec.product.bookingMode).toBe("itinerary")
  })

  it("费用包含、不含、须知落到对应字段", () => {
    expect(spec.product.inclusionsHtml).toContain("<li>")
    expect(spec.product.exclusionsHtml).toContain("<li>")
  })

  it("每日餐宿落成结构化服务,而不是留在正文里", () => {
    const day1 = spec.itineraries[0]?.days[0]
    const meals = day1?.services.filter((service) => service.serviceType === "meal")
    const stay = day1?.services.find((service) => service.serviceType === "accommodation")

    expect(meals?.length).toBeGreaterThan(0)
    expect(meals?.[0]?.notes).toBe("自理")
    // 宣传册的总览表要按列取用,正文里的一句「早餐：酒店内」取不出来。
    expect(stay?.notes).toContain("乌鲁木齐")
  })

  it("每日落脚城市与线路示意图同源,供总览表使用", () => {
    expect(spec.itineraries[0]?.days[0]?.location).toBe("乌鲁木齐")
  })

  it("Word 类资料的落脚城市取住宿,而不是当天最后一个活动", () => {
    // 日行标题在 Word 类资料里列的是当天活动,末站会取到「塔吉克家访」
    // 这种体验项目——印到总览表的「住宿」一栏上就是错的。
    const wordSpec = draftToProductGraphSpec(
      parseRouteDocument(read("south-xinjiang-8d-word.txt")),
      OPTIONS,
    )
    const locations = wordSpec.itineraries[0]?.days.map((day) => day.location)

    expect(locations).toEqual(["喀什", "喀什", "塔县"])
  })

  it("里程与车程写进正文前言,不丢失", () => {
    const day2 = spec.itineraries[0]?.days[1]
    expect(day2?.description).toContain("45 公里")
    expect(day2?.description).toContain("车程约 2 小时")
  })

  it("景点词条留在正文里,不再在末尾重排一遍", () => {
    // `pois` 与 `bodyHtml` 出自同一段原文,追加等于把每条带说明的景点原样
    // 印第二遍。宣传册上是整页整页的重复,一眼可见。
    const joined = spec.itineraries[0]?.days.map((day) => day.description).join("") ?? ""

    expect(joined).toContain("【乌鲁木齐】")
    expect(joined.match(/【乌鲁木齐】/g)?.length).toBe(1)
  })

  it("简介写上天数与起止,宣传册封面直接可用", () => {
    expect(spec.product.description).toContain("12 天 11 晚")
    expect(spec.product.description).toContain("进")
  })

  it("标签带到产品上", () => {
    expect(spec.product.tags).toEqual(expect.arrayContaining(["私家出行"]))
  })

  it("Word 类资料同样产出合法规格", () => {
    const wordDraft = parseRouteDocument(read("ili-8d-word.txt"))
    const wordSpec = draftToProductGraphSpec(wordDraft, OPTIONS)

    expect(validateProductGraph(wordSpec)).toEqual([])
    expect(wordSpec.itineraries[0]?.days.length).toBeGreaterThanOrEqual(3)
    expect(wordSpec.product.name).toBeTruthy()
  })

  it("没有行程时不产出空行程表", () => {
    const empty = parseRouteDocument("某社\n线路 3 天 2 晚\n正文")
    const emptySpec = draftToProductGraphSpec(empty, OPTIONS)

    expect(emptySpec.itineraries).toEqual([])
    expect(validateProductGraph(emptySpec)).toEqual([])
  })

  it("线路名缺失时给出兜底名称,不产出空名产品", () => {
    const spec2 = draftToProductGraphSpec(
      { ...parseRouteDocument("D1 甲地-乙地\n"), title: "", brand: null },
      OPTIONS,
    )
    expect(spec2.product.name.length).toBeGreaterThan(0)
  })
})

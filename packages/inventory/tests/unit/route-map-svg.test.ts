/// <reference types="node" />

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseRouteDocument } from "../../src/import/parse-route-document.js"
import { buildRouteMapNodes, renderRouteMapSvg } from "../../src/import/route-map-svg.js"

const FIXTURES = join(import.meta.dirname, "../fixtures/route-documents")
const read = (name: string) => readFileSync(join(FIXTURES, name), "utf8")

/**
 * 只有落脚城市、没有其他噪声的最小草稿,便于精确断言。
 *
 * 落脚城市写在住宿字段上,而不是只往途经点里塞一个城市——途经点的语义是
 * 「当天走过哪些地方」,一天一个城市推不出过夜地。
 */
function draftOf(chain: Array<string | { city: string; km?: number; minutes?: number }>) {
  return {
    ...parseRouteDocument(""),
    title: "测试线路",
    days: chain.length,
    nights: chain.length - 1,
    itinerary: chain.map((entry, index) => {
      const item = typeof entry === "string" ? { city: entry } : entry
      return {
        dayNumber: index + 1,
        title: "",
        routeChain: [item.city],
        distanceKm: item.km ?? null,
        driveMinutes: item.minutes ?? null,
        meals: {},
        accommodation: item.city,
        bodyHtml: "",
        pois: [],
      }
    }),
  }
}

describe("线路概览图", () => {
  describe("城市链", () => {
    it("按每日落脚城市取点", () => {
      const nodes = buildRouteMapNodes(draftOf(["乌鲁木齐", "库尔勒", "喀什"]))
      expect(nodes.map((node) => node.label)).toEqual(["乌鲁木齐", "库尔勒", "喀什"])
    })

    it("连住的城市并成一个节点,只在日次上体现", () => {
      // 连住两晚画两个一样的框,是概览图上最常见的噪声。
      const nodes = buildRouteMapNodes(draftOf(["乌鲁木齐", "喀什", "喀什", "和田"]))

      expect(nodes.map((node) => node.label)).toEqual(["乌鲁木齐", "喀什", "和田"])
      expect(nodes[1]?.dayNumbers).toEqual([2, 3])
    })

    it("同名城市不相邻时不合并", () => {
      // 去了又回来是真实行程,必须画成两个点,否则线路走向就错了。
      const nodes = buildRouteMapNodes(draftOf(["库尔勒", "喀什", "库尔勒"]))
      expect(nodes.map((node) => node.label)).toEqual(["库尔勒", "喀什", "库尔勒"])
    })

    it("推不出落脚点的日子跳过,不产生空节点", () => {
      const draft = draftOf(["乌鲁木齐", "库尔勒"])
      draft.itinerary[1].routeChain = []
      draft.itinerary[1].accommodation = null
      expect(buildRouteMapNodes(draft).map((node) => node.label)).toEqual(["乌鲁木齐"])
    })
  })

  describe("渲染", () => {
    it("节点不足两个时不出图", () => {
      // 单点画不出线路,与其挂一张没有信息量的图,不如不挂。
      expect(renderRouteMapSvg(draftOf(["乌鲁木齐"]))).toBeNull()
      expect(renderRouteMapSvg(draftOf([]))).toBeNull()
    })

    it("产出结构完整、可独立解析的 SVG", () => {
      const svg = renderRouteMapSvg(draftOf(["乌鲁木齐", "库尔勒"])) as string

      expect(svg.startsWith("<svg")).toBe(true)
      expect(svg.endsWith("</svg>")).toBe(true)
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain("viewBox=")
    })

    it("城市名与日次都画上", () => {
      const svg = renderRouteMapSvg(draftOf(["乌鲁木齐", "喀什", "喀什"])) as string

      expect(svg).toContain("乌鲁木齐")
      expect(svg).toContain("喀什")
      expect(svg).toContain("D1")
      // 连住折成区间,而不是画两个 D2、D3。
      expect(svg).toContain("D2-D3")
    })

    it("里程与车程标在入边上", () => {
      const svg = renderRouteMapSvg(
        draftOf(["乌鲁木齐", { city: "库尔勒", km: 245, minutes: 210 }]),
      ) as string

      expect(svg).toContain("约 245 公里")
      expect(svg).toContain("车程约 3.5 小时")
    })

    it("没有里程数据时不留空标签", () => {
      const svg = renderRouteMapSvg(draftOf(["乌鲁木齐", "库尔勒"])) as string
      expect(svg).not.toContain("公里")
    })

    it("标注起止两端", () => {
      const svg = renderRouteMapSvg(draftOf(["乌鲁木齐", "库尔勒", "喀什"])) as string
      expect(svg).toContain(">起<")
      expect(svg).toContain(">终<")
    })

    it("合计全程里程", () => {
      const svg = renderRouteMapSvg(
        draftOf(["乌鲁木齐", { city: "库尔勒", km: 245 }, { city: "喀什", km: 500 }]),
      ) as string
      expect(svg).toContain("全程约 745 公里")
    })

    it("长线路蛇形折行,不无限加宽", () => {
      const many = Array.from({ length: 12 }, (_, index) => `城市${index + 1}`)
      const svg = renderRouteMapSvg(draftOf(many)) as string

      const width = Number(/width="(\d+)"/.exec(svg)?.[1])
      const height = Number(/height="(\d+)"/.exec(svg)?.[1])
      // 12 个点若排成一行会宽到没法看;折行后高度必须随之增加。
      expect(width).toBeLessThan(1200)
      expect(height).toBeGreaterThan(300)
    })
  })

  describe("注入防护", () => {
    it("城市名里的尖括号被转义,不产生额外元素", () => {
      // 城市名来自上传的文档,等同于外部输入。
      const draft = draftOf(["乌鲁木齐", "库尔勒"])
      draft.itinerary[1].routeChain = ["<script>alert(1)</script>"]
      draft.itinerary[1].accommodation = null

      const svg = renderRouteMapSvg(draft) as string
      expect(svg).not.toContain("<script>")
      expect(svg).toContain("&lt;script&gt;")
    })

    it("标题里的引号被转义,不撑破属性值", () => {
      const draft = draftOf(["乌鲁木齐", "库尔勒"])
      draft.title = '南疆" onload="alert(1)'

      const svg = renderRouteMapSvg(draft) as string
      // aria-label 是属性,未转义的引号会在这里逃逸出去。
      expect(svg).not.toContain('" onload="')
      expect(svg).toContain("&quot;")
    })
  })

  describe("真实资料", () => {
    it("南疆 12 日画得出连贯的城市链", () => {
      const draft = parseRouteDocument(read("south-xinjiang-12d.txt"))
      const nodes = buildRouteMapNodes(draft)

      expect(nodes.map((node) => node.label)).toEqual(["乌鲁木齐", "库尔勒"])
      // 折叠后节点数不应超过天数,否则说明把途经点也画进来了。
      expect(nodes.length).toBeLessThanOrEqual(draft.itinerary.length)
      expect(renderRouteMapSvg(draft)).toContain("乌鲁木齐")
    })

    /**
     * 逐份钉住城市链。这几条曾经画出「赛里木湖落日小火锅」「塔吉克家访」
     * 这种活动名——日行标题在 Word 类资料里列的是当天活动,不是路线城市。
     */
    it.each([
      ["south-xinjiang-12d.txt", ["乌鲁木齐", "库尔勒"]],
      ["north-xinjiang-6d.txt", ["阿勒泰", "禾木"]],
      ["ili-7d.txt", ["伊宁", "温泉县"]],
      ["ili-8d-word.txt", ["乌鲁木齐", "奎屯", "赛里木湖"]],
      ["south-xinjiang-8d-word.txt", ["喀什", "塔县"]],
    ])("%s 的城市链全是地名", (file, expected) => {
      const draft = parseRouteDocument(read(file as string))
      const nodes = buildRouteMapNodes(draft)

      expect(nodes.map((node) => node.label)).toEqual(expected)
      expect(renderRouteMapSvg(draft)).toContain("<svg")
    })

    it("南疆 8 日的连住两晚折成一个节点", () => {
      const nodes = buildRouteMapNodes(parseRouteDocument(read("south-xinjiang-8d-word.txt")))
      expect(nodes[0]).toMatchObject({ label: "喀什", dayNumbers: [1, 2] })
    })
  })
})

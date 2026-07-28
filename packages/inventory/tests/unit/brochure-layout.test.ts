import { describe, expect, it } from "vitest"

import { inlineBrochureImages } from "../../src/tasks/brochure-images.js"
import {
  BROCHURE_LABELS_EN,
  BROCHURE_LABELS_ZH,
  resolveBrochureLabels,
} from "../../src/tasks/brochure-labels.js"
import { createDefaultProductBrochureTemplate } from "../../src/tasks/brochure-templates.js"
import { renderThemedBrochureHtml } from "../../src/tasks/brochure-themed.js"

function media(overrides: Record<string, unknown> = {}) {
  return {
    id: "med_1",
    productId: "prod_1",
    dayId: null,
    mediaType: "image",
    name: "图",
    url: "/v1/admin/media/uploads/a",
    storageKey: "uploads/a",
    mimeType: "image/jpeg",
    fileSize: 10,
    altText: null,
    sortOrder: 0,
    isCover: false,
    isBrochure: false,
    isBrochureCurrent: false,
    brochureVersion: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  }
}

function day(overrides: Record<string, unknown> = {}) {
  return {
    id: "day_1",
    itineraryId: "itin_1",
    dayNumber: 1,
    title: "乌鲁木齐-库尔勒",
    description: null,
    location: "库尔勒",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    services: [],
    ...overrides,
  }
}

function service(overrides: Record<string, unknown> = {}) {
  return {
    id: "svc_1",
    dayId: "day_1",
    supplierServiceId: null,
    serviceType: "meal",
    name: "早餐",
    description: null,
    countryCode: null,
    costCurrency: "CNY",
    costAmountCents: 0,
    quantity: 1,
    sortOrder: 0,
    notes: null,
    createdAt: new Date(0),
    ...overrides,
  }
}

function context(overrides: Record<string, unknown> = {}) {
  return {
    product: {
      id: "prod_1",
      name: "新疆南疆胡杨",
      description: "<p>12 天 11 晚</p>",
      inclusionsHtml: "<p>含全程用车</p>",
      exclusionsHtml: "<p>不含大交通</p>",
      termsHtml: "<p>请携带身份证</p>",
      defaultLanguageTag: "zh-CN",
      sellCurrency: "CNY",
      sellAmountCents: null,
      startDate: null,
      endDate: null,
      pax: null,
    },
    days: [],
    media: [],
    pricingTiers: [],
    generatedAt: new Date("2026-07-27T00:00:00Z"),
    ...overrides,
    // agent-quality: unsafe-cast reviewed -- owner: inventory; 夹具刻意只铺渲染器
    // 读得到的字段。补齐 ProductBrochureTemplateContext 的全部列意味着每加一列
    // 都要改这里,而这组用例断言的是版面,不是表结构。
    // biome-ignore lint/suspicious/noExplicitAny: reason -- 见上方说明
  } as any
}

const template = {
  title: "新疆南疆胡杨",
  filename: "route.pdf",
  body: "# 新疆南疆胡杨\n\n正文",
  bodyFormat: "markdown" as const,
  variables: {},
  metadataLines: [],
}

describe("宣传册文案语言", () => {
  it("按产品语言取词典,地区子标签不影响判定", () => {
    expect(resolveBrochureLabels("zh-CN")).toBe(BROCHURE_LABELS_ZH)
    expect(resolveBrochureLabels("zh")).toBe(BROCHURE_LABELS_ZH)
    expect(resolveBrochureLabels("zh-Hant-TW")).toBe(BROCHURE_LABELS_ZH)
    expect(resolveBrochureLabels("en-GB")).toBe(BROCHURE_LABELS_EN)
    expect(resolveBrochureLabels(null)).toBe(BROCHURE_LABELS_EN)
  })

  it("中文线路的册子不出现英文栏目名", () => {
    // 线上那份册子印着 Travelers / Total / Generated,客人拿到的就是这个。
    const html = renderThemedBrochureHtml(template, context())

    expect(html).toContain("费用包含")
    expect(html).toContain("费用不含")
    expect(html).toContain("预订须知")
    expect(html).not.toContain("Travelers")
    expect(html).not.toContain("Inclusions")
  })
})

describe("宣传册版面", () => {
  it("标题只出现一次:简介取产品简介,不把模板正文整段塞进来", () => {
    const html = renderThemedBrochureHtml(template, context())

    expect(html.match(/新疆南疆胡杨/g)?.length).toBe(2) // <title> 与封面 <h1>
    expect(html).not.toContain("<h1>新疆南疆胡杨</h1><h1>")
  })

  it("不印内部主键与生成时间", () => {
    const html = renderThemedBrochureHtml(template, context())

    expect(html).not.toContain("prod_1")
    expect(html).not.toContain("Generated")
  })

  it("每日正文按富文本渲染,而不是把标签当字面量印出来", () => {
    const html = renderThemedBrochureHtml(
      template,
      context({ days: [day({ description: "<p><strong>约 300 公里</strong></p>" })] }),
    )

    expect(html).toContain("<strong>约 300 公里</strong>")
    expect(html).not.toContain("&lt;strong&gt;")
  })

  it("住宿写的就是城市时不再单列一栏,免得与住宿地逐行重复", () => {
    const sameAsCity = context({
      days: [
        day({
          services: [service({ serviceType: "accommodation", name: "住宿", notes: "库尔勒" })],
        }),
      ],
    })
    const realHotel = context({
      days: [
        day({
          services: [
            service({ serviceType: "accommodation", name: "住宿", notes: "库尔勒锦江都城酒店" }),
          ],
        }),
      ],
    })

    expect(renderThemedBrochureHtml(template, sameAsCity)).not.toContain("<th>住宿</th>")
    expect(renderThemedBrochureHtml(template, realHotel)).toContain("<th>住宿</th>")
  })

  it("整条线路都没有用车数据时不留一竖行破折号", () => {
    const html = renderThemedBrochureHtml(template, context({ days: [day()] }))
    expect(html).not.toContain("<th>用车</th>")

    const withTransfer = renderThemedBrochureHtml(
      template,
      context({
        days: [
          day({
            services: [service({ serviceType: "transfer", name: "用车", notes: "空调旅游车" })],
          }),
        ],
      }),
    )
    expect(withTransfer).toContain("<th>用车</th>")
  })

  it("落脚城市不足两个就不画线路图", () => {
    const single = renderThemedBrochureHtml(template, context({ days: [day()] }))
    expect(single).not.toContain("线路概览")

    const chain = renderThemedBrochureHtml(
      template,
      context({
        days: [day(), day({ id: "day_2", dayNumber: 2, location: "库车" })],
      }),
    )
    expect(chain).toContain("线路概览")
    expect(chain).toContain("<svg")
  })

  it("配图用内联的 data: 而不是要鉴权的站内地址", () => {
    const html = renderThemedBrochureHtml(
      template,
      context({ days: [day()], media: [media({ dayId: "day_1" })] }),
      { imageSources: new Map([["med_1", "data:image/jpeg;base64,AAAA"]]) },
    )

    expect(html).toContain("data:image/jpeg;base64,AAAA")
    expect(html).not.toContain("/v1/admin/media/uploads/a")
  })

  it("已挂到某天的图不再重复进画廊", () => {
    const html = renderThemedBrochureHtml(
      template,
      context({ days: [day()], media: [media({ dayId: "day_1" })] }),
      { imageSources: new Map([["med_1", "data:image/jpeg;base64,AAAA"]]) },
    )

    expect(html).not.toContain("线路掠影")
  })
})

describe("配图内联", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0])
  const store = (bytes: Uint8Array) => ({
    get: async () => bytes.buffer.slice(0) as ArrayBuffer,
  })

  it("按魔数认类型,存储里没记 MIME 也能内联", async () => {
    const sources = await inlineBrochureImages([media({ mimeType: null })], store(jpeg))
    expect(sources.get("med_1")).toMatch(/^data:image\/jpeg;base64,/)
  })

  it("预算耗尽后不再内联,而不是撑爆册子大小上限", async () => {
    const big = new Uint8Array(1024)
    big.set([0xff, 0xd8, 0xff])
    const items = [
      media({ id: "a", isCover: true, storageKey: "uploads/a" }),
      media({ id: "b", dayId: "day_1", storageKey: "uploads/b" }),
      media({ id: "c", storageKey: "uploads/c" }),
    ]

    const sources = await inlineBrochureImages(items, store(big), { budgetBytes: 2048 })

    // 封面与每日配图优先,画廊那张让位。
    expect([...sources.keys()]).toEqual(["a", "b"])
  })

  it("单张图读不出来只少这一张,其余照常", async () => {
    const failing = {
      get: async (key: string) => {
        if (key === "uploads/a") throw new Error("gone")
        return jpeg.buffer.slice(0) as ArrayBuffer
      },
    }
    const items = [
      media({ id: "a", storageKey: "uploads/a" }),
      media({ id: "b", storageKey: "uploads/b" }),
    ]

    const sources = await inlineBrochureImages(items, failing)
    expect([...sources.keys()]).toEqual(["b"])
  })

  it("不内联宣传册自身与非图片媒体", async () => {
    const items = [media({ id: "a", isBrochure: true }), media({ id: "b", mediaType: "document" })]

    expect((await inlineBrochureImages(items, store(jpeg))).size).toBe(0)
  })
})

describe("纯文本兜底正文", () => {
  it("没有浏览器时也带上费用与须知,并按产品语言排版", async () => {
    const template = createDefaultProductBrochureTemplate()
    const ctx = context({ days: [day({ services: [service()] })] })
    const body = await (template.body as (c: unknown) => Promise<string> | string)(ctx)

    expect(body).toContain("## 费用包含")
    expect(body).toContain("## 费用不含")
    expect(body).toContain("## 预订须知")
    expect(body).toContain("第 1 天")
    expect(body).not.toContain("Travelers")
  })

  it("不再往正文塞内部主键与生成时间", async () => {
    const template = createDefaultProductBrochureTemplate()
    const lines = await (template.metadataLines as (c: unknown) => string[])(context())

    expect(lines).toEqual([])
  })
})

describe("本机浏览器探测", () => {
  it("可执行文件不在就返回 null,而不是抛错", async () => {
    // 服务器没装浏览器是运维状态,不该让运营点「生成宣传册」时看到 500;
    // 调用方据此回落到内置的纯文本打印器。
    const { resolveLocalChromiumPrinter } = await import("../../src/tasks/brochure-chromium.js")

    expect(
      await resolveLocalChromiumPrinter({ BROCHURE_CHROMIUM_PATH: "/nonexistent/chrome" }),
    ).toBeNull()
  })

  it("文件在但启不起来也返回 null,不留到生成时才 500", async () => {
    // 只看「文件在不在」不够:缺 libnss3 之类的系统库时,二进制在、一启动
    // 就炸。线上正是这个形态——部署装浏览器时 --with-deps 要 sudo,非交互
    // SSH 下装不了。这里用一个存在但不是浏览器的可执行文件复现。
    const { resolveLocalChromiumPrinter } = await import("../../src/tasks/brochure-chromium.js")

    expect(await resolveLocalChromiumPrinter({ BROCHURE_CHROMIUM_PATH: "/bin/true" })).toBeNull()
  })
})

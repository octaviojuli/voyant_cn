/// <reference types="node" />

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cleanupTestDb, createTestDb } from "@voyant-travel/db/test-utils"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { importDraftService } from "../../src/import/service.js"
import { productDays, productItineraries, productMedia, products } from "../../src/schema.js"

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL
const FIXTURES = join(import.meta.dirname, "../fixtures/route-documents")
const docxBytes = () => new Uint8Array(readFileSync(join(FIXTURES, "minimal.docx")))

const COMMIT_OPTIONS = { sellCurrency: "CNY", timezone: "Asia/Shanghai" }

/** 假存储:只回键,不真写盘。故意返回空 url,顺带验证兜底路径。 */
const uploadImage = async (image: { index: number }) => ({
  key: `uploads/route-documents/images/test-${image.index}`,
  url: "",
})

describe.skipIf(!DB_AVAILABLE)("线路上线助理:草稿到上线", () => {
  const db = createTestDb()

  beforeEach(async () => {
    // cleanupTestDb 会清空全部表;compose 会连带写入选项、单元等多张表,
    // 逐表点名反而容易漏,留下的外键引用会把下一次清理卡死。
    await cleanupTestDb(db)
  })

  it("上传 Word 文件后落成待复核草稿", async () => {
    const { row, extracted } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })

    expect(row?.status).toBe("pending_review")
    expect(row?.sourceFormat).toBe("docx")
    expect(row?.sourceFilename).toBe("测试线路.docx")
    // 内嵌图片要一并取出,供后续挂到产品上。
    expect(extracted.images.length).toBeGreaterThan(0)

    const draft = row?.draft as { days?: number; itinerary?: unknown[] }
    expect(draft.days).toBe(3)
    expect(draft.itinerary?.length).toBe(1)
  })

  it("首次解析结果单独留存,复核改动不覆盖它", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })
    const id = row?.id as string

    const edited = { ...(row?.draft as Record<string, unknown>), title: "人工改过的线路名" }
    await importDraftService.updateDraft(db, id, edited as never)

    const after = await importDraftService.get(db, id)
    expect((after?.draft as { title: string }).title).toBe("人工改过的线路名")
    // 留着原始解析结果,才能回答「哪些字段是人改过的」。
    expect((after?.parsedDraft as { title: string }).title).not.toBe("人工改过的线路名")
    expect(after?.status).toBe("in_review")
  })

  it("确认后建出产品,并带上行程与费用条款", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })
    const outcome = await importDraftService.commit(db, row?.id as string, COMMIT_OPTIONS)

    expect(outcome.status).toBe("created")
    const productId = (outcome as { productId: string }).productId

    const [product] = await db.select().from(products).where(eq(products.id, productId))
    expect(product?.status).toBe("draft")
    expect(product?.inclusionsHtml).toContain("<li>")
    expect(product?.exclusionsHtml).toContain("<li>")
    // 助手绝不直接上架,发布要人在产品页另行确认。
    expect(product?.visibility).toBe("private")
    // 价格必须留空,由人工填。
    expect(product?.sellAmountCents).toBeNull()

    const days = await db
      .select()
      .from(productDays)
      .innerJoin(productItineraries, eq(productDays.itineraryId, productItineraries.id))
      .where(eq(productItineraries.productId, productId))
    expect(days.length).toBe(1)
  })

  it("确认后草稿标记为已提交并记下产品", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })
    const id = row?.id as string
    const outcome = await importDraftService.commit(db, id, COMMIT_OPTIONS)

    const after = await importDraftService.get(db, id)
    expect(after?.status).toBe("committed")
    expect(after?.productId).toBe((outcome as { productId: string }).productId)
    expect(after?.committedAt).toBeTruthy()
  })

  it("重复确认不会建出第二个产品", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })
    const id = row?.id as string

    const first = await importDraftService.commit(db, id, COMMIT_OPTIONS)
    const second = await importDraftService.commit(db, id, COMMIT_OPTIONS)

    expect(second.status).toBe("already_committed")
    expect((second as { productId: string }).productId).toBe(
      (first as { productId: string }).productId,
    )

    const all = await db.select().from(products)
    expect(all).toHaveLength(1)
  })

  it("已确认的草稿不再接受修改", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })
    const id = row?.id as string
    await importDraftService.commit(db, id, COMMIT_OPTIONS)

    const edited = { ...(row?.draft as Record<string, unknown>), title: "改不动" }
    await importDraftService.updateDraft(db, id, edited as never)

    const after = await importDraftService.get(db, id)
    expect((after?.draft as { title: string }).title).not.toBe("改不动")
    expect(after?.status).toBe("committed")
  })

  it("放弃的草稿不建产品", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })
    await importDraftService.discard(db, row?.id as string, "供应商撤回")

    const after = await importDraftService.get(db, row?.id as string)
    expect(after?.status).toBe("discarded")
    expect(after?.note).toBe("供应商撤回")
    expect(await db.select().from(products)).toHaveLength(0)
  })

  it("内嵌图片上传时即落库,并记下归属的日次", async () => {
    // 图片字节只存在于上传那一刻的请求里,草稿落库后就没有了,不能等到确认。
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
      uploadImage,
    })

    const images = (row?.images ?? []) as { storageKey: string; dayNumber: number | null }[]
    expect(images.length).toBeGreaterThan(0)
    expect(images[0]?.storageKey).toContain("uploads/route-documents/images/")
  })

  it("未配置存储时跳过配图,不影响解析", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
    })

    expect(row?.images).toEqual([])
    expect((row?.draft as { itinerary?: unknown[] }).itinerary?.length).toBe(1)
  })

  it("确认后配图挂到产品上,并留出产品级封面", async () => {
    const { row } = await importDraftService.createFromDocument(db, {
      bytes: docxBytes(),
      filename: "测试线路.docx",
      uploadImage,
    })
    const outcome = await importDraftService.commit(db, row?.id as string, COMMIT_OPTIONS)
    const productId = (outcome as { productId: string }).productId

    const media = await db.select().from(productMedia).where(eq(productMedia.productId, productId))
    expect(media.length).toBeGreaterThan(0)

    // 全部图片都归了某一天时产品级一张也没有,产品列表里就是一块空白。
    const productLevelCover = media.filter((item) => item.dayId === null && item.isCover)
    expect(productLevelCover).toHaveLength(1)

    // 存储没给出可访问地址时退回媒体服务路径——url 是非空列,不能留空。
    expect(productLevelCover[0]?.url).toContain("/v1/admin/media/")
  })

  it("不存在的草稿返回未找到,而不是抛错", async () => {
    const outcome = await importDraftService.commit(db, "pimp_00000000000000000000000000", {
      sellCurrency: "CNY",
    })
    expect(outcome.status).toBe("not_found")
  })
})

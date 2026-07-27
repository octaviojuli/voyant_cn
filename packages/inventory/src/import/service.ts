import { desc, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { composeProduct } from "../authoring/service.js"
import { productImportDrafts } from "../schema-import.js"
import { productDays, productItineraries, productMedia } from "../schema-itinerary.js"
import { assignDayImages } from "./assign-day-images.js"
import {
  type DraftImage,
  draftImageSchema,
  type RouteImportDraft,
  routeImportDraftSchema,
} from "./draft.js"
import { type DraftToSpecOptions, draftToProductGraphSpec } from "./draft-to-spec.js"
import { extractRouteDocument } from "./extract-document.js"
import { parseRouteDocument } from "./parse-route-document.js"

/**
 * 线路上线助理的草稿服务。
 *
 * 流程是三段式:上传解析出草稿 → 人工复核修改 → 确认后建产品。中间那一步
 * 不能省:价格、天数、费用包含错了是要赔钱的。
 */

export interface CreateDraftInput {
  bytes: Uint8Array
  filename: string
  /** 原始文件在对象存储里的键,便于复核时回看原文。 */
  sourceStorageKey?: string | null
  /**
   * 把一张内嵌图片存进对象存储,返回键与可访问地址。
   *
   * 由路由注入而不是在这里直接依赖存储:服务层不该知道存储是怎么配的。
   * 未提供则跳过配图,不影响解析。
   */
  uploadImage?: (image: {
    index: number
    bytes: Uint8Array
    contentType: string
  }) => Promise<{ key: string; url: string }>
}

export interface CommitDraftOptions extends DraftToSpecOptions {
  /** 幂等键,重复确认不会建出两个产品。 */
  idempotencyKey?: string
}

export type CommitDraftOutcome =
  | { status: "created"; productId: string; attachedImages?: number }
  | { status: "invalid"; issues: unknown[] }
  | { status: "already_committed"; productId: string }
  | { status: "not_found" }

/**
 * 内嵌图片在上传这一刻就存进对象存储。
 *
 * 不能等到确认时再传:图片字节只存在于上传那一刻的请求里,草稿落库后就没有
 * 了。而复核界面本来就要让人看到「第三天配的是哪张照片」才好判断能不能发布。
 *
 * 单张失败只跳过那一张——为一张配图让整份资料解析失败不值当。
 */
async function storeImages(
  extracted: {
    html: string | null
    images: ReadonlyArray<{ index: number; bytes: Uint8Array; contentType: string }>
  },
  uploadImage: CreateDraftInput["uploadImage"],
): Promise<DraftImage[]> {
  if (!uploadImage || extracted.images.length === 0) return []

  const { byDay, cover } = assignDayImages(extracted.html)
  const dayOf = new Map<number, number>()
  for (const [dayNumber, indexes] of byDay) {
    for (const index of indexes) dayOf.set(index, dayNumber)
  }
  const coverSet = new Set(cover)

  const stored: DraftImage[] = []
  for (const image of extracted.images) {
    try {
      const uploaded = await uploadImage(image)
      stored.push({
        index: image.index,
        storageKey: uploaded.key,
        url: uploaded.url,
        contentType: image.contentType,
        byteSize: image.bytes.byteLength,
        dayNumber: coverSet.has(image.index) ? null : (dayOf.get(image.index) ?? null),
      })
    } catch {
      // 存不下就跳过这一张,不影响其余图片与解析结果。
    }
  }
  return stored
}

/**
 * 把草稿里已存好的图挂到产品上。
 *
 * 逐日图按日次找到对应的 `product_days` 行挂上去;封面类的图挂在产品级
 * (`dayId` 为空)。第一张封面图设为产品封面——没有封面的产品在列表里是
 * 一块空白。
 *
 * 返回挂上的张数,供调用方回报。
 */
async function attachDraftImages(
  db: PostgresJsDatabase,
  productId: string,
  images: unknown,
): Promise<number> {
  const parsed = draftImageSchema.array().safeParse(images ?? [])
  if (!parsed.success || parsed.data.length === 0) return 0

  // 日次 → product_days.id。产品刚建好,这一趟必然拿得到。
  const dayRows = await db
    .select({ id: productDays.id, dayNumber: productDays.dayNumber })
    .from(productDays)
    .innerJoin(productItineraries, eq(productDays.itineraryId, productItineraries.id))
    .where(eq(productItineraries.productId, productId))
  const dayIdOf = new Map(dayRows.map((row) => [row.dayNumber, row.id]))

  const usable = parsed.data.filter((image) => image.storageKey.length > 0)
  if (usable.length === 0) return 0

  const toRow = (
    image: (typeof usable)[number],
    dayId: string | null,
    order: number,
    isCover: boolean,
  ) => ({
    productId,
    dayId,
    mediaType: "image" as const,
    name: `文档配图 ${image.index + 1}`,
    // 存储没给出可访问地址时退回媒体服务路径,url 是非空列。
    url: image.url || `/v1/admin/media/${image.storageKey}`,
    storageKey: image.storageKey,
    mimeType: image.contentType,
    fileSize: image.byteSize,
    sortOrder: order,
    isCover,
  })

  const seenDay = new Set<number>()
  const rows = usable.map((image, order) => {
    // 文档里写了日次、产品上却没有那一天,说明解析与建库对不上,
    // 与其挂错位置不如挂在产品级。
    const dayId = image.dayNumber != null ? (dayIdOf.get(image.dayNumber) ?? null) : null
    // 封面是按范围各算各的:每天的第一张是那天的封面,产品级另说。
    let isCover = false
    if (dayId != null && image.dayNumber != null && !seenDay.has(image.dayNumber)) {
      seenDay.add(image.dayNumber)
      isCover = true
    } else if (dayId == null && image.dayNumber == null) {
      isCover = !usable.some((other, i) => other.dayNumber == null && i < order)
    }
    return toRow(image, dayId, order, isCover)
  })

  // 全部图片都归了某一天时,产品级一张也没有,列表里就是一块空白。
  // 拿第一张再建一条产品级的行当封面——引用同一个存储键,不额外占空间。
  const hasProductLevel = rows.some((row) => row.dayId === null)
  if (!hasProductLevel) {
    const first = usable[0]
    if (first) rows.unshift(toRow(first, null, 0, true))
  }

  await db.insert(productMedia).values(rows)
  return rows.length
}

export const importDraftService = {
  /** 解析上传的文件并落成待复核草稿。 */
  async createFromDocument(db: PostgresJsDatabase, input: CreateDraftInput) {
    const extracted = await extractRouteDocument({
      bytes: input.bytes,
      filename: input.filename,
    })
    const draft = parseRouteDocument(extracted.text, { filename: input.filename })
    const images = await storeImages(extracted, input.uploadImage)

    const [row] = await db
      .insert(productImportDrafts)
      .values({
        status: "pending_review",
        sourceFilename: input.filename,
        sourceFormat: extracted.format,
        sourceStorageKey: input.sourceStorageKey ?? null,
        draft,
        // 首次解析结果单独留一份,便于回答「哪些字段是人改过的」。
        parsedDraft: draft,
        warnings: extracted.warnings,
        images,
      })
      .returning()

    return { row, extracted, images }
  },

  async list(db: PostgresJsDatabase, limit = 50) {
    return db
      .select()
      .from(productImportDrafts)
      .orderBy(desc(productImportDrafts.createdAt))
      .limit(limit)
  },

  async get(db: PostgresJsDatabase, id: string) {
    const [row] = await db
      .select()
      .from(productImportDrafts)
      .where(eq(productImportDrafts.id, id))
      .limit(1)
    return row ?? null
  },

  /** 保存复核改动。已确认的草稿不再接受修改。 */
  async updateDraft(db: PostgresJsDatabase, id: string, draft: RouteImportDraft) {
    const existing = await importDraftService.get(db, id)
    if (!existing) return null
    if (existing.status === "committed") return existing

    const [row] = await db
      .update(productImportDrafts)
      .set({
        draft: routeImportDraftSchema.parse(draft),
        status: "in_review",
        updatedAt: new Date(),
      })
      .where(eq(productImportDrafts.id, id))
      .returning()

    return row ?? null
  },

  async discard(db: PostgresJsDatabase, id: string, note?: string) {
    const [row] = await db
      .update(productImportDrafts)
      .set({ status: "discarded", note: note ?? null, updatedAt: new Date() })
      .where(eq(productImportDrafts.id, id))
      .returning()
    return row ?? null
  },

  /**
   * 确认草稿并建出产品。
   *
   * 规格不合法时 composeProduct 会返回问题清单且不写库,这里把问题原样
   * 透出给复核界面,草稿保持可编辑状态。
   */
  async commit(
    db: PostgresJsDatabase,
    id: string,
    options: CommitDraftOptions,
  ): Promise<CommitDraftOutcome> {
    const existing = await importDraftService.get(db, id)
    if (!existing) return { status: "not_found" }

    // 重复确认直接返回已建的产品,不再建第二个。
    if (existing.status === "committed" && existing.productId) {
      return { status: "already_committed", productId: existing.productId }
    }

    const draft = routeImportDraftSchema.parse(existing.draft)
    const spec = draftToProductGraphSpec(draft, options)
    const outcome = await composeProduct(db, spec, {
      ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
    })

    if (outcome.status !== "ok") {
      const issues = outcome.issues
      await db
        .update(productImportDrafts)
        .set({ note: JSON.stringify(issues), updatedAt: new Date() })
        .where(eq(productImportDrafts.id, id))
      return { status: "invalid", issues }
    }

    // 配图挂在产品建成之后。挂不上不回滚产品:产品本身是对的,少几张图
    // 由人在产品页补,总好过因为一张图把整条线路的上线撤销。
    const attached = await attachDraftImages(db, outcome.result.productId, existing.images)

    await db
      .update(productImportDrafts)
      .set({
        status: "committed",
        productId: outcome.result.productId,
        note: null,
        committedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(productImportDrafts.id, id))

    return { status: "created", productId: outcome.result.productId, attachedImages: attached }
  },
}

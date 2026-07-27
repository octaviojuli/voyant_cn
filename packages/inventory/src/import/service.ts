import { desc, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { composeProduct } from "../authoring/service.js"
import { productImportDrafts } from "../schema-import.js"
import { type RouteImportDraft, routeImportDraftSchema } from "./draft.js"
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
}

export interface CommitDraftOptions extends DraftToSpecOptions {
  /** 幂等键,重复确认不会建出两个产品。 */
  idempotencyKey?: string
}

export type CommitDraftOutcome =
  | { status: "created"; productId: string }
  | { status: "invalid"; issues: unknown[] }
  | { status: "already_committed"; productId: string }
  | { status: "not_found" }

export const importDraftService = {
  /** 解析上传的文件并落成待复核草稿。 */
  async createFromDocument(db: PostgresJsDatabase, input: CreateDraftInput) {
    const extracted = await extractRouteDocument({
      bytes: input.bytes,
      filename: input.filename,
    })
    const draft = parseRouteDocument(extracted.text, { filename: input.filename })

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
      })
      .returning()

    return { row, extracted }
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

    return { status: "created", productId: outcome.result.productId }
  },
}

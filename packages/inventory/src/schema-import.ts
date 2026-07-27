import { typeId, typeIdRef } from "@voyant-travel/db/lib/typeid-column"
import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { products } from "./schema-core.js"

/**
 * 线路上线助理的导入草稿。
 *
 * 解析结果先落成草稿,人工复核确认后才建产品。绝不允许「上传即上线」:
 * 价格、天数、费用包含错了是要赔钱的,而 compose_product 本身也标了
 * confirmationRequired。
 *
 * 草稿落库还带来三点好处:解析中断能续;保留原文与解析结果的对照,便于
 * 回溯「这个价格是从哪来的」;换了识别规则可以对同一份文件重新解析。
 */
export const productImportDraftStatusEnum = pgEnum("product_import_draft_status", [
  /** 已解析,等待人工复核。 */
  "pending_review",
  /** 复核中,已有人工改动。 */
  "in_review",
  /** 已确认并建出产品。 */
  "committed",
  /** 放弃。 */
  "discarded",
])

export const productImportDrafts = pgTable(
  "product_import_drafts",
  {
    id: typeId("product_import_drafts"),
    status: productImportDraftStatusEnum("status").notNull().default("pending_review"),

    /** 原始文件名与格式,复核时要让人知道这份草稿来自哪个文件。 */
    sourceFilename: text("source_filename").notNull(),
    sourceFormat: text("source_format").notNull(),
    /** 原始文件在对象存储里的键,便于回看原文。 */
    sourceStorageKey: text("source_storage_key"),

    /**
     * 解析产出的草稿(RouteImportDraft)。人工复核的改动直接改这里,
     * 因此它既是解析结果也是待确认内容。
     */
    draft: jsonb("draft").notNull(),
    /**
     * 首次解析的原始结果,不随复核改动。留着才能回答「哪些字段是人改过的」。
     */
    parsedDraft: jsonb("parsed_draft").notNull(),
    /** 提取阶段的告警,如「PDF 只能取到纯文本」。 */
    warnings: jsonb("warnings"),
    /**
     * 文档内嵌图片,上传时即落到对象存储,这里只留键与归属的日次。
     *
     * 不等到确认时再传:图片字节只存在于上传那一刻的请求里,草稿落库后就
     * 没有了;而复核界面要让人看到「第三天配的是哪张照片」才好判断能不能
     * 发布。形状是 DraftImage[]。
     */
    images: jsonb("images"),

    /** 确认后建出的产品。未确认时为空。 */
    productId: typeIdRef("product_id").references(() => products.id, { onDelete: "set null" }),
    /** 放弃或提交失败的原因,便于运营排查。 */
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    committedAt: timestamp("committed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_product_import_drafts_status").on(table.status, table.createdAt),
    index("idx_product_import_drafts_product").on(table.productId),
  ],
)

export type ProductImportDraftRow = typeof productImportDrafts.$inferSelect
export type NewProductImportDraftRow = typeof productImportDrafts.$inferInsert

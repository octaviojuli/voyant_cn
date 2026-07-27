/**
 * 线路上线助理的路由,归 `@voyant-travel/inventory` 所有。
 *
 *   POST   /import-drafts            — 上传线路文件,解析成待复核草稿
 *   GET    /import-drafts            — 草稿列表
 *   GET    /import-drafts/{id}       — 草稿详情
 *   PATCH  /import-drafts/{id}       — 保存复核改动
 *   POST   /import-drafts/{id}/commit  — 确认并建出产品
 *   POST   /import-drafts/{id}/discard — 放弃
 *
 * 路径是相对的,由部署挂到 `/v1/admin/products` 之下。
 *
 * 上传与确认分成两步是刻意的:价格、天数、费用包含错了是要赔钱的,中间
 * 必须有人过目。确认动作本身也带幂等,重复点击不会建出两个产品。
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import type { Extension } from "@voyant-travel/core"
import { openApiValidationHook, parseJsonBody } from "@voyant-travel/hono"
import type { ApiExtension } from "@voyant-travel/hono/module"
import type { StorageProvider } from "@voyant-travel/storage"
import type { Context } from "hono"

import { routeImportDraftSchema } from "./import/draft.js"
import { UnsupportedRouteDocumentError } from "./import/extract-document.js"
import { renderRouteMapSvg } from "./import/route-map-svg.js"
import { importDraftService } from "./import/service.js"
import type { Env } from "./route-env.js"

/** 线路资料的大小上限。真实资料含内嵌图片,一份 5-6 MB 是常态。 */
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

export interface ImportRoutesOptions {
  /**
   * 原始文件的存放位置。给出时把上传的文件一并存下,复核时可回看原文;
   * 未配置存储则跳过,不影响解析。
   */
  resolveStorage?: (c: Context<Env>) => StorageProvider | null
  /** 默认售价币种,来自助手设置。 */
  defaultSellCurrency?: string
  /** 默认时区。 */
  defaultTimezone?: string | null
}

const draftIdParam = z.object({ id: z.string() })

const draftRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  sourceFilename: z.string(),
  sourceFormat: z.string(),
  sourceStorageKey: z.string().nullable(),
  draft: z.unknown(),
  parsedDraft: z.unknown(),
  warnings: z.unknown().nullable(),
  productId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  committedAt: z.string().nullable(),
})

/**
 * 详情比列表多一张线路概览图(SVG 源码)。
 *
 * 给的是源码而不是图片地址:SVG 在存储层被刻意挡住(可携带脚本,属存储型
 * XSS 面),上传即 415,服务端也不会以 image/svg+xml 返回。界面用
 * `<img src="data:image/svg+xml;base64,…">` 渲染——`<img>` 里的 SVG 按规范
 * 不执行脚本,既不动那道安全控制,又能显示。
 */
const draftDetailSchema = draftRowSchema.extend({
  routeMapSvg: z.string().nullable(),
  images: z.unknown().nullable(),
})

type DraftRowLike = {
  createdAt: Date | string
  updatedAt: Date | string
  committedAt: Date | string | null
  [key: string]: unknown
}

/** 时间统一序列化成 ISO 字符串,接口契约才稳定。 */
function serializeDraftRow(row: DraftRowLike) {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    committedAt: row.committedAt ? new Date(row.committedAt).toISOString() : null,
  } as z.infer<typeof draftRowSchema>
}

/**
 * 详情额外带上线路概览图。
 *
 * 图是**从草稿现算的,不落库**:改了行程图就跟着变,不存在过期版本。代价
 * 是每次详情多算一次,而画一张图只是拼字符串,可以忽略。
 *
 * 列表不带——一张图几 KB,五十行就是几百 KB 的无用负载。
 */
function serializeDraftDetail(row: DraftRowLike) {
  const parsed = routeImportDraftSchema.safeParse(row.draft)
  return {
    ...serializeDraftRow(row),
    // 老草稿的结构可能对不上,画不出就留空,不因为一张图让详情打不开。
    routeMapSvg: parsed.success ? renderRouteMapSvg(parsed.data) : null,
    // 文档内嵌配图,复核时要看到「第三天配的是哪张照片」。
    images: (row.images ?? null) as z.infer<typeof draftDetailSchema>["images"],
  }
}

const errorSchema = z.object({ error: z.string() })

export function createProductImportRoutes(options: ImportRoutesOptions = {}) {
  const hono = new OpenAPIHono<Env>({ defaultHook: openApiValidationHook })

  const createDraftRoute = createRoute({
    method: "post",
    path: "/import-drafts",
    request: {
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: z.object({ file: z.any() }),
          },
        },
      },
    },
    responses: {
      201: {
        description: "解析出的待复核草稿",
        content: { "application/json": { schema: z.object({ data: draftDetailSchema }) } },
      },
      400: { description: "缺少文件", content: { "application/json": { schema: errorSchema } } },
      413: { description: "文件过大", content: { "application/json": { schema: errorSchema } } },
      415: {
        description: "不支持的格式",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  })

  hono.openapi(createDraftRoute, async (c) => {
    const body = await c.req.parseBody()
    const file = body.file
    if (!(file instanceof File)) {
      return c.json({ error: "请选择要上传的线路文件" }, 400)
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return c.json({ error: `文件过大,上限 ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB` }, 413)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    // 原文先存一份,复核时要回看「这个价格是从哪来的」。存不下也不挡解析。
    let storageKey: string | null = null
    const storage = options.resolveStorage?.(c) ?? null
    if (storage) {
      try {
        const uploaded = await storage.upload(bytes, {
          key: `uploads/route-documents/${crypto.randomUUID()}-${file.name}`,
          contentType: file.type || "application/octet-stream",
        })
        storageKey = uploaded.key
      } catch {
        storageKey = null
      }
    }

    try {
      const { row } = await importDraftService.createFromDocument(c.get("db"), {
        bytes,
        filename: file.name,
        sourceStorageKey: storageKey,
        // 配图必须走 uploads/ 前缀:媒体服务路由只放行这几个前缀,
        // 换个前缀存下来的图取不回来。
        ...(storage
          ? {
              uploadImage: async (image) => {
                const uploaded = await storage.upload(image.bytes, {
                  key: `uploads/route-documents/images/${crypto.randomUUID()}`,
                  contentType: image.contentType,
                })
                return { key: uploaded.key, url: uploaded.url }
              },
            }
          : {}),
      })
      return c.json({ data: serializeDraftDetail(row as DraftRowLike) }, 201)
    } catch (error) {
      if (error instanceof UnsupportedRouteDocumentError) {
        return c.json({ error: "只支持 Word(.docx)与 PDF 文件" }, 415)
      }
      throw error
    }
  })

  const listRoute = createRoute({
    method: "get",
    path: "/import-drafts",
    responses: {
      200: {
        description: "草稿列表",
        content: { "application/json": { schema: z.object({ data: z.array(draftRowSchema) }) } },
      },
    },
  })

  hono.openapi(listRoute, async (c) => {
    const rows = await importDraftService.list(c.get("db"))
    return c.json({ data: rows.map((row) => serializeDraftRow(row as DraftRowLike)) }, 200)
  })

  const getRoute = createRoute({
    method: "get",
    path: "/import-drafts/{id}",
    request: { params: draftIdParam },
    responses: {
      200: {
        description: "草稿详情",
        content: { "application/json": { schema: z.object({ data: draftDetailSchema }) } },
      },
      404: { description: "草稿不存在", content: { "application/json": { schema: errorSchema } } },
    },
  })

  hono.openapi(getRoute, async (c) => {
    const row = await importDraftService.get(c.get("db"), c.req.valid("param").id)
    if (!row) return c.json({ error: "草稿不存在" }, 404)
    return c.json({ data: serializeDraftDetail(row as DraftRowLike) }, 200)
  })

  const updateRoute = createRoute({
    method: "patch",
    path: "/import-drafts/{id}",
    request: {
      params: draftIdParam,
      body: {
        required: true,
        content: { "application/json": { schema: z.object({ draft: routeImportDraftSchema }) } },
      },
    },
    responses: {
      200: {
        description: "保存后的草稿",
        content: { "application/json": { schema: z.object({ data: draftDetailSchema }) } },
      },
      404: { description: "草稿不存在", content: { "application/json": { schema: errorSchema } } },
    },
  })

  hono.openapi(updateRoute, async (c) => {
    const body = await parseJsonBody(c, z.object({ draft: routeImportDraftSchema }))
    const row = await importDraftService.updateDraft(
      c.get("db"),
      c.req.valid("param").id,
      body.draft,
    )
    if (!row) return c.json({ error: "草稿不存在" }, 404)
    return c.json({ data: serializeDraftDetail(row as DraftRowLike) }, 200)
  })

  const commitBodySchema = z.object({
    sellCurrency: z.string().min(3).max(3).optional(),
    supplierId: z.string().nullish(),
    productTypeId: z.string().nullish(),
    timezone: z.string().nullish(),
    adultMinAge: z.number().int().positive().optional(),
    childMinAge: z.number().int().nonnegative().optional(),
    idempotencyKey: z.string().optional(),
  })

  const commitRoute = createRoute({
    method: "post",
    path: "/import-drafts/{id}/commit",
    request: {
      params: draftIdParam,
      body: {
        required: false,
        content: { "application/json": { schema: commitBodySchema } },
      },
    },
    responses: {
      200: {
        description: "已建出的产品",
        content: {
          "application/json": {
            schema: z.object({ data: z.object({ productId: z.string(), status: z.string() }) }),
          },
        },
      },
      404: { description: "草稿不存在", content: { "application/json": { schema: errorSchema } } },
      422: {
        description: "规格不合法,草稿保持可编辑",
        content: {
          "application/json": {
            schema: z.object({ error: z.string(), issues: z.array(z.unknown()) }),
          },
        },
      },
    },
  })

  hono.openapi(commitRoute, async (c) => {
    const input = await parseJsonBody(c, commitBodySchema.default({}))

    const outcome = await importDraftService.commit(c.get("db"), c.req.valid("param").id, {
      sellCurrency: input.sellCurrency ?? options.defaultSellCurrency ?? "CNY",
      supplierId: input.supplierId ?? null,
      productTypeId: input.productTypeId ?? null,
      timezone: input.timezone ?? options.defaultTimezone ?? null,
      ...(input.adultMinAge != null ? { adultMinAge: input.adultMinAge } : {}),
      ...(input.childMinAge != null ? { childMinAge: input.childMinAge } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    })

    if (outcome.status === "not_found") return c.json({ error: "草稿不存在" }, 404)
    if (outcome.status === "invalid") {
      // 问题清单原样透出,人改完再确认,不必从头上传。
      return c.json({ error: "草稿还不能上线,请按提示修正", issues: outcome.issues }, 422)
    }
    return c.json({ data: { productId: outcome.productId, status: outcome.status } }, 200)
  })

  const discardRoute = createRoute({
    method: "post",
    path: "/import-drafts/{id}/discard",
    request: {
      params: draftIdParam,
      body: {
        required: false,
        content: { "application/json": { schema: z.object({ note: z.string().optional() }) } },
      },
    },
    responses: {
      200: {
        description: "已放弃的草稿",
        content: { "application/json": { schema: z.object({ data: draftDetailSchema }) } },
      },
      404: { description: "草稿不存在", content: { "application/json": { schema: errorSchema } } },
    },
  })

  hono.openapi(discardRoute, async (c) => {
    const body = await parseJsonBody(c, z.object({ note: z.string().optional() }).default({}))
    const row = await importDraftService.discard(c.get("db"), c.req.valid("param").id, body.note)
    if (!row) return c.json({ error: "草稿不存在" }, 404)
    return c.json({ data: serializeDraftDetail(row as DraftRowLike) }, 200)
  })

  return hono
}

export const productImportExtension: Extension = {
  name: "import",
  module: "products",
}

/** 由部署装配的线路上线助理扩展。 */
export function createProductImportApiExtension(options: ImportRoutesOptions = {}): ApiExtension {
  return {
    extension: productImportExtension,
    adminRoutes: createProductImportRoutes(options),
  }
}

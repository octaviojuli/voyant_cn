import { getVoyantCloudClient, type VoyantCloudClient } from "@voyant-travel/cloud-sdk"
import type { VoyantRuntimeHostPrimitives } from "@voyant-travel/core"
import type { InventoryBrochureRuntime } from "./runtime-ports.js"
import {
  brochureBodyToHtml,
  type ProductBrochurePrinter,
  type ProductBrochurePrinterContext,
} from "./tasks/brochure-printers.js"

type RuntimeEnv = Readonly<
  Partial<
    Record<
      | "APP_URL"
      | "BROCHURE_CHROMIUM_PATH"
      | "VOYANT_API_KEY"
      | "VOYANT_CLOUD_API_KEY"
      | "VOYANT_CLOUD_API_URL"
      | "VOYANT_CLOUD_USER_AGENT",
      unknown
    >
  >
>
type BrochureRuntimePrimitives = Pick<VoyantRuntimeHostPrimitives, "env">

const CLIENT_CACHE = new WeakMap<object, Map<string, VoyantCloudClient>>()
const LOCAL_PLACEHOLDER_KEYS = new Set(["local-dev"])

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 && !LOCAL_PLACEHOLDER_KEYS.has(trimmed) ? trimmed : undefined
}

function resolveVoyantApiKey(env: RuntimeEnv): string | undefined {
  return nonEmpty(env.VOYANT_API_KEY) ?? nonEmpty(env.VOYANT_CLOUD_API_KEY)
}

function getCloudClient(env: RuntimeEnv): VoyantCloudClient {
  const apiKey = resolveVoyantApiKey(env)
  const cached = apiKey ? CLIENT_CACHE.get(env as object)?.get(apiKey) : undefined
  if (cached) return cached

  const baseUrl = nonEmpty(env.VOYANT_CLOUD_API_URL)
  const userAgent = nonEmpty(env.VOYANT_CLOUD_USER_AGENT)
  const client = getVoyantCloudClient(
    {
      ...(apiKey ? { VOYANT_CLOUD_API_KEY: apiKey } : {}),
      ...(baseUrl ? { VOYANT_CLOUD_API_URL: baseUrl } : {}),
      ...(userAgent ? { VOYANT_CLOUD_USER_AGENT: userAgent } : {}),
    },
    apiKey ? { apiKey } : undefined,
  )
  if (apiKey) {
    const clients = CLIENT_CACHE.get(env as object) ?? new Map<string, VoyantCloudClient>()
    clients.set(apiKey, client)
    CLIENT_CACHE.set(env as object, clients)
  }
  return client
}

function tryGetCloudClient(env: RuntimeEnv): VoyantCloudClient | null {
  return resolveVoyantApiKey(env) ? getCloudClient(env) : null
}

/** Voyant Cloud browser-backed brochure printer used by Inventory workflows and routes. */
export function createProductBrochurePrinter(env: RuntimeEnv): ProductBrochurePrinter {
  const client = getCloudClient(env)
  return async ({ template, context }: ProductBrochurePrinterContext) => {
    const body = await client.browser.pdf({
      html: brochureBodyToHtml(template.body, template.bodyFormat, template.title),
    })
    return {
      body,
      mimeType: "application/pdf",
      fileSize: body.byteLength,
      metadata: {
        renderer: "voyant-cloud-browser",
        productId: context.product.id,
        bodyFormat: template.bodyFormat,
      },
    }
  }
}

/**
 * 打印器的选取顺序:Voyant Cloud 浏览器 → 本机无头浏览器 → `null`。
 *
 * 返回 `null` 不是失败,是回落到内置的 pdf-lib 纯文本打印器——册子难看,但
 * 生成不会断。自托管部署没有云端密钥,本机浏览器就是那条真正在跑的路;它
 * 装没装是运维状态,不该让运营在点「生成宣传册」时看到 500。
 */
export async function resolveBrochurePrinter(
  env: RuntimeEnv,
): Promise<ProductBrochurePrinter | null> {
  if (tryGetCloudClient(env)) return createProductBrochurePrinter(env)
  // 动态引入:那个模块会在运行时去解析 playwright,不该钉进本模块的静态图。
  const { resolveLocalChromiumPrinter } = await import("./tasks/brochure-chromium.js")
  return resolveLocalChromiumPrinter(env)
}

export function createInventoryBrochureRuntime(
  primitives: BrochureRuntimePrimitives,
): InventoryBrochureRuntime {
  return {
    resolvePrinter: (context) => resolveBrochurePrinter(primitives.env(context.env)),
  }
}

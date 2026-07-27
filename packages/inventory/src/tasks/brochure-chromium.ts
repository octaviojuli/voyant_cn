/**
 * 本机无头浏览器打印器(HTML → PDF)。
 *
 * 为什么必须是浏览器:宣传册要的是表格、图片网格、分页控制与中文断行。
 * 内置的 pdf-lib 打印器把标记全部剥成纯文本再一行行画,表格、配图、
 * 页边距一概不存在——那正是此前那份册子看着像会议纪要的原因。
 *
 * 为什么不用云端浏览器:自托管部署没有 Voyant Cloud 密钥,把册子的排版
 * 押在一个未配置的外部服务上等于没有排版。
 *
 * **取不到浏览器不算错误**。`resolveLocalChromiumPrinter` 探测不到就返回
 * `null`,调用方回落到 pdf-lib 那条老路:册子难看,但生成不会失败。生成
 * 宣传册是运营日常动作,不能因为服务器少装一个二进制就整条路断掉。
 */

import type { ProductBrochurePrinter } from "./brochure-printers.js"

/** 只用到这几个方法,不引 playwright 的类型——它不是本包的依赖。 */
interface ChromiumLike {
  executablePath(): string
  launch(options: { executablePath?: string; args?: string[] }): Promise<BrowserLike>
}

interface BrowserLike {
  newPage(): Promise<PageLike>
  close(): Promise<void>
}

interface PageLike {
  setContent(html: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>
  emulateMedia(options: { media?: string }): Promise<void>
  pdf(options: Record<string, unknown>): Promise<Uint8Array>
}

export interface LocalChromiumBrochurePrinterOptions {
  /** 浏览器可执行文件。不给就用 playwright 自己的注册表路径。 */
  executablePath?: string | null
  /** 打印超时(毫秒)。图多的册子内联后 HTML 会到十几兆,给宽一点。 */
  timeoutMs?: number
  /** 页脚模板里的公司名,留空则只印页码。 */
  footerBrand?: string | null
}

type RuntimeEnv = Readonly<Partial<Record<"BROCHURE_CHROMIUM_PATH", unknown>>>

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * 用拼接出来的模块名做动态引入。
 *
 * 这不是故弄玄虚:`packages/inventory` 的模块图还要打进 Workers 目标
 * (工作流入口就在那边),打包器见到字面量的动态 `import("playwright-core")`
 * 会把整个 playwright 连同 `child_process` 一起拉进包里,Workers 构建当场
 * 就废了。拼接后打包器无法静态求解,这一句会原样留到运行时,只有 Node 侧
 * 真正执行到才解析。
 */
async function importPlaywrightCore(): Promise<{ chromium: ChromiumLike } | null> {
  const specifier = ["playwright", "core"].join("-")
  try {
    return (await import(/* @vite-ignore */ specifier)) as { chromium: ChromiumLike }
  } catch {
    return null
  }
}

/**
 * 模块名同样拼接。除了打包器那一层顾虑,这里还有一条:本包的源码会被
 * `inventory-react` 一并类型检查,而那个包的 tsconfig 不带 node 类型,写成
 * 字面量 `node:fs/promises` 会让它的 `typecheck` 直接失败。不为一个可选的
 * 服务端探测去改整个前端包的类型配置。
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    const fs = (await import(["node", "fs/promises"].join(":"))) as {
      access(target: string): Promise<void>
    }
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/**
 * 探测本机浏览器。返回可用的打印器,或 `null`。
 *
 * 探测而不是「先启动试试」:启动一次要一两秒,失败还得等超时,而这个判断
 * 在每次生成宣传册前都要做一遍。检查可执行文件在不在便宜得多。
 */
export async function resolveLocalChromiumPrinter(
  env: RuntimeEnv = {},
  options: LocalChromiumBrochurePrinterOptions = {},
): Promise<ProductBrochurePrinter | null> {
  const playwright = await importPlaywrightCore()
  if (!playwright) return null

  const explicit = options.executablePath?.trim() || nonEmpty(env.BROCHURE_CHROMIUM_PATH)
  let executablePath: string | undefined = explicit
  if (!executablePath) {
    try {
      executablePath = playwright.chromium.executablePath()
    } catch {
      return null
    }
  }

  if (!executablePath || !(await fileExists(executablePath))) return null

  return createLocalChromiumBrochurePrinter(playwright.chromium, {
    ...options,
    executablePath,
  })
}

export function createLocalChromiumBrochurePrinter(
  chromium: ChromiumLike,
  options: LocalChromiumBrochurePrinterOptions = {},
): ProductBrochurePrinter {
  const timeout = options.timeoutMs ?? 60_000

  return async ({ template, context }) => {
    const browser = await chromium.launch({
      ...(options.executablePath ? { executablePath: options.executablePath } : {}),
      // 容器与精简过的 ECS 上常常没有 /dev/shm 配额,不关共享内存会随机崩。
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
    })

    try {
      const page = await browser.newPage()
      // `setContent` 不经过网络。配图此前已内联成 data:,所以这里不需要
      // 等待任何外部请求——`load` 即代表图片已解码完成。
      await page.setContent(template.body, { waitUntil: "load", timeout })
      // 默认是 screen 媒体,@page 与 break-* 规则不会生效。
      await page.emulateMedia({ media: "print" })

      const body = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: renderFooterTemplate(options.footerBrand),
        timeout,
      })

      return {
        body,
        mimeType: "application/pdf",
        fileSize: body.byteLength,
        metadata: {
          renderer: "local-chromium",
          productId: context.product.id,
          bodyFormat: template.bodyFormat,
        },
      }
    } finally {
      await browser.close()
    }
  }
}

/**
 * 页脚只印公司名与页码。Chrome 的页眉页脚模板是**独立文档**:外部样式一概
 * 不继承,字号默认小到看不见,所以样式必须写在行内。
 */
function renderFooterTemplate(brand: string | null | undefined): string {
  const escaped = (brand ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

  return [
    '<div style="width:100%;font-size:8pt;color:#94a3b8;padding:0 14mm;',
    'display:flex;justify-content:space-between;font-family:sans-serif;">',
    `<span>${escaped}</span>`,
    '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>',
    "</div>",
  ].join("")
}

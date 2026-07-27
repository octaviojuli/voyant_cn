/**
 * 宣传册外壳:主题 + 版块 → 一整份可打印的 HTML。
 *
 * 版块本体在 `brochure-sections.ts`,主题在 `brochure-theme.ts`,样式在
 * `brochure-themed-styles.ts`。这里只管拼装,以及把「渲染 HTML → 交给会
 * 排版的打印器」这一步包成一个 `ProductBrochurePrinter`。
 */

import { escapeHtml } from "./brochure-format.js"
import { inlineBrochureImages } from "./brochure-images.js"
import {
  BROCHURE_LABELS_EN,
  type BrochureLabels,
  resolveBrochureLabels,
} from "./brochure-labels.js"
import {
  isBasicPdfProductBrochurePrinter,
  type ProductBrochurePrinter,
} from "./brochure-printers.js"
import {
  defaultThemedBrochureSections,
  type ThemedBrochureRenderInput,
  type ThemedBrochureSection,
} from "./brochure-sections.js"
import type {
  ProductBrochureTemplateContext,
  RenderedProductBrochureTemplate,
} from "./brochure-templates.js"
import {
  DEFAULT_THEME,
  type ResolvedThemedBrochureTheme,
  resolveTheme,
  type ThemedBrochureTheme,
} from "./brochure-theme.js"
import { renderThemedBrochureStyles } from "./brochure-themed-styles.js"

export {
  DEFAULT_THEME,
  defaultThemedBrochureSections,
  type ResolvedThemedBrochureTheme,
  type ThemedBrochureRenderInput,
  type ThemedBrochureSection,
  type ThemedBrochureTheme,
}

export interface RenderThemedBrochureHtmlOptions {
  theme?: ThemedBrochureTheme
  /**
   * Replaces the default brochure section set. Use this for a full redesign
   * while keeping the shared print pipeline.
   */
  sections?: ReadonlyArray<ThemedBrochureSection>
  /** Appends sections after the default or replacement section set. */
  additionalSections?: ReadonlyArray<ThemedBrochureSection>
  /**
   * 册子的语言。给了就按它取词典与日期/金额格式;不给则跟着产品的
   * `default_language_tag` 走,两者都没有才落英文。
   */
  language?: string | null
  labels?: BrochureLabels
  /** 媒体 id → `data:` 内联图,由 {@link createThemedBrochurePrinter} 预先读好。 */
  imageSources?: ReadonlyMap<string, string>
}

export interface CreateThemedBrochurePrinterOptions extends RenderThemedBrochureHtmlOptions {
  printer: ProductBrochurePrinter
  /**
   * 读配图字节的存储句柄。给了就把图内联成 `data:`;不给则只能照 URL 引用,
   * 自托管部署下那是要鉴权的站内路径,打印进程取不到。
   */
  storage?: Parameters<typeof inlineBrochureImages>[1]
}

function resolveLanguage(
  options: RenderThemedBrochureHtmlOptions,
  context: ProductBrochureTemplateContext,
): string | null {
  return options.language?.trim() || context.product.defaultLanguageTag?.trim() || null
}

function resolveLabels(
  options: RenderThemedBrochureHtmlOptions,
  context: ProductBrochureTemplateContext,
): BrochureLabels {
  if (options.labels) return options.labels
  const language = resolveLanguage(options, context)
  return language ? resolveBrochureLabels(language) : BROCHURE_LABELS_EN
}

export function renderThemedBrochureHtml(
  template: RenderedProductBrochureTemplate,
  context: ProductBrochureTemplateContext,
  options: RenderThemedBrochureHtmlOptions = {},
) {
  const theme = resolveTheme(options.theme)
  const labels = resolveLabels(options, context)
  const locale = resolveLanguage(options, context) ?? "en"
  const sections = [
    ...(options.sections ?? defaultThemedBrochureSections),
    ...(options.additionalSections ?? []),
  ]
  const input: ThemedBrochureRenderInput = {
    template,
    context,
    theme,
    labels,
    locale,
    imageSources: options.imageSources ?? new Map(),
  }
  const content = sections
    .map((section) => section.render(input))
    .filter((section): section is string => Boolean(section?.trim()))
    .join("")
  const footer = theme.footerText
    ? `<footer class="brochure-footer">${escapeHtml(theme.footerText)}</footer>`
    : ""

  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(locale)}">`,
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(template.title)}</title>`,
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<style>${renderThemedBrochureStyles(theme)}</style>`,
    "</head>",
    `<body>${content}${footer}</body>`,
    "</html>",
  ].join("")
}

export function createThemedBrochurePrinter(
  options: CreateThemedBrochurePrinterOptions,
): ProductBrochurePrinter {
  if (isBasicPdfProductBrochurePrinter(options.printer)) {
    throw new Error(
      "createThemedBrochurePrinter requires an HTML-capable browser printer. The built-in basic PDF printer strips HTML tags and cannot render themed brochure styles.",
    )
  }

  return async ({ template, context }) => {
    const imageSources = options.storage
      ? await inlineBrochureImages(context.media, options.storage)
      : options.imageSources
    const html = renderThemedBrochureHtml(template, context, {
      ...options,
      ...(imageSources ? { imageSources } : {}),
    })
    const printed = await options.printer({
      template: {
        ...template,
        body: html,
        bodyFormat: "html",
      },
      context,
    })

    return {
      ...printed,
      metadata: {
        ...printed.metadata,
        layout: "themed-brochure",
        inlinedImages: imageSources?.size ?? 0,
      },
    }
  }
}

export const createThemedProductBrochurePrinter = createThemedBrochurePrinter

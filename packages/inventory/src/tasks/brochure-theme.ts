/** 宣传册主题(品牌色、字体、页脚)。段落渲染与外壳共用同一份解析。 */

import { safeCssValue } from "./brochure-format.js"

export interface ThemedBrochureTheme {
  brandName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  backgroundColor?: string | null
  surfaceColor?: string | null
  textColor?: string | null
  mutedTextColor?: string | null
  borderColor?: string | null
  fontFamily?: string | null
  footerText?: string | null
}

export type ResolvedThemedBrochureTheme = {
  [Key in keyof Required<ThemedBrochureTheme>]: string
}

export const DEFAULT_THEME: ResolvedThemedBrochureTheme = {
  brandName: "Voyant",
  logoUrl: "",
  primaryColor: "#172554",
  accentColor: "#0f766e",
  backgroundColor: "#f8fafc",
  surfaceColor: "#ffffff",
  textColor: "#111827",
  mutedTextColor: "#64748b",
  borderColor: "#dbe3ef",
  // 中文字体排在前面。落到只有西文字形的默认字体上,汉字会显示成方框——
  // 这正是此前中文 PDF 的老毛病,排版这一侧也要防住。
  fontFamily:
    '"PingFang SC", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", Inter, ui-sans-serif, system-ui, sans-serif',
  footerText: "",
}

export function resolveTheme(theme?: ThemedBrochureTheme): ResolvedThemedBrochureTheme {
  return {
    brandName: theme?.brandName?.trim() || DEFAULT_THEME.brandName,
    logoUrl: theme?.logoUrl?.trim() || DEFAULT_THEME.logoUrl,
    primaryColor: safeCssValue(theme?.primaryColor || DEFAULT_THEME.primaryColor),
    accentColor: safeCssValue(theme?.accentColor || DEFAULT_THEME.accentColor),
    backgroundColor: safeCssValue(theme?.backgroundColor || DEFAULT_THEME.backgroundColor),
    surfaceColor: safeCssValue(theme?.surfaceColor || DEFAULT_THEME.surfaceColor),
    textColor: safeCssValue(theme?.textColor || DEFAULT_THEME.textColor),
    mutedTextColor: safeCssValue(theme?.mutedTextColor || DEFAULT_THEME.mutedTextColor),
    borderColor: safeCssValue(theme?.borderColor || DEFAULT_THEME.borderColor),
    fontFamily: safeCssValue(theme?.fontFamily || DEFAULT_THEME.fontFamily),
    footerText: theme?.footerText?.trim() || DEFAULT_THEME.footerText,
  }
}

import { setupEn } from "./en.js"
import type { SetupMessages } from "./messages.js"
import { setupRo } from "./ro.js"
import { setupZh } from "./zh.js"

export type { SetupMessages }
export { setupEn, setupRo, setupZh }

export function resolveSetupMessages(locale: string | null | undefined): SetupMessages {
  // Match the shared runtime's candidate order: exact tag, then the primary
  // subtag — a prefix test would also capture distinct ISO codes such as
  // "rom" (Romany) or "zha" (Zhuang).
  const primary = locale?.trim().toLowerCase().split(/[-_]/)[0]
  if (primary === "ro") {
    return setupRo
  }
  if (primary === "zh") {
    return setupZh
  }
  return setupEn
}

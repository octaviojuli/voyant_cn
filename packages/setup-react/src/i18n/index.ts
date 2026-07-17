import { setupEn } from "./en.js"
import type { SetupMessages } from "./messages.js"
import { setupRo } from "./ro.js"
import { setupZh } from "./zh.js"

export type { SetupMessages }
export { setupEn, setupRo, setupZh }

export function resolveSetupMessages(locale: string | null | undefined): SetupMessages {
  const normalized = locale?.toLowerCase()
  if (normalized?.startsWith("ro")) {
    return setupRo
  }
  if (normalized?.startsWith("zh")) {
    return setupZh
  }
  return setupEn
}

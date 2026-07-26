import {
  formatMessage,
  type LocaleMessageDefinitions,
  resolvePackageMessages,
} from "@voyant-travel/i18n"

/**
 * Copy for the availability rule detail page's "generate departures" action.
 *
 * This lives in its own bundle (rather than in the shared availability
 * dictionary) because the action is owned by the rule detail page and the
 * shared `availability-part-*` message files are edited concurrently. It
 * resolves off the same locale the availability provider already exposes via
 * `useAvailabilityUiI18nOrDefault().locale`, so en/ro/zh stay in structural
 * parity with the rest of the package.
 */
export type RuleSlotGenerationMessages = {
  /** Button label. */
  action: string
  /** Button label while the request is in flight. */
  pending: string
  /** `{created}` departures materialized. */
  created: string
  /** Nothing new: `{skipped}` dates already had a departure. */
  alreadyUpToDate: string
  /** Mixed result: `{created}` new, `{skipped}` already present. */
  createdWithSkipped: string
  /** The rule is inactive, so generation is a deliberate no-op. */
  inactive: string
  /** Request failed. */
  failed: string
}

const en: RuleSlotGenerationMessages = {
  action: "Generate departures",
  pending: "Generating...",
  created: "{created} departures generated.",
  alreadyUpToDate: "Already up to date — {skipped} dates already had a departure.",
  createdWithSkipped: "{created} departures generated, {skipped} already existed.",
  inactive: "This rule is inactive, so no departures were generated.",
  failed: "Departures could not be generated.",
}

const ro: RuleSlotGenerationMessages = {
  action: "Genereaza plecari",
  pending: "Se genereaza...",
  created: "{created} plecari generate.",
  alreadyUpToDate: "Deja la zi — {skipped} date aveau deja o plecare.",
  createdWithSkipped: "{created} plecari generate, {skipped} existau deja.",
  inactive: "Regula este inactiva, deci nu au fost generate plecari.",
  failed: "Plecarile nu au putut fi generate.",
}

const zh: RuleSlotGenerationMessages = {
  action: "按规则生成班期",
  pending: "正在生成…",
  created: "已生成 {created} 个班期。",
  alreadyUpToDate: "已是最新：{skipped} 个日期已存在班期。",
  createdWithSkipped: "已生成 {created} 个班期，{skipped} 个日期已存在。",
  inactive: "该规则已停用，未生成任何班期。",
  failed: "生成班期失败。",
}

export const ruleSlotGenerationMessageDefinitions = {
  en,
  ro,
  zh,
} satisfies LocaleMessageDefinitions<RuleSlotGenerationMessages>

export function resolveRuleSlotGenerationMessages(
  locale: string | null | undefined,
): RuleSlotGenerationMessages {
  return resolvePackageMessages({
    definitions: ruleSlotGenerationMessageDefinitions,
    fallbackLocale: "en",
    locale,
  })
}

/**
 * Turn a `generate-slots` response into one localized sentence.
 *
 * `active` is the rule's own flag: the endpoint answers `created: 0` for an
 * inactive rule instead of failing, so the page has to say why nothing
 * happened rather than showing a bare "0 generated".
 */
export function formatRuleSlotGenerationResult(
  messages: RuleSlotGenerationMessages,
  result: { created: number; skipped: number },
  options: { active: boolean },
): string {
  if (!options.active) return messages.inactive
  if (result.created === 0 && result.skipped > 0) {
    return formatMessage(messages.alreadyUpToDate, { skipped: result.skipped })
  }
  if (result.skipped > 0) {
    return formatMessage(messages.createdWithSkipped, {
      created: result.created,
      skipped: result.skipped,
    })
  }
  return formatMessage(messages.created, { created: result.created })
}

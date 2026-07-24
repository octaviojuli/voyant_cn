import { access, readdir, readFile } from "node:fs/promises"
import path from "node:path"

const rootDir = process.cwd()

const filePatterns = [".ts", ".tsx"]
const ignoredDirectoryNames = new Set(["dist", "i18n", "node_modules"])
const ignoredFileSuffixes = [".d.ts", ".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"]
// Dictionary modules are copy by definition. Some packages keep them outside
// an `i18n/` directory (e.g. storefront's `messages-ro.ts`), so also skip by
// basename: en/ro/zh dictionaries, messages files, and i18n entry modules.
const dictionaryFilePattern = /^(?:messages(?:-[\w.]+)?|(?:en|ro|zh)(?:-[\w.]+)?|i18n)\.tsx?$/
// `type ` declarations carry generics (`Foo<T> = Bar<T> & {`) that trip the
// JSX-text heuristic but can never render user copy.
const ignoredLineStarts = ["import ", "export ", "type "]
const ignoredLineIncludes = [
  ">=",
  "<=",
  "=> Promise",
  "Promise<",
  "Record<string",
  "Resolver<",
  "z.literal(",
  "z.coerce",
  "function stripUndefined<",
  "function bucketBy<",
  "useForm<",
  "fetchJson<",
  "setField(",
  // TanStack Query / fetch-helper shapes — the JSX-text heuristic mis-fires
  // on `=> api.get<Type>(...)`, queryKey arrays, and bare `method: "PATCH"`
  // wire-protocol strings. These are network plumbing, not user-facing copy.
  "queryFn:",
  "queryKey:",
  "mutationFn:",
  "mutationKey:",
  "api.get<",
  "api.post<",
  "api.patch<",
  "api.put<",
  "api.delete<",
  "= useQuery(",
  "= useMutation(",
  "= useInfiniteQuery(",
  'method: "',
  "method: '",
  "headers: {",
  "function useEditingToggle<",
  // react-hook-form plumbing — `.setValue("field", "Default")` and
  // `.register("field")` keep field names as quoted identifiers that
  // can collide with the multi-word string heuristic.
  ".setValue(",
  ".register(",
  ".getValues(",
  ".watch(",
]
const nonUserFacingLiterals = new Set([
  "",
  "-",
  " *",
  "?",
  "EUR",
  "GBP",
  "RON",
  "USD",
  "UTC",
  "Europe/Bucharest",
  "FREQ=DAILY;INTERVAL=1",
  // HTTP methods (PATCH, DELETE, OPTIONS are >4 chars so they slip past the
  // generic uppercase fallback).
  "PATCH",
  "DELETE",
  "OPTIONS",
  // RRULE frequency tokens used in product-schedule-form and elsewhere.
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
])

const suspiciousPatterns = [
  // Negative lookbehind on `=` skips arrow-function bodies like
  // `([a, b]) => (map.get(a) ?? 0) < b` where the `>` belongs to `=>`
  // and the `<` is a comparison, not JSX.
  /(?<!=)>\s*[^<{]*[A-Za-z][^<{]*</,
  /\b(?:title|placeholder|label|description|emptyMessage|buttonLabel|confirmLabel|aria-label)\s*=\s*(?:"[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*'|`[^`]*[A-Za-z][^`]*`)/,
  /(?:\?\s*|:\s*|return\s+)(?:"(?:[^"\n]* [^"\n]*|[A-Z][A-Za-z][^"\n]*)"|'(?:[^'\n]* [^'\n]*|[A-Z][A-Za-z][^'\n]*)')/,
]

function extractQuotedStrings(line) {
  return [...line.matchAll(/(?:"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? "",
  )
}

function looksLikeTailwindUtility(value) {
  // Template-literal class lists embed conditional expressions like
  // `mt-1 ${mono ? "font-mono" : "font-medium"}`. Strip the ${...} chunks
  // before tokenizing so the remaining Tailwind utility names still pass.
  const stripped = value
    .replace(/\$\{[^}]*\}/g, "")
    .replace(/[`"']/g, "")
    .trim()
  if (!stripped) {
    return false
  }

  return stripped.split(/\s+/).every((token) => {
    const bareToken = token.replace(/^[a-z0-9_-]+:/i, "")
    return (
      /^(?:[a-z0-9[\]()./%#,:_-]+!?|\[[^\]]+\])$/i.test(token) &&
      (/^(?:absolute|block|contents|flex|grid|hidden|inline|relative|sticky|truncate)$/.test(
        bareToken,
      ) ||
        /(?:^|:)(?:accent|animate|auto|bg|border|bottom|break|capitalize|center|col|cursor|duration|ease|flex|font|gap|grid|h|inset|items|justify|left|line|lowercase|m|mb|min|ml|mr|mt|mx|my|opacity|overflow|p|pb|pl|pointer|pr|pt|px|py|resize|right|ring|rounded|row|scroll|shadow|shrink|size|sm|space|sr|tabular|text|top|touch|tracking|transition|uppercase|w|whitespace|z)-/.test(
          token,
        ))
    )
  })
}

function isKnownNonUserFacingLiteral(value) {
  return nonUserFacingLiterals.has(value) || /^[A-Z]{2,4}$/.test(value)
}

function shouldIgnoreLine(trimmed) {
  return (
    !trimmed ||
    trimmed.includes("i18n-literal-ok") ||
    ignoredLineStarts.some((prefix) => trimmed.startsWith(prefix)) ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  )
}

// Seam-fed fallbacks like `navMessages.suppliers ?? "Suppliers"` or
// `messages?.title ?? "Fallback"` ship English only as the default for a
// message the locale bundle overrides at runtime — by design, not drift.
const messageFallbackPattern = /\b[\w?.]*(?:essages|nav\w*|labels?)[\w?.]*\s*\?\?\s*["'`]/

function shouldIgnoreSuspiciousLine(trimmed) {
  if (ignoredLineIncludes.some((fragment) => trimmed.includes(fragment))) {
    return true
  }

  if (messageFallbackPattern.test(trimmed)) {
    return true
  }

  const quotedStrings = extractQuotedStrings(trimmed)
  if (quotedStrings.length === 0) {
    return false
  }

  return quotedStrings.every(
    (value) => isKnownNonUserFacingLiteral(value) || looksLikeTailwindUtility(value),
  )
}

function normalizeJsxText(value) {
  return value.replace(/\s+/g, " ").trim()
}

function getPreviousMeaningfulLine(lines, startIndex) {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const trimmed = lines[index].trim()
    if (trimmed) {
      return trimmed
    }
  }

  return ""
}

function getNextMeaningfulLine(lines, startIndex) {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (trimmed) {
      return trimmed
    }
  }

  return ""
}

function looksLikeJsxOpeningContext(trimmed) {
  return (
    trimmed === ">" ||
    /^<[A-Z_a-z][^>]*>$/.test(trimmed) ||
    /[({]\s*<[A-Z_a-z][^>]*>$/.test(trimmed) ||
    /^[A-Za-z_$][\w$]*=.*>$/.test(trimmed)
  )
}

function looksLikeJsxClosingContext(trimmed) {
  return (
    trimmed.startsWith("</") ||
    trimmed.startsWith("<") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith(")")
  )
}

function looksLikeStandaloneJsxText(lines, index) {
  const text = normalizeJsxText(lines[index])

  if (
    !/[A-Za-z]/.test(text) ||
    /[<>{}`=;]/.test(text) ||
    !/^[A-Za-z][A-Za-z0-9 '&/+.-]*[.!?]?$/.test(text) ||
    isKnownNonUserFacingLiteral(text) ||
    looksLikeTailwindUtility(text)
  ) {
    return false
  }

  const previous = getPreviousMeaningfulLine(lines, index)
  const next = getNextMeaningfulLine(lines, index)

  return looksLikeJsxOpeningContext(previous) && looksLikeJsxClosingContext(next)
}

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function collectOptInRoots() {
  const roots = []
  const packagesDir = path.join(rootDir, "packages")
  const packageNames = await readdir(packagesDir)

  for (const packageName of packageNames) {
    // Upstream named its UI packages `*-ui`; this repo uses `*-react`. Opt in
    // by the real signal — a package-owned i18n entrypoint — so the scan can
    // never be silently skipped by a naming mismatch again.
    if (!packageName.endsWith("-ui") && !packageName.endsWith("-react")) {
      continue
    }

    const candidateEntries = [
      path.join(packagesDir, packageName, "src", "i18n", "index.ts"),
      path.join(packagesDir, packageName, "src", "i18n.tsx"),
    ]
    for (const i18nEntry of candidateEntries) {
      if (await exists(i18nEntry)) {
        roots.push(path.join(packagesDir, packageName, "src"))
        break
      }
    }
  }

  // Starters opt in to the scan via their admin-i18n shim. We only walk
  // `components/voyant/**` — custom voyant components are pure UI. Server
  // routes (api/, workflows.ts), shadcn ui/ copies, the api-client lib, and
  // TanStack Router page files mix non-UI concerns and would produce noise.
  const startersDir = path.join(rootDir, "starters")
  const starterNames = await readdir(startersDir).catch(() => [])

  for (const starterName of starterNames) {
    const adminI18nEntry = path.join(startersDir, starterName, "src", "lib", "admin-i18n.tsx")
    if (!(await exists(adminI18nEntry))) continue

    const voyantComponents = path.join(startersDir, starterName, "src", "components", "voyant")
    if (await exists(voyantComponents)) {
      roots.push(voyantComponents)
    }
  }

  return roots.sort()
}

/**
 * Files inside opted-in roots that still contain hardcoded English copy and
 * haven't been threaded through the i18n bundle yet. Listed here so the
 * scanner gates new drift in the rest of the operator starter while we work
 * through the backlog. Remove entries as each file is translated.
 *
 * The list is dominated by surfaces that pre-date the i18n migration in the
 * operator starter — settings dialogs, the trips, resource detail
 * pages — and by `.ts` query helpers whose `queryFn: () => api.get<Type>(...)`
 * shape produces false positives from the JSX-text heuristic. Translate the
 * UI strings and rerun the scanner to confirm before removing an entry.
 */
const HARDCODED_FILE_ALLOWLIST = new Set(
  [
    // Legacy non-rendered option/label constants. Their English `label`
    // values are superseded by dictionary maps at render time (the pages
    // resolve display labels from the package i18n bundle keyed by `value`),
    // so the literals never reach the UI. Remove entries once the constants
    // drop their vestigial `label` fields.
    "packages/distribution-react/src/constants.ts",
    "packages/distribution-react/src/suppliers/constants.ts",
    "packages/bookings-react/src/requirements/constants.ts",
  ].map((relative) => path.join(rootDir, relative)),
)

async function collectSourceFiles(rootPath) {
  const results = []

  async function walk(currentPath) {
    const entries = await readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) {
          await walk(nextPath)
        }
        continue
      }

      if (
        filePatterns.some((suffix) => entry.name.endsWith(suffix)) &&
        !ignoredFileSuffixes.some((suffix) => entry.name.endsWith(suffix)) &&
        !dictionaryFilePattern.test(entry.name)
      ) {
        results.push(nextPath)
      }
    }
  }

  await walk(rootPath)
  return results.sort()
}

// Inline locale dictionary blocks (`en: {`, `ro: {`, `zh: {` — bare or
// quoted keys, e.g. setup-step `messages` maps) and package-local
// `const defaultMessages = {` fallback bundles are copy by definition:
// structural parity across locales is enforced by their TypeScript message
// types, so the scanner skips the whole object instead of flagging each
// translated line.
const inlineDictionaryOpenPattern = /^\s*(?:"?(?:en|ro|zh)"?)\s*:\s*\{/
const defaultMessagesOpenPattern = /^\s*(?:export\s+)?const\s+defaultMessages\b[^=]*=\s*\{\s*$/

function countBraceDelta(line) {
  let delta = 0
  for (const char of line) {
    if (char === "{") delta += 1
    else if (char === "}") delta -= 1
  }
  return delta
}

async function findSuspiciousLines(filePath) {
  const findings = []
  const source = await readFile(filePath, "utf8")
  const lines = source.split("\n")

  let dictionarySkipDepth = 0
  let inBlockComment = false

  for (const [index, line] of lines.entries()) {
    // Lines inside `/* … */` block comments (including multi-line JSX
    // `{/* … */}` comments) are prose, never renderable copy. A simple
    // open/close flag is enough: code after `*/` on the closing line is
    // rare and gets picked up again from the next line onward.
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false
      continue
    }
    let effectiveLine = line
    const blockCommentStart = line.indexOf("/*")
    if (blockCommentStart !== -1 && !line.slice(blockCommentStart).includes("*/")) {
      inBlockComment = true
      effectiveLine = line.slice(0, blockCommentStart)
    }

    if (dictionarySkipDepth > 0) {
      dictionarySkipDepth = Math.max(0, dictionarySkipDepth + countBraceDelta(effectiveLine))
      continue
    }
    if (
      inlineDictionaryOpenPattern.test(effectiveLine) ||
      defaultMessagesOpenPattern.test(effectiveLine)
    ) {
      dictionarySkipDepth = Math.max(0, countBraceDelta(effectiveLine))
      continue
    }

    const trimmed = effectiveLine.trim()
    if (
      shouldIgnoreLine(trimmed) ||
      shouldIgnoreSuspiciousLine(trimmed) ||
      (index > 0 && lines[index - 1].includes("i18n-literal-ok"))
    ) {
      continue
    }

    if (
      suspiciousPatterns.some((pattern) => pattern.test(effectiveLine)) ||
      looksLikeStandaloneJsxText(lines, index)
    ) {
      findings.push({
        filePath,
        line: index + 1,
        text: normalizeJsxText(trimmed),
      })
    }
  }

  return findings
}

async function main() {
  const roots = await collectOptInRoots()

  if (roots.length === 0) {
    console.log("ui hardcoded string scan skipped: no package-owned i18n entrypoints found.")
    process.exit(0)
  }

  const findings = []

  for (const rootPath of roots) {
    const sourceFiles = await collectSourceFiles(rootPath)
    for (const filePath of sourceFiles) {
      if (HARDCODED_FILE_ALLOWLIST.has(filePath)) continue
      findings.push(...(await findSuspiciousLines(filePath)))
    }
  }

  if (findings.length > 0) {
    console.error("hardcoded UI string scan failed:\n")
    for (const finding of findings) {
      console.error(`- ${path.relative(rootDir, finding.filePath)}:${finding.line} ${finding.text}`)
    }
    process.exit(1)
  }

  console.log(`ui hardcoded string scan passed across ${roots.length} i18n-enabled roots.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

import { HeadContent, Scripts } from "@tanstack/react-router"
import {
  type AdminChromeMessages,
  adminChromeMessages,
  adminChromeZh,
  resolveLocaleMessages,
} from "@voyant-travel/i18n"
import { Button, Toaster } from "@voyant-travel/ui/components"
import { Alert, AlertDescription, AlertTitle } from "@voyant-travel/ui/components/alert"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@voyant-travel/ui/components/empty"
import { RefreshCcw } from "lucide-react"
import type { ReactNode } from "react"

import { DEFAULT_ADMIN_LOCALE, resolveAdminLocale } from "../providers/locale.js"
import { useOptionalOperatorAdminMessages } from "../providers/operator-admin-messages.js"
import { ThemeProvider } from "../providers/theme.js"

export interface AdminRootHeadOptions {
  /** Document/OG title. */
  title: string
  description?: string
  faviconHref?: string
  themeColor?: string
  /** Extra meta tags appended after the defaults. */
  meta?: Array<Record<string, string>>
  /** Extra link tags appended after the favicon. */
  links?: Array<Record<string, string>>
}

/**
 * Inline theme + language detection, run before hydration so the first paint
 * doesn't flash the wrong theme or language. Load-bearing: keep in sync with
 * the ThemeProvider storage key (`theme`), the locale storage key
 * (`admin-locale`), and the DEFAULT_ADMIN_LOCALES allowlist in
 * `providers/locale.tsx`.
 */
const ADMIN_BOOTSTRAP_SCRIPT = `(function(){var t=localStorage.getItem("theme");if(t==="dark"||(!t||t==="system")&&matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.classList.add("dark")}var l=localStorage.getItem("admin-locale")||(navigator.language||"en");l=l.toLowerCase().split("-")[0];document.documentElement.lang=l==="ro"?"ro":l==="zh"?"zh":"en"})()`

/**
 * The root route `head()` payload for a Voyant admin app: charset/viewport,
 * robots noindex, OG basics, favicon, and the pre-hydration theme/locale
 * bootstrap script.
 */
export function adminRootHead(options: AdminRootHeadOptions) {
  const { title, description, faviconHref = "/fav128.png", themeColor = "#ffffff" } = options

  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex,nofollow" },
      ...(description ? [{ name: "description", content: description }] : []),
      { name: "theme-color", content: themeColor },
      { property: "og:title", content: title },
      { property: "og:type", content: "website" },
      { title },
      ...(options.meta ?? []),
    ],
    links: [{ rel: "icon", type: "image/png", href: faviconHref }, ...(options.links ?? [])],
    scripts: [{ children: ADMIN_BOOTSTRAP_SCRIPT }],
  }
}

/**
 * The SSR'd document shell (`shellComponent` on the root route): bare
 * html/head/body with head content and router scripts. `suppressHydrationWarning`
 * because the bootstrap script mutates `documentElement` before hydration.
 *
 * `lang` sets the static document language served before the bootstrap
 * script runs (SPA fallback HTML, crawlers, no-JS) — pass the deployment's
 * default admin locale; the bootstrap script still switches to the user's
 * persisted/browser locale before first paint.
 */
export function AdminRootShell({ children, lang = "en" }: { children: ReactNode; lang?: string }) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export interface AdminRootErrorBoundaryProps {
  error: unknown
  reset: () => void
  /** Fallback copy when the error has no usable message. */
  fallbackMessage?: string
  homeHref?: string
}

/**
 * Root error boundary. TanStack Router's `errorComponent` replaces the root
 * component entirely, so the app's provider tree (ThemeProvider etc.) isn't
 * above us — mount a local ThemeProvider so <Toaster />'s useTheme() call
 * doesn't crash the boundary.
 */
// Chrome message definitions with the zh dictionary merged in, so the
// boundary can resolve localized copy without the app's provider tree.
const errorBoundaryChromeDefinitions = { ...adminChromeMessages, zh: adminChromeZh }

/**
 * Detect the admin locale the same way the pre-hydration bootstrap script
 * does (persisted `admin-locale`, then the browser language), so the error
 * boundary stays localized even though it renders outside <LocaleProvider>.
 */
function detectAdminLocale(): string {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_LOCALE
  }

  const stored = window.localStorage.getItem("admin-locale")
  const browser = typeof navigator !== "undefined" ? navigator.language : null
  return resolveAdminLocale(stored ?? browser)
}

export function AdminRootErrorBoundary({
  error,
  reset,
  fallbackMessage,
  homeHref = "/",
}: AdminRootErrorBoundaryProps) {
  // Optional: the root error boundary replaces the root component, so the
  // app's message provider is usually gone — resolve the chrome copy from
  // the detected locale then.
  const providedMessages = useOptionalOperatorAdminMessages()
  const messages: AdminChromeMessages =
    providedMessages ??
    resolveLocaleMessages({
      locale: detectAdminLocale(),
      fallbackLocale: DEFAULT_ADMIN_LOCALE,
      definitions: errorBoundaryChromeDefinitions,
    })
  const resolvedFallbackMessage = fallbackMessage ?? messages.errorBoundaryFallbackMessage
  const message = error instanceof Error && error.message ? error.message : resolvedFallbackMessage

  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <div className="flex min-h-screen items-center justify-center p-6">
        <Empty className="max-w-xl border border-border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RefreshCcw className="size-5" />
            </EmptyMedia>
            <EmptyTitle>{messages.errorBoundaryTitle}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Alert variant="destructive" className="text-left">
              <AlertTitle>{messages.errorBoundaryRequestFailed}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            <div className="flex items-center gap-3">
              <Button onClick={() => reset()}>{messages.tryAgain}</Button>
              <Button variant="outline" onClick={() => window.location.assign(homeHref)}>
                {messages.goToDashboard}
              </Button>
            </div>
          </EmptyContent>
        </Empty>
        <Toaster />
      </div>
    </ThemeProvider>
  )
}

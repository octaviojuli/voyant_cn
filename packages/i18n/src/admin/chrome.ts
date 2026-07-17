import type { LocaleMessageDefinitions } from "../runtime.js"

export type AdminChromeMessages = {
  loading: string
  account: string
  notifications: string
  logOut: string
  light: string
  dark: string
  language: string
  english: string
  romanian: string
  chinese: string
  toggleSidebar: string
  toggleSidebarShortcutTitle: string
  loadingWorkspace: string
  loadingWorkspaceAriaLabel: string
  notFoundTitle: string
  notFoundDescription: string
  goToDashboard: string
  tryAgain: string
  errorBoundaryTitle: string
  errorBoundaryRequestFailed: string
  errorBoundaryFallbackMessage: string
  navBadgeSoon: string
  navBadgeBeta: string
  uiExtensionLoadingDescription: string
  uiExtensionLoadFailedDescription: string
  uiExtensionIncompatibleDescription: string
}

export const adminChromeMessages = {
  en: {
    loading: "Loading...",
    account: "Account",
    notifications: "Notifications",
    logOut: "Log out",
    light: "Light",
    dark: "Dark",
    language: "Language",
    english: "English",
    romanian: "Romanian",
    chinese: "Chinese",
    toggleSidebar: "Toggle sidebar",
    toggleSidebarShortcutTitle: "Toggle sidebar (Cmd/Ctrl+B)",
    loadingWorkspace: "Loading workspace",
    loadingWorkspaceAriaLabel: "Loading admin workspace",
    notFoundTitle: "Page not found",
    notFoundDescription: "The page you requested does not exist or is no longer available.",
    goToDashboard: "Go to dashboard",
    tryAgain: "Try again",
    errorBoundaryTitle: "Something went wrong",
    errorBoundaryRequestFailed: "Request failed",
    errorBoundaryFallbackMessage: "Something went wrong while loading this page.",
    navBadgeSoon: "Soon",
    navBadgeBeta: "Beta",
    uiExtensionLoadingDescription: "Loading extension…",
    uiExtensionLoadFailedDescription: "This extension could not be loaded and was skipped.",
    uiExtensionIncompatibleDescription:
      "This extension is incompatible with this admin version (requires {requiredVersion}, admin provides {providedVersion}).",
  },
  ro: {
    loading: "Se incarca...",
    account: "Cont",
    notifications: "Notificari",
    logOut: "Deconectare",
    light: "Luminos",
    dark: "Intunecat",
    language: "Limba",
    english: "Engleza",
    romanian: "Romana",
    chinese: "Chineza",
    toggleSidebar: "Comuta bara laterala",
    toggleSidebarShortcutTitle: "Comuta bara laterala (Cmd/Ctrl+B)",
    loadingWorkspace: "Se incarca spatiul de lucru",
    loadingWorkspaceAriaLabel: "Se incarca spatiul de lucru admin",
    notFoundTitle: "Pagina nu a fost gasita",
    notFoundDescription: "Pagina solicitata nu exista sau nu mai este disponibila.",
    goToDashboard: "Mergi la panou",
    tryAgain: "Incearca din nou",
    errorBoundaryTitle: "Ceva nu a functionat",
    errorBoundaryRequestFailed: "Cererea a esuat",
    errorBoundaryFallbackMessage: "Ceva nu a functionat la incarcarea acestei pagini.",
    navBadgeSoon: "In curand",
    navBadgeBeta: "Beta",
    uiExtensionLoadingDescription: "Se incarca extensia…",
    uiExtensionLoadFailedDescription: "Aceasta extensie nu a putut fi incarcata si a fost omisa.",
    uiExtensionIncompatibleDescription:
      "Aceasta extensie este incompatibila cu aceasta versiune de admin (necesita {requiredVersion}, adminul ofera {providedVersion}).",
  },
} satisfies LocaleMessageDefinitions<AdminChromeMessages>

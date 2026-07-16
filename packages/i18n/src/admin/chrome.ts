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
  },
} satisfies LocaleMessageDefinitions<AdminChromeMessages>

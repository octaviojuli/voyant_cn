"use client"

import { NotificationSettingsForm } from "../components/notification-settings-form.js"
import { useNotificationsUiMessagesOrDefault } from "../i18n/index.js"

/**
 * Packaged admin host for the tenant-wide notification settings page
 * (packaged-admin RFC Phase 3). Zero-prop: the settings form owns its data
 * wiring through `@voyant-travel/notifications-react`.
 */
export function NotificationSettingsHost() {
  const messages = useNotificationsUiMessagesOrDefault()
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{messages.settings.heading}</h1>
        <p className="text-sm text-muted-foreground">{messages.settings.description}</p>
      </div>
      <NotificationSettingsForm />
    </div>
  )
}

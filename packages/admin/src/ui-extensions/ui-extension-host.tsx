"use client"

import {
  ADMIN_UI_EXTENSION_API_VERSION,
  capUiExtensionToastMessage,
  clampUiExtensionHeight,
  createContextMessage,
  createErrorMessage,
  createInitMessage,
  isNavigateMessage,
  isReadyMessage,
  isRequestTokenMessage,
  isResizeMessage,
  isToastMessage,
  type UiExtensionContext,
  type UiExtensionDescriptor,
  type UiExtensionToastIntent,
} from "@voyant-travel/admin-extension-sdk"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@voyant-travel/ui/components/card"
import { Skeleton } from "@voyant-travel/ui/components/skeleton"
import { cn } from "@voyant-travel/ui/lib/utils"
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import { formatMessage } from "../lib/i18n.js"
import { useOptionalOperatorAdminMessages } from "../providers/operator-admin-messages.js"
import { isUiExtensionCompatible } from "./compat.js"

/** Sandbox tokens the frame is allowed — never `allow-same-origin`. */
const UI_EXTENSION_SANDBOX = "allow-scripts allow-forms allow-popups"
/** Handshake budget before the host degrades to an error card. */
const UI_EXTENSION_HANDSHAKE_TIMEOUT_MS = 10_000
/** Height the frame reserves while loading so a lazy iframe still fetches. */
const UI_EXTENSION_LOADING_HEIGHT = 96

export interface UiExtensionHostProps {
  descriptor: UiExtensionDescriptor
  slot: string
  context: UiExtensionContext
  /** Invoked when the extension requests navigation to a relative admin path. */
  onNavigate?: (to: string) => void
  /** Invoked when the extension raises a toast (message already length-capped). */
  onToast?: (intent: UiExtensionToastIntent, message: string) => void
  className?: string
  /** Handshake timeout override, primarily for tests. */
  timeoutMs?: number
}

/**
 * Whether `to` is a relative admin path safe to navigate to. Rejects absolute
 * URLs, protocol-relative (`//host`), scheme-bearing, and backslash paths so a
 * hostile frame cannot redirect the operator off the admin.
 */
function isRelativeAdminPath(to: unknown): to is string {
  if (typeof to !== "string" || to.length === 0) return false
  if (!to.startsWith("/")) return false
  if (to.startsWith("//")) return false
  if (to.includes("\\")) return false
  if (to.includes("://")) return false
  return true
}

function UiExtensionStateCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  )
}

function UiExtensionLoadingCard({ displayName }: { displayName: string }) {
  // Optional: state cards may render outside the operator admin messages
  // provider (e.g. standalone hosts/tests) — fall back to English copy there.
  const messages = useOptionalOperatorAdminMessages()

  return (
    <UiExtensionStateCard
      title={displayName}
      description={messages?.uiExtensionLoadingDescription ?? "Loading extension…"}
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </UiExtensionStateCard>
  )
}

function UiExtensionErrorCard({ displayName }: { displayName: string }) {
  const messages = useOptionalOperatorAdminMessages()

  return (
    <UiExtensionStateCard
      title={displayName}
      description={
        messages?.uiExtensionLoadFailedDescription ??
        "This extension could not be loaded and was skipped."
      }
      className="border-destructive/40"
    />
  )
}

function UiExtensionIncompatibleCard({ descriptor }: { descriptor: UiExtensionDescriptor }) {
  const messages = useOptionalOperatorAdminMessages()

  return (
    <UiExtensionStateCard
      title={descriptor.displayName}
      description={formatMessage(
        messages?.uiExtensionIncompatibleDescription ??
          "This extension is incompatible with this admin version (requires {requiredVersion}, admin provides {providedVersion}).",
        {
          requiredVersion: descriptor.extensionApi,
          providedVersion: ADMIN_UI_EXTENSION_API_VERSION,
        },
      )}
    />
  )
}

type FrameStatus = "loading" | "ready" | "error"

function UiExtensionFrame({
  descriptor,
  slot,
  context,
  onNavigate,
  onToast,
  className,
  timeoutMs = UI_EXTENSION_HANDSHAKE_TIMEOUT_MS,
}: UiExtensionHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<FrameStatus>("loading")
  const [height, setHeight] = useState<number>()

  // Keep the latest context/handlers/config available to the message listener
  // without re-subscribing it on every render.
  const contextRef = useRef(context)
  contextRef.current = context
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const onToastRef = useRef(onToast)
  onToastRef.current = onToast
  const configRef = useRef(descriptor.config)
  configRef.current = descriptor.config

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional -- owner: admin; descriptor.entryUrl re-runs the handshake when the frame source changes, and context/handlers/config are read via refs so they don't re-fire it
  useEffect(() => {
    let ready = false
    setStatus("loading")
    setHeight(undefined)

    const timer = window.setTimeout(() => {
      if (!ready) setStatus("error")
    }, timeoutMs)

    function handleMessage(event: MessageEvent) {
      const frame = iframeRef.current
      const source = frame?.contentWindow
      if (!source || event.source !== source) return

      if (isReadyMessage(event.data)) {
        ready = true
        window.clearTimeout(timer)
        setStatus("ready")
        source.postMessage(
          createInitMessage({
            apiVersion: ADMIN_UI_EXTENSION_API_VERSION,
            slot,
            context: contextRef.current,
            config: configRef.current ?? {},
          }),
          "*",
        )
        return
      }
      if (isResizeMessage(event.data)) {
        setHeight(clampUiExtensionHeight(event.data.payload.height))
        return
      }
      if (isNavigateMessage(event.data)) {
        const { to } = event.data.payload
        if (isRelativeAdminPath(to)) onNavigateRef.current?.(to)
        return
      }
      if (isToastMessage(event.data)) {
        onToastRef.current?.(
          event.data.payload.intent,
          capUiExtensionToastMessage(event.data.payload.message),
        )
        return
      }
      if (isRequestTokenMessage(event.data)) {
        source.postMessage(createErrorMessage("not-supported"), "*")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("message", handleMessage)
    }
  }, [slot, timeoutMs, descriptor.entryUrl])

  // Forward context updates once the handshake has completed.
  useEffect(() => {
    if (status !== "ready") return
    iframeRef.current?.contentWindow?.postMessage(createContextMessage(context), "*")
  }, [context, status])

  if (status === "error") {
    return <UiExtensionErrorCard displayName={descriptor.displayName} />
  }

  // The frame stays laid out (not `sr-only`) while loading — a hidden,
  // zero-area `loading="lazy"` iframe would never fetch and so never complete
  // the handshake. The loading card is overlaid until the frame is ready.
  return (
    <div className={cn("relative w-full", className)} data-slot="ui-extension-host">
      <iframe
        ref={iframeRef}
        src={descriptor.entryUrl}
        title={descriptor.displayName}
        sandbox={UI_EXTENSION_SANDBOX}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="block w-full border-0"
        style={{ height: status === "ready" ? (height ?? 0) : UI_EXTENSION_LOADING_HEIGHT }}
      />
      {status === "loading" ? (
        <div className="absolute inset-0" data-slot="ui-extension-loading">
          <UiExtensionLoadingCard displayName={descriptor.displayName} />
        </div>
      ) : null}
    </div>
  )
}

class UiExtensionErrorBoundary extends Component<
  { displayName: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn("[voyant-admin] UI extension host crashed", error)
  }

  render() {
    if (this.state.failed) {
      return <UiExtensionErrorCard displayName={this.props.displayName} />
    }
    return this.props.children
  }
}

/**
 * Host side of the admin UI-extension protocol.
 *
 * Renders a descriptor into a sandboxed iframe, performs the `postMessage`
 * handshake, and mediates the extension's small action surface
 * (navigate/toast/resize). A render-time compatibility check is authoritative:
 * an incompatible descriptor renders a quiet card and never mounts the frame.
 * The whole host is wrapped in an error boundary so a failed or slow extension
 * can never break the surrounding admin.
 */
export function UiExtensionHost(props: UiExtensionHostProps) {
  const compatible = useMemo(
    () => isUiExtensionCompatible(props.descriptor.extensionApi),
    [props.descriptor.extensionApi],
  )

  if (!compatible) {
    return <UiExtensionIncompatibleCard descriptor={props.descriptor} />
  }

  return (
    <UiExtensionErrorBoundary displayName={props.descriptor.displayName}>
      <UiExtensionFrame {...props} />
    </UiExtensionErrorBoundary>
  )
}

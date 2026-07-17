"use client"

import { cn, Separator, SidebarTrigger } from "@voyant-travel/ui/components"
import type * as React from "react"

import { useOptionalOperatorAdminMessages } from "../providers/operator-admin-messages.js"

export interface OperatorAdminPageShellProps {
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  headerClassName?: string
  padded?: boolean
  showSidebarTrigger?: boolean
}

export function OperatorAdminPageShell({
  actions,
  breadcrumbs,
  children,
  className,
  contentClassName,
  headerClassName,
  padded = true,
  showSidebarTrigger = true,
}: OperatorAdminPageShellProps) {
  // Optional: the page shell is exported standalone and may render outside
  // the operator admin messages provider — fall back to English copy there.
  const messages = useOptionalOperatorAdminMessages()

  return (
    <div
      data-slot="operator-admin-page-shell"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <header
        data-slot="operator-admin-page-shell-header"
        className={cn(
          "sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur transition-[width,height] ease-linear supports-[backdrop-filter]:bg-background/80 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12",
          headerClassName,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {showSidebarTrigger ? (
            <SidebarTrigger
              className="-ml-1"
              title={messages?.toggleSidebarShortcutTitle ?? "Toggle sidebar (Cmd/Ctrl+B)"}
              aria-label={messages?.toggleSidebar ?? "Toggle sidebar"}
            />
          ) : null}
          {breadcrumbs ? (
            <>
              {showSidebarTrigger ? (
                <Separator orientation="vertical" className="mr-2 h-4" />
              ) : null}
              <div className="min-w-0 flex-1">{breadcrumbs}</div>
            </>
          ) : null}
        </div>
        {actions ? (
          <div
            className="flex shrink-0 items-center gap-2"
            data-slot="operator-admin-page-shell-actions"
          >
            {actions}
          </div>
        ) : null}
      </header>
      <div
        data-slot="operator-admin-page-shell-content"
        className={cn(padded && "px-4 py-6 md:px-6", contentClassName)}
      >
        {children}
      </div>
    </div>
  )
}

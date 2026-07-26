"use client"

import {
  cn,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@voyant-travel/ui/components"
import { Settings as DefaultSettingsIcon } from "lucide-react"
import type * as React from "react"

import type { AdminExtension } from "../extensions.js"
import {
  createOperatorAdminNavigation,
  type OperatorAdminNavigationIcons,
  resolveOperatorAdminNavigation,
} from "../navigation/operator-navigation.js"
import type { AdminNavigationPreferences } from "../navigation/preferences.js"
import { AdminExtensionsProvider } from "../providers/admin-extensions.js"
import { useOperatorAdminMessages } from "../providers/operator-admin-messages.js"
import type { AdminUser, NavItem, NavSubItem } from "../types.js"
import {
  AdminBreadcrumbsProvider,
  AdminBreadcrumbsTrail,
  useAdminBreadcrumbsValue,
} from "./admin-breadcrumbs.js"
import { AdminNavGroup } from "./admin-nav-group.js"
import { type AdminNavLinkComponent, DefaultAdminNavLink } from "./admin-nav-link.js"
import { type AdminPageHeadOptions, AdminPageHeadProvider } from "./admin-page-head.js"
import { VoyantMark } from "./brand/voyant-mark.js"
import { VoyantWordmark } from "./brand/voyant-wordmark.js"
import { OperatorAdminUserMenu } from "./operator-admin-user-menu.js"

export interface OperatorAdminSidebarProps
  extends Omit<React.ComponentProps<typeof Sidebar>, "children"> {
  accountHref?: string
  brand?: React.ReactNode
  currentPath: string
  extensions?: ReadonlyArray<AdminExtension>
  icons?: OperatorAdminNavigationIcons
  linkComponent?: AdminNavLinkComponent
  navItems?: ReadonlyArray<NavItem>
  navigationPreferences?: AdminNavigationPreferences
  onSignOut?: () => void | Promise<void>
  user?: AdminUser | null
}

export interface DefaultOperatorAdminBrandProps {
  href?: string
  linkComponent?: AdminNavLinkComponent
}

export function DefaultOperatorAdminBrand({
  href = "/",
  linkComponent: LinkComponent = DefaultAdminNavLink,
}: DefaultOperatorAdminBrandProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Voyant"
          size="lg"
          className="gap-2 text-foreground group-data-[collapsible=icon]:justify-center"
        >
          <LinkComponent href={href} target="_self" aria-label="Voyant">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
              <VoyantMark aria-hidden="true" className="size-4!" />
            </span>
            <VoyantWordmark
              aria-hidden="true"
              className="h-[1.125rem]! w-auto! group-data-[collapsible=icon]:hidden!"
            />
          </LinkComponent>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function OperatorAdminSidebar({
  accountHref,
  brand,
  currentPath,
  extensions,
  icons,
  linkComponent,
  navItems,
  navigationPreferences,
  onSignOut,
  user,
  variant = "inset",
  ...props
}: OperatorAdminSidebarProps) {
  const messages = useOperatorAdminMessages()
  const baseItems = navItems ?? createOperatorAdminNavigation({ icons, messages: messages.nav })
  const resolvedItems = resolveOperatorAdminNavigation({
    baseItems,
    extensions,
    preferences: navigationPreferences,
  })
  const resolvedBrand = brand ?? <DefaultOperatorAdminBrand linkComponent={linkComponent} />
  const LinkComponent = linkComponent ?? DefaultAdminNavLink
  const SettingsIcon = icons?.settings ?? DefaultSettingsIcon
  const settingsActive = navUrlMatchesPath("/settings", currentPath)

  return (
    <Sidebar collapsible="icon" variant={variant} {...props}>
      <SidebarHeader>{resolvedBrand}</SidebarHeader>
      <SidebarContent>
        <AdminNavGroup
          currentPath={currentPath}
          items={resolvedItems}
          linkComponent={linkComponent}
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={settingsActive} tooltip={messages.nav.settings}>
              <LinkComponent href="/settings">
                <SettingsIcon />
                <span>{messages.nav.settings}</span>
              </LinkComponent>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && (
          <OperatorAdminUserMenu
            accountHref={accountHref}
            linkComponent={linkComponent}
            onSignOut={onSignOut}
            user={user}
          />
        )}
      </SidebarFooter>
      <SidebarRail messages={{ toggleSidebar: messages.toggleSidebar }} />
    </Sidebar>
  )
}

export interface OperatorAdminWorkspaceLayoutProps {
  accountHref?: string
  brand?: React.ReactNode
  children: React.ReactNode
  currentPath: string
  defaultOpen?: React.ComponentProps<typeof SidebarProvider>["defaultOpen"]
  extensions?: ReadonlyArray<AdminExtension>
  headerClassName?: string
  /**
   * Left slot of the inset header (after the sidebar trigger). When
   * omitted, a default breadcrumb showing the resolved page title is
   * rendered automatically.
   */
  headerSlot?: React.ReactNode
  /** Right slot of the inset header — meant for page actions. */
  headerSlotRight?: React.ReactNode
  icons?: OperatorAdminNavigationIcons
  linkComponent?: AdminNavLinkComponent
  mainClassName?: string
  navItems?: ReadonlyArray<NavItem>
  navigationPreferences?: AdminNavigationPreferences
  onSignOut?: () => void | Promise<void>
  pageHead?: (AdminPageHeadOptions & { titleOverride?: string | null }) | false
  side?: React.ComponentProps<typeof Sidebar>["side"]
  sidebarProps?: Omit<OperatorAdminSidebarProps, "currentPath">
  showSidebarTrigger?: boolean
  user?: AdminUser | null
  variant?: React.ComponentProps<typeof Sidebar>["variant"]
}

function normalizePath(path: string): string {
  const withoutHash = path.split("#")[0] ?? ""
  const withoutSearch = withoutHash.split("?")[0] ?? ""
  const normalized = withoutSearch.replace(/\/+$/, "")

  return normalized || "/"
}

function navUrlMatchesPath(navUrl: string, currentPath: string): boolean {
  const normalizedUrl = normalizePath(navUrl)
  const normalizedPath = normalizePath(currentPath)

  if (normalizedUrl === "/") {
    return normalizedPath === "/"
  }

  return normalizedPath === normalizedUrl || normalizedPath.startsWith(`${normalizedUrl}/`)
}

export function resolveAdminPageTitle(
  currentPath: string,
  navItems: ReadonlyArray<NavItem>,
): string | null {
  let matchedTitle: string | null = null
  let matchedUrlLength = -1
  const visitItem = (item: NavItem | NavSubItem) => {
    if (navUrlMatchesPath(item.url, currentPath)) {
      const urlLength = normalizePath(item.url).length
      if (urlLength >= matchedUrlLength) {
        matchedTitle = item.title
        matchedUrlLength = urlLength
      }
    }

    if ("items" in item) {
      item.items?.forEach(visitItem)
    }
  }

  navItems.forEach(visitItem)

  return matchedTitle
}

export function OperatorAdminWorkspaceLayout({
  accountHref,
  brand,
  children,
  currentPath,
  defaultOpen,
  extensions,
  headerClassName,
  headerSlot,
  headerSlotRight,
  icons,
  linkComponent,
  mainClassName = "flex-1",
  navItems,
  navigationPreferences,
  onSignOut,
  pageHead,
  side,
  sidebarProps,
  showSidebarTrigger = true,
  user,
  variant,
}: OperatorAdminWorkspaceLayoutProps) {
  const messages = useOperatorAdminMessages()
  const {
    extensions: sidebarExtensions,
    navItems: sidebarNavItems,
    side: sidebarSide,
    ...restSidebarProps
  } = sidebarProps ?? {}
  const baseItems =
    sidebarNavItems ?? navItems ?? createOperatorAdminNavigation({ icons, messages: messages.nav })
  const resolvedItems = resolveOperatorAdminNavigation({
    baseItems,
    extensions: sidebarExtensions ?? extensions,
    preferences: navigationPreferences,
  })
  const resolvedSide = sidebarSide ?? side
  let pageTitle: string | null = null
  if (pageHead !== false) {
    if (pageHead?.titleOverride !== undefined) {
      pageTitle = pageHead.titleOverride
    } else if (pageHead?.title !== undefined) {
      pageTitle = pageHead.title
    } else {
      pageTitle = resolveAdminPageTitle(currentPath, resolvedItems)
    }
  }
  const pageHeadBase =
    pageHead === false
      ? null
      : {
          brand: pageHead?.brand ?? "Voyant",
          description: pageHead?.description ?? null,
          title: pageTitle,
        }
  const sidebar = (
    <OperatorAdminSidebar
      accountHref={accountHref}
      brand={brand}
      currentPath={currentPath}
      extensions={undefined}
      icons={icons}
      linkComponent={linkComponent}
      navItems={resolvedItems}
      onSignOut={onSignOut}
      side={resolvedSide}
      user={user}
      variant={variant}
      {...restSidebarProps}
    />
  )
  const headerHasContent = showSidebarTrigger || headerSlot !== undefined || pageTitle != null
  const hasHeader = headerHasContent || headerSlotRight != null
  const inset = (
    <SidebarInset className={mainClassName}>
      {hasHeader && (
        <header
          className={cn(
            "flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12",
            headerClassName,
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {showSidebarTrigger && (
              <SidebarTrigger
                className="-ml-1"
                title={messages.toggleSidebarShortcutTitle}
                aria-label={messages.toggleSidebar}
                messages={{ toggleSidebar: messages.toggleSidebar }}
              />
            )}
            {headerSlot !== undefined ? (
              headerSlot
            ) : (
              <DefaultHeaderBreadcrumb linkComponent={linkComponent} pageTitle={pageTitle} />
            )}
          </div>
          {headerSlotRight && (
            <div className="flex shrink-0 items-center gap-2">{headerSlotRight}</div>
          )}
        </header>
      )}
      {children}
    </SidebarInset>
  )
  const workspace =
    resolvedSide === "right" ? (
      <>
        {inset}
        {sidebar}
      </>
    ) : (
      <>
        {sidebar}
        {inset}
      </>
    )

  return (
    <AdminExtensionsProvider extensions={extensions}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminBreadcrumbsProvider>
          {pageHead === false ? (
            workspace
          ) : (
            <AdminPageHeadProvider baseHead={pageHeadBase}>{workspace}</AdminPageHeadProvider>
          )}
        </AdminBreadcrumbsProvider>
      </SidebarProvider>
    </AdminExtensionsProvider>
  )
}

function DefaultHeaderBreadcrumb({
  linkComponent,
  pageTitle,
}: {
  linkComponent?: AdminNavLinkComponent
  pageTitle: string | null
}) {
  const segments = useAdminBreadcrumbsValue()
  if (segments.length > 0) {
    return <AdminBreadcrumbsTrail linkComponent={linkComponent} segments={segments} />
  }
  if (pageTitle == null) return null
  return <AdminBreadcrumbsTrail linkComponent={linkComponent} segments={[{ label: pageTitle }]} />
}

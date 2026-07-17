"use client"

import {
  Badge,
  cn,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@voyant-travel/ui/components"
import * as React from "react"

import { useOptionalOperatorAdminMessages } from "../providers/operator-admin-messages.js"
import { type BETA, COMING_SOON, type NavItem } from "../types.js"
import { type AdminNavLinkComponent, DefaultAdminNavLink } from "./admin-nav-link.js"

export interface AdminNavGroupProps {
  className?: string
  currentPath: string
  items: ReadonlyArray<NavItem>
  label?: string
  linkComponent?: AdminNavLinkComponent
}

function isExternalUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://")
}

function isActivePath(currentPath: string, url: string) {
  if (url === "/") {
    return currentPath === "/"
  }

  if (currentPath.startsWith(url)) {
    const nextChar = currentPath.charAt(url.length)
    return nextChar === "/" || nextChar === "" || currentPath === url
  }

  return false
}

function renderBadge(
  status: typeof COMING_SOON | typeof BETA | undefined,
  labels: { soon: string; beta: string },
) {
  if (!status) return null

  if (status === COMING_SOON) {
    return (
      <Badge variant="outline" className="ml-auto text-xs">
        {labels.soon}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="ml-auto text-xs">
      {labels.beta}
    </Badge>
  )
}

export function AdminNavGroup({
  className,
  currentPath,
  items,
  label,
  linkComponent: LinkComponent = DefaultAdminNavLink,
}: AdminNavGroupProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  // Optional: the nav group is exported standalone and may render outside
  // the operator admin messages provider — fall back to English copy there.
  const messages = useOptionalOperatorAdminMessages()
  const badgeLabels = {
    soon: messages?.navBadgeSoon ?? "Soon",
    beta: messages?.navBadgeBeta ?? "Beta",
  }

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup className={className}>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const key = item.id
          const icon = item.icon ? React.createElement(item.icon, { className: "h-4 w-4" }) : null

          if (item.items?.length) {
            const parentActive = isActivePath(currentPath, item.url)
            const anyChildActive = item.items.some((sub) => isActivePath(currentPath, sub.url))
            const expanded = item.structural || parentActive || anyChildActive

            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  asChild={!item.structural}
                  tooltip={item.title}
                  isActive={!item.structural && parentActive}
                >
                  {item.structural ? (
                    <span>
                      {icon}
                      <span>{item.title}</span>
                      {renderBadge(item.status, badgeLabels)}
                    </span>
                  ) : (
                    <LinkComponent
                      href={item.url}
                      onClick={handleLinkClick}
                      target={item.target ?? "_self"}
                    >
                      {icon}
                      <span>{item.title}</span>
                      {renderBadge(item.status, badgeLabels)}
                    </LinkComponent>
                  )}
                </SidebarMenuButton>
                {expanded && (
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.id}>
                        {subItem.status === COMING_SOON ? (
                          <SidebarMenuSubButton
                            className={cn(subItem.status === COMING_SOON && "opacity-50")}
                          >
                            <span>{subItem.title}</span>
                            {renderBadge(subItem.status, badgeLabels)}
                          </SidebarMenuSubButton>
                        ) : (
                          <SidebarMenuSubButton
                            asChild
                            isActive={
                              !isExternalUrl(subItem.url) && isActivePath(currentPath, subItem.url)
                            }
                          >
                            <LinkComponent
                              href={subItem.url}
                              onClick={handleLinkClick}
                              target={subItem.target ?? "_self"}
                            >
                              <span>{subItem.title}</span>
                              {renderBadge(subItem.status, badgeLabels)}
                            </LinkComponent>
                          </SidebarMenuSubButton>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )
          }

          if (item.status === COMING_SOON) {
            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton tooltip={item.title} disabled>
                  {icon}
                  <span>{item.title}</span>
                  {renderBadge(item.status, badgeLabels)}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={!isExternalUrl(item.url) && isActivePath(currentPath, item.url)}
              >
                <LinkComponent
                  href={item.url}
                  onClick={handleLinkClick}
                  target={item.target ?? "_self"}
                >
                  {icon}
                  <span>{item.title}</span>
                  {renderBadge(item.status, badgeLabels)}
                </LinkComponent>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@voyant-travel/ui/components"
import { BadgeCheck, Check, ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react"

import { getDisplayName, getInitials } from "../lib/initials.js"
import { useLocale } from "../providers/locale.js"
import { useOperatorAdminMessages } from "../providers/operator-admin-messages.js"
import { useTheme } from "../providers/theme.js"
import type { AdminUser } from "../types.js"
import { type AdminNavLinkComponent, DefaultAdminNavLink } from "./admin-nav-link.js"

export interface OperatorAdminUserMenuProps {
  accountHref?: string
  linkComponent?: AdminNavLinkComponent
  onSignOut?: () => void | Promise<void>
  user: AdminUser
}

export function OperatorAdminUserMenu({
  accountHref = "/account",
  linkComponent: LinkComponent = DefaultAdminNavLink,
  onSignOut,
  user,
}: OperatorAdminUserMenuProps) {
  const { isMobile } = useSidebar()
  const { setTheme, theme, resolvedTheme } = useTheme()
  const { setLocale, resolvedLocale } = useLocale()
  const messages = useOperatorAdminMessages()

  const displayName = getDisplayName(user)
  const initials = getInitials(user.firstName, user.lastName, user.email)
  const showEmailSeparately = Boolean(user.email && displayName !== user.email)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="border border-transparent aria-expanded:border-sidebar-border aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-sm after:rounded-sm">
                <AvatarImage
                  src={user.avatar ?? undefined}
                  alt={displayName}
                  className="rounded-sm"
                />
                <AvatarFallback className="rounded-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {showEmailSeparately && <span className="truncate text-xs">{user.email}</span>}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-sm"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-sm after:rounded-sm">
                  <AvatarImage
                    src={user.avatar ?? undefined}
                    alt={displayName}
                    className="rounded-sm"
                  />
                  <AvatarFallback className="rounded-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {showEmailSeparately && <span className="truncate text-xs">{user.email}</span>}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <LinkComponent href={accountHref}>
                  <BadgeCheck />
                  {messages.account}
                </LinkComponent>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4" />
                {messages.light}
                {(theme === "light" || (theme === "system" && resolvedTheme === "light")) && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4" />
                {messages.dark}
                {(theme === "dark" || (theme === "system" && resolvedTheme === "dark")) && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>{messages.language}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("en")}>
                {messages.english}
                {resolvedLocale === "en" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("ro")}>
                {messages.romanian}
                {resolvedLocale === "ro" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("zh")}>
                {messages.chinese}
                {resolvedLocale === "zh" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void onSignOut?.()}>
              <LogOut />
              {messages.logOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

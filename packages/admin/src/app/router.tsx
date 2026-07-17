import { type DehydratedState, dehydrate, hydrate, QueryClient } from "@tanstack/react-query"
import { type AnyRoute, createRouter as createTanStackRouter, Link } from "@tanstack/react-router"
import { buttonVariants } from "@voyant-travel/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@voyant-travel/ui/components/empty"
import { Loader2, SearchX } from "lucide-react"
import type { ReactNode } from "react"

import { useOptionalOperatorAdminMessages } from "../providers/operator-admin-messages.js"

export interface AdminRouterContext {
  queryClient: QueryClient
}

/**
 * QueryClient with the admin defaults: no focus refetch, one retry, and a
 * 30s staleTime that keeps hover-preloaded data fresh long enough for the
 * hover→click navigation to reuse it. Override per-query for hotter data.
 */
export function createAdminQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30_000,
      },
    },
  })
}

export interface CreateAdminRouterOptions<TRouteTree extends AnyRoute> {
  routeTree: TRouteTree
  queryClient?: QueryClient
  pendingComponent?: () => ReactNode
  notFoundComponent?: () => ReactNode
}

/**
 * The admin router factory: TanStack Router wired with the Voyant defaults —
 * intent preloading with a preload staleTime matching the QueryClient (without
 * it, hover-prefetch considers data immediately stale and re-fires the loader
 * on click), scroll restoration, a default not-found page, and QueryClient
 * SSR dehydrate/hydrate so loader-prefetched queries survive the
 * server→client boundary on routes that opt into SSR.
 */
export function createAdminRouter<TRouteTree extends AnyRoute>({
  routeTree,
  queryClient = createAdminQueryClient(),
  pendingComponent = AdminPendingFallback,
  notFoundComponent = AdminNotFound,
}: CreateAdminRouterOptions<TRouteTree>) {
  return createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultPendingComponent: pendingComponent,
    defaultNotFoundComponent: notFoundComponent,
    // Cast around Router's ValidateSerializableInput, which is stricter than
    // DehydratedState's recursive `unknown` slots. Runtime payload is
    // JSON-safe; the official @tanstack/react-router-with-query helper does
    // the same erasure.
    dehydrate: () => ({ queryClient: dehydrate(queryClient) as object }),
    hydrate: (state: { queryClient: object }) => {
      hydrate(queryClient, state.queryClient as DehydratedState)
    },
  })
}

export function AdminPendingFallback() {
  // Optional: router-level fallbacks can render before the workspace mounts
  // the operator admin messages provider — fall back to English copy there.
  const messages = useOptionalOperatorAdminMessages()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div
        className="flex flex-col items-center gap-4 text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label={messages?.loadingWorkspaceAriaLabel ?? "Loading admin workspace"}
      >
        <Loader2 className="size-8 animate-spin" aria-hidden="true" />
        <span className="text-sm">{messages?.loadingWorkspace ?? "Loading workspace"}</span>
      </div>
    </div>
  )
}

export function AdminNotFound() {
  // Optional: router-level fallbacks can render before the workspace mounts
  // the operator admin messages provider — fall back to English copy there.
  const messages = useOptionalOperatorAdminMessages()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Empty className="max-w-xl border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>{messages?.notFoundTitle ?? "Page not found"}</EmptyTitle>
          <EmptyDescription>
            {messages?.notFoundDescription ??
              "The page you requested does not exist or is no longer available."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/" className={buttonVariants({ variant: "default" })}>
            {messages?.goToDashboard ?? "Go to dashboard"}
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  )
}

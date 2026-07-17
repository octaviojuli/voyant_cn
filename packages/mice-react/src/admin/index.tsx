import {
  type AdminExtension,
  type AdminRouteLoaderContext,
  type AdminRouteRuntime,
  adminRoutePageModule,
  defineAdminExtension,
  type NavItem,
  type SelectedAdminExtensionFactoryContext,
  withAdminRouteMessagesProvider,
} from "@voyant-travel/admin"
// Lean static only: the shared fetcher fallback. The page-data helpers resolve
// via dynamic import inside the loaders so the REST query options stay out of
// the workspace-chrome chunk that evaluates this factory.
import { defaultFetcher } from "@voyant-travel/react"
import { CalendarRange } from "lucide-react"

/**
 * Semantic destinations the MICE admin surfaces navigate to (packaged-admin
 * RFC §4.7). The programs list opens a program's detail; the detail page links
 * back to the list — instead of importing a host route tree they resolve these
 * keys through `useAdminNavigate` from `@voyant-travel/admin`. Both are
 * route-backed (pure path interpolation), so the host's resolvers are
 * generated.
 */
declare module "@voyant-travel/admin" {
  interface AdminDestinations {
    /** The programs list (MICE landing) page. */
    "mice.program.list": Record<string, never>
    /** A program's detail page, where its cost sheet and sub-surfaces live. */
    "mice.program.detail": { programId: string }
  }
}

// Endgame rule (packaged-admin RFC §4.8): this barrel re-exports NO page or
// host component values — it is evaluated with the workspace chrome, so a
// static host re-export would pin the MICE page modules into the entry chunk.
// Hosts import from their specific modules; only the lightweight query keys
// re-export here.
export { miceQueryKeys } from "../query-keys.js"

export interface CreateMiceAdminExtensionOptions {
  /** Mount path of the MICE pages inside the admin workspace. Default `/mice`. */
  basePath?: string
  /** Localized nav/page labels. Defaults are the English operator nav labels. */
  labels?: {
    programs?: string
  }
  /** Nav icon — icon choice stays with the host (e.g. lucide `CalendarRange`). */
  icon?: NavItem["icon"]
}

/**
 * The MICE admin contribution (packaged-admin RFC Phase 3,
 * `@voyant-travel/<domain>-react/admin` convention).
 *
 * NAVIGATION: package-delivered. The Programs item is NOT part of the BASE
 * operator navigation (`createOperatorAdminNavigation` in
 * `@voyant-travel/admin`), so the extension contributes it — spliced directly
 * after Bookings via `insertAfter` because a group program is an
 * operationally-managed booking pipeline (rooms, function space, delegates).
 * The icon stays a host choice.
 *
 * ROUTES: two contributions carry the FULL route implementation — the programs
 * list (landing) at `basePath`, where operators see every group program, and a
 * program detail at `basePath/$id`, where that program's per-currency cost
 * sheet (and, in later phases, its sessions / delegates / rooming / RFPs) live.
 * Both pages keep their filter/state local (no URL search contract);
 * cross-route links resolve through the semantic destinations declared above.
 *
 * WIDGETS: none contributed and no slots exposed yet.
 */
export function createMiceAdminExtension(
  options: CreateMiceAdminExtensionOptions = {},
): AdminExtension {
  const { basePath = "/mice", labels = {}, icon } = options
  const { programs = "Programs" } = labels

  return defineAdminExtension({
    id: "mice",
    navigation: [
      {
        insertAfter: "bookings",
        items: [{ id: "mice-programs", title: programs, url: basePath, icon }],
      },
    ],
    routes: [
      {
        id: "mice-programs-index",
        path: basePath,
        title: programs,
        destination: "mice.program.list",
        ssr: "data-only",
        page: () =>
          import("./programs-host.js").then((module) =>
            adminRoutePageModule(module.MiceProgramsHost),
          ),
        // Dynamic import on purpose: the helper pulls the REST query options,
        // and a static import here would pin them into the workspace-chrome
        // chunk that evaluates this factory.
        loader: async ({ queryClient, runtime }: AdminRouteLoaderContext) => {
          const { getProgramsQueryOptions } = await import("../query-options.js")
          // Limit must match `ProgramsPage`'s `usePrograms` so the SSR-prefetched
          // cache entry hits the page's query key (the key carries its filters).
          return queryClient.ensureQueryData(
            getProgramsQueryOptions(loaderClient(runtime), { limit: 200 }),
          )
        },
      },
      {
        id: "mice-programs-detail",
        path: `${basePath}/$id`,
        title: programs,
        destination: "mice.program.detail",
        destinationParams: { id: "programId" },
        ssr: "data-only",
        page: () => import("./pages/program-detail-page.js"),
        loader: async ({ queryClient, runtime, params }: AdminRouteLoaderContext) => {
          const id = params.id
          if (!id) return
          const { getProgramQueryOptions } = await import("../query-options.js")
          return queryClient.ensureQueryData(getProgramQueryOptions(loaderClient(runtime), id))
        },
      },
    ],
  })
}

/** Selected-graph adapter owning the standard Operator copy key and icon. */
export function createSelectedMiceAdminExtension(
  { navMessages }: SelectedAdminExtensionFactoryContext = { navMessages: {} },
): AdminExtension {
  // Route-level copy provider: every MICE page renders inside the package's
  // messages context with the workspace shell's resolved locale, so the
  // `OrDefault` hooks pick up localized copy instead of the English fallback.
  return withAdminRouteMessagesProvider(
    createMiceAdminExtension({
      labels: { programs: navMessages.mice ?? "Programs" },
      icon: CalendarRange,
    }),
    () => import("../i18n/index.js").then((module) => ({ default: module.MiceUiMessagesProvider })),
  )
}

/**
 * Bridge the host-supplied {@link AdminRouteRuntime} (optional fetcher) to the
 * required-fetcher client contract the query options take — SSR loaders run
 * with the host runtime's cookie-forwarding fetcher.
 */
function loaderClient(runtime: AdminRouteRuntime) {
  return { baseUrl: runtime.baseUrl, fetcher: runtime.fetcher ?? defaultFetcher }
}

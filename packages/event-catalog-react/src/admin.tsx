import {
  type AdminExtension,
  adminRoutePageModule,
  defineAdminExtension,
  type SelectedAdminExtensionFactoryContext,
  withAdminRouteMessagesProvider,
} from "@voyant-travel/admin"
import { BookOpenText } from "lucide-react"

export interface CreateEventCatalogAdminExtensionOptions {
  path?: string
  title?: string
  order?: number
}

/** Package-owned admin reference for the canonical selected-graph catalog. */
export function createEventCatalogAdminExtension(
  options: CreateEventCatalogAdminExtensionOptions = {},
): AdminExtension {
  const path = options.path ?? "/docs/events"
  // i18n-literal-ok: contractual plain-English route/nav title fallback for the host-supplied option
  const title = options.title ?? "Event catalog"

  return withAdminRouteMessagesProvider(
    defineAdminExtension({
      id: "event-catalog",
      navigation: [
        {
          order: options.order ?? 180,
          items: [{ id: "event-catalog", title, url: path, icon: BookOpenText }],
        },
      ],
      routes: [
        {
          id: "event-catalog-index",
          path,
          title,
          ssr: false,
          page: () =>
            import("./event-catalog-page.js").then((module) =>
              adminRoutePageModule(module.EventCatalogPage),
            ),
        },
      ],
    }),
    () =>
      import("./i18n.js").then((module) => ({
        default: module.EventCatalogUiMessagesProvider,
      })),
  )
}

/** Selected-graph adapter for the standard Operator distribution. */
export function createSelectedEventCatalogAdminExtension({
  navMessages,
}: SelectedAdminExtensionFactoryContext): AdminExtension {
  return createEventCatalogAdminExtension({
    title: navMessages.eventCatalog ?? "Event catalog",
  })
}

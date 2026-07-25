import type { LocaleMessageDefinitions } from "../runtime.js"

export type OperatorAdminNavMessages = {
  dashboard: string
  catalog: string
  catalogProducts: string
  catalogProductsTagline: string
  catalogExcursions: string
  catalogExcursionsTagline: string
  catalogTours: string
  catalogToursTagline: string
  catalogCruises: string
  catalogCharters: string
  catalogAccommodations: string
  catalogOrders: string
  flights: string
  flightsSearch: string
  flightOrders: string
  products: string
  categories: string
  bookings: string
  trips: string
  allTrips: string
  newTrip: string
  notifications: string
  notificationTemplates: string
  notificationReminderRules: string
  notificationDeliveries: string
  notificationReminderRuns: string
  notificationSettings: string
  notificationPreview: string
  suppliers: string
  people: string
  organizations: string
  availability: string
  resources: string
  finance: string
  invoices: string
  invoiceNumberSeries: string
  payments: string
  supplierInvoices: string
  profitability: string
  legal: string
  contracts: string
  contractTemplates: string
  policies: string
  contractNumberSeries: string
  settings: string
  channelSync: string
  promotions: string
  quotes: string
  mice: string
  actionLedger: string
  eventCatalog: string
  setup: string
}

export const operatorAdminNavMessages = {
  en: {
    nav: {
      dashboard: "Dashboard",
      catalog: "Catalog",
      catalogProducts: "Packages",
      catalogProductsTagline: "Search flight + hotel packages and book live offers.",
      catalogExcursions: "Excursions",
      catalogExcursionsTagline: "Single-day trips with fixed departures.",
      catalogTours: "Tours",
      catalogToursTagline: "Multi-day circuits with fixed departures.",
      catalogCruises: "Cruises",
      catalogCharters: "Charters",
      catalogAccommodations: "Accommodations",
      catalogOrders: "Orders",
      flights: "Flights",
      flightsSearch: "Search",
      flightOrders: "Orders",
      products: "Products",
      categories: "Categories",
      bookings: "Bookings",
      trips: "Trips",
      allTrips: "All trips",
      newTrip: "New trip",
      notifications: "Notifications",
      notificationTemplates: "Templates",
      notificationReminderRules: "Reminder Rules",
      notificationDeliveries: "Deliveries",
      notificationReminderRuns: "Reminder Runs",
      notificationSettings: "Settings",
      notificationPreview: "Preview",
      suppliers: "Suppliers",
      people: "People",
      organizations: "Organizations",
      availability: "Availability",
      resources: "Resources",
      finance: "Finance",
      invoices: "Invoices",
      invoiceNumberSeries: "Number Series",
      payments: "Payments",
      supplierInvoices: "Supplier invoices",
      profitability: "Profitability",
      legal: "Legal",
      contracts: "Contracts",
      contractTemplates: "Contract Templates",
      policies: "Policies",
      contractNumberSeries: "Number Series",
      settings: "Settings",
      channelSync: "Distribution",
      promotions: "Promotions",
      quotes: "Quotes",
      mice: "Programs",
      actionLedger: "Logs",
      eventCatalog: "Event catalog",
      setup: "Setup",
    },
  },
  ro: {
    nav: {
      dashboard: "Panou",
      catalog: "Catalog",
      catalogProducts: "Pachete",
      catalogProductsTagline: "Caută pachete zbor + cazare și rezervă oferte live.",
      catalogExcursions: "Excursii",
      catalogExcursionsTagline: "Excursii de o zi cu plecări fixe.",
      catalogTours: "Circuite",
      catalogToursTagline: "Circuite de mai multe zile cu plecări fixe.",
      catalogCruises: "Croaziere",
      catalogCharters: "Chartere",
      catalogAccommodations: "Cazari",
      catalogOrders: "Comenzi",
      flights: "Zboruri",
      flightsSearch: "Căutare",
      flightOrders: "Comenzi",
      products: "Produse",
      categories: "Categorii",
      bookings: "Rezervari",
      trips: "Calatorii",
      allTrips: "Toate calatoriile",
      newTrip: "Calatorie noua",
      notifications: "Notificari",
      notificationTemplates: "Sabloane",
      notificationReminderRules: "Reguli reminder",
      notificationDeliveries: "Livrari",
      notificationReminderRuns: "Executii reminder",
      notificationSettings: "Setari",
      notificationPreview: "Previzualizare",
      suppliers: "Furnizori",
      people: "Persoane",
      organizations: "Organizatii",
      availability: "Disponibilitate",
      resources: "Resurse",
      finance: "Financiar",
      invoices: "Facturi",
      invoiceNumberSeries: "Serii numere",
      payments: "Plati",
      supplierInvoices: "Facturi furnizori",
      profitability: "Profitabilitate",
      legal: "Juridic",
      contracts: "Contracte",
      contractTemplates: "Sabloane contract",
      policies: "Politici",
      contractNumberSeries: "Serii numere",
      settings: "Setari",
      channelSync: "Distributie",
      promotions: "Promotii",
      quotes: "Oferte",
      mice: "Programe",
      actionLedger: "Jurnal actiuni",
      eventCatalog: "Catalog evenimente",
      setup: "Configurare",
    },
  },
} satisfies LocaleMessageDefinitions<{ nav: OperatorAdminNavMessages }>

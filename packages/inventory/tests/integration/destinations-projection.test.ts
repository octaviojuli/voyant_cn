import type { IndexerSlice } from "@voyant-travel/catalog"
import { type SQL, sql } from "drizzle-orm"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { productDestinationsCatalogPolicy } from "../../src/catalog-policy-destinations.js"
import {
  destinations,
  destinationTranslations,
  productDestinations,
} from "../../src/schema-taxonomy.js"
import {
  createProductDocumentBuilder,
  createProductsRegistry,
} from "../../src/service-catalog-plane.js"
import { createProductDestinationsProjectionExtension } from "../../src/service-catalog-plane-destinations.js"

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL

const enSlice: IndexerSlice = {
  vertical: "products",
  locale: "en-GB",
  audience: "customer",
  market: "default",
}

const itSlice: IndexerSlice = { ...enSlice, locale: "it-IT" }

describe.skipIf(!DB_AVAILABLE)("createProductDestinationsProjectionExtension", () => {
  // biome-ignore lint/suspicious/noExplicitAny: drizzle test client -- owner: products; existing suppression is intentional pending typed cleanup.
  let db: any
  let productId: string

  async function ensureProductsTable(client: { execute: (statement: SQL) => Promise<unknown> }) {
    // Minimal `products` schema sufficient for the document builder's row
    // fetch — we don't exercise the full product columns here.
    await client.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        description text,
        booking_mode text NOT NULL DEFAULT 'date',
        capacity_mode text NOT NULL DEFAULT 'limited',
        timezone text NOT NULL DEFAULT 'UTC',
        visibility text NOT NULL DEFAULT 'public',
        activated boolean NOT NULL DEFAULT true,
        status text NOT NULL DEFAULT 'active',
        reservation_timeout_minutes integer NOT NULL DEFAULT 30,
        sell_currency text NOT NULL DEFAULT 'EUR',
        sell_amount_cents integer,
        cost_amount_cents integer,
        margin_percent integer,
        facility_id text,
        product_type_id text,
        supplier_id text,
        start_date date,
        end_date date,
        pax integer,
        tags text[] NOT NULL DEFAULT '{}',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `)
  }

  async function ensureDestinationTables(client: {
    execute: (statement: SQL) => Promise<unknown>
  }) {
    const statements: SQL[] = [
      sql`CREATE TABLE IF NOT EXISTS destinations (
        id text PRIMARY KEY NOT NULL,
        parent_id text,
        slug text NOT NULL,
        code text,
        canonical_place_id text,
        destination_type text DEFAULT 'destination' NOT NULL,
        latitude double precision,
        longitude double precision,
        sort_order integer DEFAULT 0 NOT NULL,
        active boolean DEFAULT true NOT NULL,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )`,
      sql`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS canonical_place_id text`,
      sql`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS latitude double precision`,
      sql`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS longitude double precision`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS uidx_destinations_slug ON destinations (slug)`,
      sql`CREATE TABLE IF NOT EXISTS destination_translations (
        id text PRIMARY KEY NOT NULL,
        destination_id text NOT NULL,
        language_tag text NOT NULL,
        name text NOT NULL,
        description text,
        seo_title text,
        seo_description text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS uidx_destination_translations_locale
        ON destination_translations (destination_id, language_tag)`,
      sql`CREATE TABLE IF NOT EXISTS product_destinations (
        product_id text NOT NULL,
        destination_id text NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        PRIMARY KEY (product_id, destination_id)
      )`,
    ]
    for (const statement of statements) {
      await client.execute(statement)
    }
  }

  beforeAll(async () => {
    const { createTestDb } = await import("@voyant-travel/db/test-utils")
    db = createTestDb()
    await ensureProductsTable(db)
    await ensureDestinationTables(db)
  })

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE products, destinations, destination_translations, product_destinations CASCADE`,
    )

    productId = "prod_dest_test"
    // agent-quality: raw-sql reviewed -- owner: products; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
    await db.execute(sql`INSERT INTO products (id, name, sell_currency, status, activated, visibility)
      VALUES (${productId}, 'Italy Loop Tour', 'EUR', 'active', true, 'public')`)

    // Destinations include hierarchy plus cruise-specific port/waterway geography.
    await db.insert(destinations).values([
      {
        id: "dest_med",
        slug: "mediterranean",
        destinationType: "region",
      },
      {
        id: "dest_it",
        slug: "italy",
        destinationType: "country",
      },
      {
        id: "dest_rm",
        slug: "rome",
        canonicalPlaceId: "ITROM",
        destinationType: "city",
      },
      {
        id: "dest_ams",
        slug: "amsterdam-port",
        canonicalPlaceId: "NLAMS",
        destinationType: "port",
      },
      {
        id: "dest_rhine",
        slug: "rhine",
        canonicalPlaceId: "river:rhine",
        destinationType: "river",
      },
    ])

    // English + Italian translations for each.
    await db.insert(destinationTranslations).values([
      { id: "dt_med_en", destinationId: "dest_med", languageTag: "en-GB", name: "Mediterranean" },
      { id: "dt_it_en", destinationId: "dest_it", languageTag: "en-GB", name: "Italy" },
      { id: "dt_rm_en", destinationId: "dest_rm", languageTag: "en-GB", name: "Rome" },
      { id: "dt_ams_en", destinationId: "dest_ams", languageTag: "en-GB", name: "Amsterdam Port" },
      { id: "dt_rhine_en", destinationId: "dest_rhine", languageTag: "en-GB", name: "Rhine" },
      { id: "dt_it_it", destinationId: "dest_it", languageTag: "it-IT", name: "Italia" },
      { id: "dt_rm_it", destinationId: "dest_rm", languageTag: "it-IT", name: "Roma" },
      // Note: no Italian translation for Mediterranean — fallback path tested below.
    ])

    await db.insert(productDestinations).values([
      { productId, destinationId: "dest_med" },
      { productId, destinationId: "dest_it" },
      { productId, destinationId: "dest_rm" },
      { productId, destinationId: "dest_ams" },
      { productId, destinationId: "dest_rhine" },
    ])
  })

  it("buckets destinations by type and emits locale-aware labels", async () => {
    const ext = createProductDestinationsProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)
    expect(projection.get("regions[]")).toEqual(["Mediterranean"])
    expect(projection.get("countries[]")).toEqual(["Italy"])
    expect(projection.get("cities[]")).toEqual(["Rome"])
    expect(projection.get("ports[]")).toEqual(["Amsterdam Port"])
    expect(projection.get("waterways[]")).toEqual(["Rhine"])
    expect(projection.get("destinationSlugs[]")).toEqual(
      expect.arrayContaining(["mediterranean", "italy", "rome", "amsterdam-port", "rhine"]),
    )
    expect(projection.get("destinationIds[]")).toEqual(
      expect.arrayContaining(["dest_med", "dest_it", "dest_rm", "dest_ams", "dest_rhine"]),
    )
    expect(projection.get("destinationCanonicalPlaceIds[]")).toEqual(
      expect.arrayContaining(["ITROM", "NLAMS", "river:rhine"]),
    )
  })

  it("uses the slice's locale when picking translation labels", async () => {
    const ext = createProductDestinationsProjectionExtension()
    const projection = await ext.project(db, productId, itSlice)
    // Italian translations exist for Italy + Rome
    expect(projection.get("countries[]")).toEqual(["Italia"])
    expect(projection.get("cities[]")).toEqual(["Roma"])
  })

  it("falls back to the destination slug when no translation exists for the locale", async () => {
    const ext = createProductDestinationsProjectionExtension()
    const projection = await ext.project(db, productId, itSlice)
    // Mediterranean has no it-IT translation — the slug "mediterranean" is used.
    expect(projection.get("regions[]")).toEqual(["mediterranean"])
  })

  it("returns empty arrays when the product has no destination links", async () => {
    // agent-quality: raw-sql reviewed -- owner: products; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
    await db.execute(sql`DELETE FROM product_destinations WHERE product_id = ${productId}`)
    const ext = createProductDestinationsProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)
    expect(projection.get("regions[]")).toEqual([])
    expect(projection.get("countries[]")).toEqual([])
    expect(projection.get("cities[]")).toEqual([])
    expect(projection.get("ports[]")).toEqual([])
    expect(projection.get("waterways[]")).toEqual([])
    expect(projection.get("destinationSlugs[]")).toEqual([])
    expect(projection.get("destinationIds[]")).toEqual([])
    expect(projection.get("destinationCanonicalPlaceIds[]")).toEqual([])
  })

  it("excludes inactive destinations from the projection", async () => {
    await db.execute(sql`UPDATE destinations SET active = false WHERE id = 'dest_rm'`)
    const ext = createProductDestinationsProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)
    expect(projection.get("cities[]")).toEqual([])
    expect(projection.get("countries[]")).toEqual(["Italy"])
  })

  it("end-to-end: createProductDocumentBuilder projects destinations onto the product doc", async () => {
    const registry = createProductsRegistry(productDestinationsCatalogPolicy)
    const build = createProductDocumentBuilder(db, {
      sellerOperatorId: "op_xyz",
      registry,
      extensions: [createProductDestinationsProjectionExtension()],
    })
    const doc = await build(productId, enSlice)
    expect(doc).not.toBeNull()
    expect(doc?.id).toBe(productId)
    expect(doc?.fields).toHaveProperty("regions", ["Mediterranean"])
    expect(doc?.fields).toHaveProperty("countries", ["Italy"])
    expect(doc?.fields).toHaveProperty("cities", ["Rome"])
    expect(doc?.fields).toHaveProperty("ports", ["Amsterdam Port"])
    expect(doc?.fields).toHaveProperty("waterways", ["Rhine"])
  })
})

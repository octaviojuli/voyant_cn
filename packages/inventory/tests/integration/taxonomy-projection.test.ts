import type { IndexerSlice } from "@voyant-travel/catalog"
import { type SQL, sql } from "drizzle-orm"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { productTaxonomyCatalogPolicy } from "../../src/catalog-policy-taxonomy.js"
import {
  productCategories,
  productCategoryProducts,
  productCategoryTranslations,
  productTagProducts,
  productTags,
  productTagTranslations,
} from "../../src/schema-taxonomy.js"
import {
  createProductDocumentBuilder,
  createProductsRegistry,
} from "../../src/service-catalog-plane.js"
import { createProductTaxonomyProjectionExtension } from "../../src/service-catalog-plane-taxonomy.js"

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL

const enSlice: IndexerSlice = {
  vertical: "products",
  locale: "en-GB",
  audience: "customer",
  market: "default",
}

const itSlice: IndexerSlice = { ...enSlice, locale: "it-IT" }

describe.skipIf(!DB_AVAILABLE)("createProductTaxonomyProjectionExtension", () => {
  // biome-ignore lint/suspicious/noExplicitAny: drizzle test client -- owner: products; existing suppression is intentional pending typed cleanup.
  let db: any
  let productId: string

  async function ensureProductsTable(client: { execute: (statement: SQL) => Promise<unknown> }) {
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

  async function ensureTaxonomyTables(client: { execute: (statement: SQL) => Promise<unknown> }) {
    const statements: SQL[] = [
      sql`CREATE TABLE IF NOT EXISTS product_categories (
        id text PRIMARY KEY NOT NULL,
        parent_id text,
        name text NOT NULL,
        slug text NOT NULL,
        description text,
        sort_order integer DEFAULT 0 NOT NULL,
        active boolean DEFAULT true NOT NULL,
        customer_payment_policy jsonb,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS uidx_product_categories_slug ON product_categories (slug)`,
      sql`CREATE TABLE IF NOT EXISTS product_tags (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS uidx_product_tags_name ON product_tags (name)`,
      sql`CREATE TABLE IF NOT EXISTS product_category_products (
        product_id text NOT NULL,
        category_id text NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        PRIMARY KEY (product_id, category_id)
      )`,
      sql`CREATE TABLE IF NOT EXISTS product_tag_products (
        product_id text NOT NULL,
        tag_id text NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        PRIMARY KEY (product_id, tag_id)
      )`,
      sql`CREATE TABLE IF NOT EXISTS product_category_translations (
        id text PRIMARY KEY NOT NULL,
        category_id text NOT NULL,
        language_tag text NOT NULL,
        name text NOT NULL,
        description text,
        seo_title text,
        seo_description text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS uidx_product_category_translations_locale
        ON product_category_translations (category_id, language_tag)`,
      sql`CREATE TABLE IF NOT EXISTS product_tag_translations (
        id text PRIMARY KEY NOT NULL,
        tag_id text NOT NULL,
        language_tag text NOT NULL,
        name text NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS uidx_product_tag_translations_locale
        ON product_tag_translations (tag_id, language_tag)`,
    ]
    for (const statement of statements) {
      await client.execute(statement)
    }
  }

  beforeAll(async () => {
    const { createTestDb } = await import("@voyant-travel/db/test-utils")
    db = createTestDb()
    await ensureProductsTable(db)
    await ensureTaxonomyTables(db)
  })

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE products, product_categories, product_tags, product_category_products, product_tag_products, product_category_translations, product_tag_translations CASCADE`,
    )

    productId = "prod_taxo_test"
    await db.execute(
      // agent-quality: raw-sql reviewed -- owner: products; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
      sql`INSERT INTO products (id, name, sell_currency, status, activated, visibility)
        VALUES (${productId}, 'Mountain Hiking Tour', 'EUR', 'active', true, 'public')`,
    )

    // Tree: Adventure (root) > Hiking > Mountain Hiking
    // Plus a sibling subtree: Adventure > Climbing
    await db.insert(productCategories).values([
      { id: "cat_adv", parentId: null, name: "Adventure", slug: "adventure" },
      { id: "cat_hik", parentId: "cat_adv", name: "Hiking", slug: "hiking" },
      { id: "cat_mtn", parentId: "cat_hik", name: "Mountain Hiking", slug: "mountain-hiking" },
      { id: "cat_clm", parentId: "cat_adv", name: "Climbing", slug: "climbing" },
    ])

    await db.insert(productTags).values([
      { id: "tag_fam", name: "Family-friendly" },
      { id: "tag_eco", name: "Eco" },
    ])
  })

  it("returns empty arrays / nulls when product has no taxonomy links", async () => {
    const ext = createProductTaxonomyProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)
    expect(projection.get("categories[]")).toEqual([])
    expect(projection.get("categoryIds[]")).toEqual([])
    expect(projection.get("categorySlugs[]")).toEqual([])
    expect(projection.get("primaryCategoryId")).toBeNull()
    expect(projection.get("primaryCategoryName")).toBeNull()
    expect(projection.get("primaryCategorySlug")).toBeNull()
    expect(projection.get("tagLabels[]")).toEqual([])
    expect(projection.get("tagIds[]")).toEqual([])
  })

  it("denormalizes the full ancestor chain from a leaf-only link", async () => {
    // Operator pinned Mountain Hiking as the only category — the projection
    // must surface Hiking and Adventure too so an "Adventure" filter hits.
    await db
      .insert(productCategoryProducts)
      .values([{ productId, categoryId: "cat_mtn", sortOrder: 0 }])

    const ext = createProductTaxonomyProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)

    expect(projection.get("categories[]")).toEqual(["Mountain Hiking", "Hiking", "Adventure"])
    expect(projection.get("categoryIds[]")).toEqual(["cat_mtn", "cat_hik", "cat_adv"])
    expect(projection.get("categorySlugs[]")).toEqual(["mountain-hiking", "hiking", "adventure"])
    expect(projection.get("primaryCategoryId")).toBe("cat_mtn")
    expect(projection.get("primaryCategoryName")).toBe("Mountain Hiking")
  })

  it("dedupes shared ancestors across multiple direct links", async () => {
    await db.insert(productCategoryProducts).values([
      { productId, categoryId: "cat_hik", sortOrder: 1 },
      { productId, categoryId: "cat_clm", sortOrder: 2 },
    ])

    const ext = createProductTaxonomyProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)

    const ids = projection.get("categoryIds[]") as string[]
    // Adventure (the shared parent) appears exactly once.
    expect(ids.filter((id) => id === "cat_adv").length).toBe(1)
    expect(ids).toEqual(expect.arrayContaining(["cat_hik", "cat_clm", "cat_adv"]))
  })

  it("primary picks the lowest sortOrder direct link", async () => {
    await db.insert(productCategoryProducts).values([
      { productId, categoryId: "cat_clm", sortOrder: 5 },
      { productId, categoryId: "cat_hik", sortOrder: 1 },
    ])

    const ext = createProductTaxonomyProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)
    expect(projection.get("primaryCategoryId")).toBe("cat_hik")
    expect(projection.get("primaryCategoryName")).toBe("Hiking")
  })

  it("excludes inactive direct categories and stops the chain at inactive ancestors", async () => {
    // Pause the parent "Adventure" — children stay active.
    await db.execute(sql`UPDATE product_categories SET active = false WHERE id = 'cat_adv'`)
    await db
      .insert(productCategoryProducts)
      .values([{ productId, categoryId: "cat_hik", sortOrder: 0 }])

    const ext = createProductTaxonomyProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)
    // "Adventure" is paused → not denormalized into the projection.
    expect(projection.get("categories[]")).toEqual(["Hiking"])
    expect(projection.get("categoryIds[]")).toEqual(["cat_hik"])
  })

  it("emits structured tag labels and ids without colliding with the legacy tags column", async () => {
    await db.insert(productTagProducts).values([
      { productId, tagId: "tag_fam" },
      { productId, tagId: "tag_eco" },
    ])

    const ext = createProductTaxonomyProjectionExtension()
    const projection = await ext.project(db, productId, enSlice)
    expect(projection.get("tagLabels[]")).toEqual(
      expect.arrayContaining(["Family-friendly", "Eco"]),
    )
    expect(projection.get("tagIds[]")).toEqual(expect.arrayContaining(["tag_fam", "tag_eco"]))
  })

  it("end-to-end: createProductDocumentBuilder projects taxonomy onto the product doc", async () => {
    await db
      .insert(productCategoryProducts)
      .values([{ productId, categoryId: "cat_mtn", sortOrder: 0 }])
    await db.insert(productTagProducts).values([{ productId, tagId: "tag_fam" }])

    const registry = createProductsRegistry(productTaxonomyCatalogPolicy)
    const build = createProductDocumentBuilder(db, {
      sellerOperatorId: "op_xyz",
      registry,
      extensions: [createProductTaxonomyProjectionExtension()],
    })
    const doc = await build(productId, enSlice)
    expect(doc).not.toBeNull()
    expect(doc?.id).toBe(productId)
    expect(doc?.fields).toHaveProperty("categories", ["Mountain Hiking", "Hiking", "Adventure"])
    expect(doc?.fields).toHaveProperty("primaryCategoryName", "Mountain Hiking")
    expect(doc?.fields).toHaveProperty("tagLabels", ["Family-friendly"])
  })

  describe("locale-aware translations (#502)", () => {
    beforeEach(async () => {
      // Translate the full chain into Italian so the it-IT slice has
      // overrides for every category. Tag has an it-IT translation too.
      await db.insert(productCategoryTranslations).values([
        {
          id: "pctr_adv_it",
          categoryId: "cat_adv",
          languageTag: "it-IT",
          name: "Avventura",
        },
        {
          id: "pctr_hik_it",
          categoryId: "cat_hik",
          languageTag: "it-IT",
          name: "Escursionismo",
        },
        {
          id: "pctr_mtn_it",
          categoryId: "cat_mtn",
          languageTag: "it-IT",
          name: "Escursionismo in Montagna",
        },
      ])
      await db.insert(productTagTranslations).values({
        id: "pttr_fam_it",
        tagId: "tag_fam",
        languageTag: "it-IT",
        name: "Adatto alle famiglie",
      })
    })

    it("emits translated category names on the matching locale slice", async () => {
      await db
        .insert(productCategoryProducts)
        .values([{ productId, categoryId: "cat_mtn", sortOrder: 0 }])
      const ext = createProductTaxonomyProjectionExtension()
      const projection = await ext.project(db, productId, itSlice)
      expect(projection.get("categories[]")).toEqual([
        "Escursionismo in Montagna",
        "Escursionismo",
        "Avventura",
      ])
      expect(projection.get("primaryCategoryName")).toBe("Escursionismo in Montagna")
      // Slugs and ids stay canonical regardless of slice locale.
      expect(projection.get("categorySlugs[]")).toEqual(["mountain-hiking", "hiking", "adventure"])
      expect(projection.get("categoryIds[]")).toEqual(["cat_mtn", "cat_hik", "cat_adv"])
    })

    it("falls back to canonical name when no translation exists for the slice locale", async () => {
      // Same product on the en-GB slice — no en-GB translations seeded.
      // Projection falls back to the canonical English `name` columns.
      await db
        .insert(productCategoryProducts)
        .values([{ productId, categoryId: "cat_mtn", sortOrder: 0 }])
      const ext = createProductTaxonomyProjectionExtension()
      const projection = await ext.project(db, productId, enSlice)
      expect(projection.get("categories[]")).toEqual(["Mountain Hiking", "Hiking", "Adventure"])
      expect(projection.get("primaryCategoryName")).toBe("Mountain Hiking")
    })

    it("partial translations: leaf has en-GB row, ancestor doesn't — leaf renders translated, ancestor falls back", async () => {
      // Add en-GB row only for the leaf "Mountain Hiking". The two
      // ancestors stay canonical for the en-GB slice.
      await db.insert(productCategoryTranslations).values({
        id: "pctr_mtn_en",
        categoryId: "cat_mtn",
        languageTag: "en-GB",
        name: "Mountain Hike",
      })
      await db
        .insert(productCategoryProducts)
        .values([{ productId, categoryId: "cat_mtn", sortOrder: 0 }])

      const ext = createProductTaxonomyProjectionExtension()
      const projection = await ext.project(db, productId, enSlice)
      expect(projection.get("categories[]")).toEqual([
        "Mountain Hike", // overridden
        "Hiking", // canonical fallback
        "Adventure", // canonical fallback
      ])
    })

    it("emits translated tag labels on the matching locale slice", async () => {
      await db.insert(productTagProducts).values([
        { productId, tagId: "tag_fam" },
        { productId, tagId: "tag_eco" }, // no it-IT translation — fallback
      ])
      const ext = createProductTaxonomyProjectionExtension()
      const projection = await ext.project(db, productId, itSlice)
      const tagLabels = projection.get("tagLabels[]") as string[]
      expect(tagLabels.sort()).toEqual(["Adatto alle famiglie", "Eco"])
    })
  })
})

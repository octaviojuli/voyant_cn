import { cleanupTestDb, createTestDb } from "@voyant-travel/db/test-utils"
import { beforeEach, describe, expect, it } from "vitest"

import {
  getRouteImportSettings,
  ROUTE_IMPORT_FALLBACKS,
  resolveRouteImportDefaults,
  upsertRouteImportSettings,
} from "./service.js"

// 该包的 tsconfig 不带 node 类型;按 db/test-utils 的写法从 globalThis 取,
// 不为一个测试去改整包的类型配置。
const runtimeEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const DB_AVAILABLE = !!runtimeEnv.TEST_DATABASE_URL

describe.skipIf(!DB_AVAILABLE)("线路上线助理设置", () => {
  const db = createTestDb()

  beforeEach(async () => {
    await cleanupTestDb(db)
  })

  it("没设置过时给出兜底值,而不是一堆空", async () => {
    // 建产品要用到币种与年龄线,留空会让确认那一步直接失败。
    const resolved = await resolveRouteImportDefaults(db)

    expect(resolved.sellCurrency).toBe(ROUTE_IMPORT_FALLBACKS.sellCurrency)
    expect(resolved.timezone).toBe(ROUTE_IMPORT_FALLBACKS.timezone)
    expect(resolved.adultMinAge).toBe(ROUTE_IMPORT_FALLBACKS.adultMinAge)
    expect(resolved.childMinAge).toBe(ROUTE_IMPORT_FALLBACKS.childMinAge)
    expect(await getRouteImportSettings(db)).toBeNull()
  })

  it("设置后按设置值解析,币种统一大写", async () => {
    await upsertRouteImportSettings(db, { sellCurrency: "usd", adultMinAge: 18 })

    const resolved = await resolveRouteImportDefaults(db)
    expect(resolved.sellCurrency).toBe("USD")
    expect(resolved.adultMinAge).toBe(18)
  })

  it("局部更新不抹掉没提到的字段", async () => {
    // 产品配图的 PATCH 就栽在这:改个说明会把封面标记和排序一起清掉。
    await upsertRouteImportSettings(db, { sellCurrency: "USD", adultMinAge: 18, childMinAge: 3 })
    await upsertRouteImportSettings(db, { timezone: "Asia/Urumqi" })

    const resolved = await resolveRouteImportDefaults(db)
    expect(resolved.sellCurrency).toBe("USD")
    expect(resolved.adultMinAge).toBe(18)
    expect(resolved.childMinAge).toBe(3)
    expect(resolved.timezone).toBe("Asia/Urumqi")
  })

  it("显式置空即清空,并落回兜底", async () => {
    // 「没提到」与「明确要清掉」是两回事,不能都当成不变。
    await upsertRouteImportSettings(db, { sellCurrency: "USD" })
    await upsertRouteImportSettings(db, { sellCurrency: null })

    expect((await getRouteImportSettings(db))?.sellCurrency).toBeNull()
    expect((await resolveRouteImportDefaults(db)).sellCurrency).toBe(
      ROUTE_IMPORT_FALLBACKS.sellCurrency,
    )
  })

  it("反复保存只留一行,不堆出一串历史", async () => {
    await upsertRouteImportSettings(db, { sellCurrency: "USD" })
    const first = await getRouteImportSettings(db)
    await upsertRouteImportSettings(db, { sellCurrency: "EUR" })
    const second = await getRouteImportSettings(db)

    expect(second?.id).toBe(first?.id)
    expect(second?.sellCurrency).toBe("EUR")
  })

  it("供应商与产品类型是软引用,存的就是原值", async () => {
    // 跨包引用不建外键(schema-discipline),但要能存能取。
    await upsertRouteImportSettings(db, {
      defaultSupplierId: "supp_abc",
      productTypeId: "ptype_xyz",
    })

    const resolved = await resolveRouteImportDefaults(db)
    expect(resolved.defaultSupplierId).toBe("supp_abc")
    expect(resolved.productTypeId).toBe("ptype_xyz")
  })
})

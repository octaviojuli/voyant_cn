/// <reference types="node" />

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { assertStorageProviderConformance } from "../conformance.js"
import { createFilesystemStorageProvider } from "./filesystem.js"

describe("createFilesystemStorageProvider", () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "voyant-fs-storage-"))
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it("satisfies the portable storage contract", async () => {
    await assertStorageProviderConformance({
      createProvider: () => createFilesystemStorageProvider({ baseDir }),
    })
  })

  it("persists bytes across provider instances", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const writer = createFilesystemStorageProvider({ baseDir })
    await writer.upload(bytes, { key: "uploads/photo.jpg" })

    // A fresh provider stands in for a restarted process: the memory provider
    // loses its Map here, which is the bug this provider exists to fix.
    const reader = createFilesystemStorageProvider({ baseDir })
    const stored = await reader.get("uploads/photo.jpg")
    expect(stored).not.toBeNull()
    expect(new Uint8Array(stored as ArrayBuffer)).toEqual(bytes)
  })

  it("creates nested key directories on upload", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    await provider.upload(new Uint8Array([9]), {
      key: "brochures/products/prod_1/brochure.pdf",
    })
    const stored = await readFile(join(baseDir, "brochures/products/prod_1/brochure.pdf"))
    expect(new Uint8Array(stored)).toEqual(new Uint8Array([9]))
  })

  it("returns null for a missing key", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    expect(await provider.get("uploads/absent.jpg")).toBeNull()
  })

  it("returns null when the key names a directory", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    await mkdir(join(baseDir, "uploads/nested"), { recursive: true })
    expect(await provider.get("uploads")).toBeNull()
  })

  it("refuses to read outside the storage root", async () => {
    const outside = join(baseDir, "..", "voyant-fs-storage-escape.txt")
    await writeFile(outside, "secret")
    try {
      const provider = createFilesystemStorageProvider({ baseDir })
      expect(await provider.get("../voyant-fs-storage-escape.txt")).toBeNull()
      expect(await provider.get("uploads/../../voyant-fs-storage-escape.txt")).toBeNull()
    } finally {
      await rm(outside, { force: true })
    }
  })

  it("refuses to write outside the storage root", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    await expect(provider.upload(new Uint8Array([1]), { key: "../escape.txt" })).rejects.toThrow(
      /outside the storage root/,
    )
  })

  it("refuses keys containing a null byte or backslash", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    expect(await provider.get("uploads/a\0b")).toBeNull()
    expect(await provider.get("uploads\\a")).toBeNull()
  })

  it("deletes objects and tolerates deleting an absent key", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    await provider.upload(new Uint8Array([1]), { key: "uploads/gone.jpg" })
    await provider.delete("uploads/gone.jpg")
    expect(await provider.get("uploads/gone.jpg")).toBeNull()
    await expect(provider.delete("uploads/never-existed.jpg")).resolves.toBeUndefined()
  })

  it("leaves no temp files behind after a successful upload", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    await provider.upload(new Uint8Array([1]), { key: "uploads/clean.jpg" })
    const entries = await readdir(join(baseDir, "uploads"))
    expect(entries).toEqual(["clean.jpg"])
  })

  it("overwrites an existing key in place", async () => {
    const provider = createFilesystemStorageProvider({ baseDir })
    await provider.upload(new Uint8Array([1]), { key: "uploads/same.jpg" })
    await provider.upload(new Uint8Array([2, 2]), { key: "uploads/same.jpg" })
    const stored = await provider.get("uploads/same.jpg")
    expect(new Uint8Array(stored as ArrayBuffer)).toEqual(new Uint8Array([2, 2]))
  })

  it("builds URLs from the configured base and percent-encodes segments", async () => {
    const provider = createFilesystemStorageProvider({
      baseDir,
      baseUrl: "https://example.test/api/v1/admin/media/",
    })
    const uploaded = await provider.upload(new Uint8Array([1]), {
      key: "uploads/中文 名.jpg",
    })
    expect(uploaded.url).toBe(
      `https://example.test/api/v1/admin/media/uploads/${encodeURIComponent("中文 名.jpg")}`,
    )
    // The key itself stays unencoded so a later get() round-trips.
    expect(await provider.get(uploaded.key)).not.toBeNull()
  })

  it("mints a key when none is supplied", async () => {
    const provider = createFilesystemStorageProvider({
      baseDir,
      generateKey: () => "uploads/minted.bin",
    })
    const uploaded = await provider.upload(new Uint8Array([7]))
    expect(uploaded.key).toBe("uploads/minted.bin")
    expect(await provider.get("uploads/minted.bin")).not.toBeNull()
  })
})

/// <reference types="node" />

import type { StorageObject, StorageProvider, StorageUploadBody, UploadOptions } from "../types.js"

/**
 * Options for {@link createFilesystemStorageProvider}.
 */
export interface FilesystemStorageOptions {
  /**
   * Absolute directory that owns every object this provider writes. Object
   * keys are resolved beneath it, and reads that would escape it are refused.
   * The directory is created on first write.
   */
  baseDir: string
  /** Provider name (defaults to `"filesystem"`). */
  name?: string
  /**
   * Base URL used to construct the string returned from `signedUrl` and
   * `upload`. Defaults to `"file://"`. The final URL is `${baseUrl}${key}`.
   */
  baseUrl?: string
  /**
   * Function used to mint random keys when `UploadOptions.key` is not
   * provided. Defaults to `crypto.randomUUID()` via the global `crypto`.
   */
  generateKey?: () => string
}

/**
 * Create a disk-backed storage provider for single-node deployments.
 *
 * Unlike {@link createLocalStorageProvider}, which keeps bytes in a `Map` that
 * dies with the process, objects written here survive restarts and
 * redeployments as long as `baseDir` lives outside the deployed bundle. It is
 * the smallest provider that makes uploaded media durable without standing up
 * an object store; deployments that need multi-node reads, CDN origins, or
 * offsite durability should select the S3-compatible provider instead.
 *
 * Node-only: the `node:` built-ins are imported lazily so that bundling this
 * module for Workers stays possible as long as the provider is never selected.
 */
export function createFilesystemStorageProvider(
  options: FilesystemStorageOptions,
): StorageProvider {
  const name = options.name ?? "filesystem"
  const baseUrl = options.baseUrl ?? "file://"
  const generateKey =
    options.generateKey ??
    (() => {
      const g = globalThis as { crypto?: { randomUUID?: () => string } }
      return g.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    })

  /**
   * Resolve `key` to an absolute path inside `baseDir`, or `null` when the key
   * is malformed or would escape the directory. Traversal is rejected on the
   * resolved path rather than by inspecting segments, so encodings that
   * normalize into `..` are caught too.
   */
  async function resolvePath(key: string): Promise<string | null> {
    if (!key || key.includes("\0") || key.includes("\\")) return null
    const path = await import("node:path")
    const root = path.resolve(options.baseDir)
    const resolved = path.resolve(root, key)
    if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
    return resolved
  }

  async function upload(body: StorageUploadBody, opts: UploadOptions = {}): Promise<StorageObject> {
    const key = opts.key ?? generateKey()
    const target = await resolvePath(key)
    if (!target) throw new Error(`Refusing to write object key outside the storage root: ${key}`)

    const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")])
    await fs.mkdir(path.dirname(target), { recursive: true })

    // Write to a sibling temp file and rename, so a concurrent read never sees
    // a half-written object. Rename is atomic within the same directory.
    const bytes = await toBytes(body)
    const temp = `${target}.${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.tmp`
    try {
      await fs.writeFile(temp, bytes)
      await fs.rename(temp, target)
    } catch (error) {
      await fs.rm(temp, { force: true }).catch(() => {})
      throw error
    }

    return { key, url: `${baseUrl}${encodeKey(key)}` }
  }

  return {
    name,
    upload,
    async delete(key) {
      const target = await resolvePath(key)
      if (!target) return
      const fs = await import("node:fs/promises")
      await fs.rm(target, { force: true })
    },
    async signedUrl(key) {
      return `${baseUrl}${encodeKey(key)}`
    },
    async get(key) {
      const target = await resolvePath(key)
      if (!target) return null
      const fs = await import("node:fs/promises")
      try {
        const buffer = await fs.readFile(target)
        const copy = new Uint8Array(buffer.byteLength)
        copy.set(buffer)
        return copy.buffer
      } catch (error) {
        if (isMissingFile(error)) return null
        throw error
      }
    },
  }
}

function isMissingFile(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  // EISDIR/ENOTDIR mean the key names a directory or sits under a file; both
  // are "no object here" rather than a fault worth propagating.
  return code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR"
}

function encodeKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

async function toBytes(body: StorageUploadBody): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body
  if (body instanceof ArrayBuffer) return new Uint8Array(body)
  const buffer = await body.arrayBuffer()
  return new Uint8Array(buffer)
}

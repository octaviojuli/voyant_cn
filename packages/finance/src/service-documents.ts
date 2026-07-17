import type { EventBus } from "@voyant-travel/core"
import type { StorageProvider, StorageUploadBody } from "@voyant-travel/storage"
import { renderPdfDocument } from "@voyant-travel/utils/pdf-renderer"
import { and, desc, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import {
  type invoiceLineItems,
  type invoiceRenditions,
  type invoices,
  invoiceTemplates,
  type payments,
} from "./schema.js"
import { financeService, renderInvoiceBody } from "./service.js"
import type { GenerateInvoiceDocumentInput } from "./validation.js"

export interface GeneratedInvoiceRenditionArtifact {
  format?: "html" | "pdf" | "xml" | "json"
  storageKey?: string | null
  contentType?: string | null
  fileSize?: number | null
  checksum?: string | null
  language?: string | null
  metadata?: Record<string, unknown> | null
}

export interface InvoiceDocumentGeneratorContext {
  db: PostgresJsDatabase
  invoice: typeof invoices.$inferSelect
  template: typeof invoiceTemplates.$inferSelect | null
  lineItems: Array<typeof invoiceLineItems.$inferSelect>
  payments: Array<typeof payments.$inferSelect>
  renderedBody: string
  renderedBodyFormat: "html" | "markdown" | "lexical_json"
  variables: Record<string, unknown>
  bindings: Record<string, unknown>
  targetFormat: "html" | "pdf" | "xml" | "json"
  language: string | null
}

export type InvoiceDocumentGenerator = (
  context: InvoiceDocumentGeneratorContext,
) => Promise<GeneratedInvoiceRenditionArtifact>

export interface InvoiceDocumentRuntimeOptions {
  bindings?: Record<string, unknown>
  generator: InvoiceDocumentGenerator
  eventBus?: EventBus
  /**
   * Optional: resolve the invoice-visible custom fields for this invoice's
   * customer, exposed to the template as the `customFields` variable. The
   * deployment wires this — it holds the custom-field registry and reads the
   * entity's `custom_fields` column — keeping `finance` decoupled from
   * `relationships`. Filter with `customFieldsVisibleIn(registry, entity,
   * "invoice")`. See docs/architecture/custom-fields-unification-adr.md.
   */
  resolveCustomFields?: (
    db: PostgresJsDatabase,
    invoice: typeof invoices.$inferSelect,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
}

export interface StorageBackedInvoiceDocumentUpload {
  body: StorageUploadBody
  format?: "html" | "pdf" | "xml" | "json"
  key?: string | null
  metadata?: Record<string, unknown> | null
  language?: string | null
}

export type StorageBackedInvoiceDocumentSerializer = (
  context: InvoiceDocumentGeneratorContext,
) => Promise<StorageBackedInvoiceDocumentUpload> | StorageBackedInvoiceDocumentUpload

export interface StorageBackedInvoiceDocumentGeneratorOptions {
  storage: StorageProvider
  keyPrefix?: string | ((context: InvoiceDocumentGeneratorContext) => Promise<string> | string)
  serializer?: StorageBackedInvoiceDocumentSerializer
}

export interface GeneratedInvoiceDocumentRecord {
  invoiceId: string
  renderedBodyFormat: "html" | "markdown" | "lexical_json"
  renderedBody: string
  rendition: typeof invoiceRenditions.$inferSelect
}

export interface InvoiceDocumentGeneratedEvent {
  invoiceId: string
  invoiceStatus: (typeof invoices.$inferSelect)["status"]
  invoiceType: (typeof invoices.$inferSelect)["invoiceType"]
  renditionId: string
  format: (typeof invoiceRenditions.$inferSelect)["format"]
  renderedBodyFormat: "html" | "markdown" | "lexical_json"
  regenerated: boolean
}

function normalizeTemplateLanguage(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized || null
}

/**
 * Pick the default invoice template for a preferred language. Rows are
 * expected to be active defaults already ordered by recency (updatedAt desc).
 * Matching is case-insensitive: first the full tag (`zh-CN`), then the
 * primary subtag (`zh`), falling back to the most recent default when no
 * language-matched default exists — the pre-language behavior.
 */
export function pickDefaultInvoiceTemplate<T extends { language: string }>(
  rows: T[],
  language: string | null | undefined,
): T | null {
  const preferred = normalizeTemplateLanguage(language)
  if (!preferred) return rows[0] ?? null

  const exact = rows.find((row) => normalizeTemplateLanguage(row.language) === preferred)
  if (exact) return exact

  const preferredPrimary = preferred.split(/[-_]/)[0]
  const primaryMatch = rows.find(
    (row) => normalizeTemplateLanguage(row.language)?.split(/[-_]/)[0] === preferredPrimary,
  )
  return primaryMatch ?? rows[0] ?? null
}

type PreparedInvoiceDocument =
  | { status: "not_found" }
  | {
      status: "ready"
      invoice: typeof invoices.$inferSelect
      template: typeof invoiceTemplates.$inferSelect | null
      lineItems: Array<typeof invoiceLineItems.$inferSelect>
      payments: Array<typeof payments.$inferSelect>
      renderedBody: string
      renderedBodyFormat: "html" | "markdown" | "lexical_json"
      variables: Record<string, unknown>
      targetFormat: "html" | "pdf" | "xml" | "json"
      language: string | null
    }

function defaultInvoiceDocumentMimeType(format: InvoiceDocumentGeneratorContext["targetFormat"]) {
  switch (format) {
    case "html":
      return "text/html; charset=utf-8"
    case "json":
      return "application/json; charset=utf-8"
    case "xml":
      return "application/xml; charset=utf-8"
    default:
      return "application/pdf"
  }
}

function encodeStringBody(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function getBodySize(body: StorageUploadBody) {
  if (body instanceof Uint8Array) return body.byteLength
  if (body instanceof ArrayBuffer) return body.byteLength
  return body.size
}

function toUploadMetadata(metadata: Record<string, unknown> | null | undefined) {
  const entries = Object.entries(metadata ?? {}).filter(([, value]) =>
    ["string", "number", "boolean"].includes(typeof value),
  )

  return entries.length > 0
    ? Object.fromEntries(entries.map(([key, value]) => [key, String(value)]))
    : undefined
}

export function defaultStorageBackedInvoiceDocumentSerializer(
  context: InvoiceDocumentGeneratorContext,
): Promise<StorageBackedInvoiceDocumentUpload> | StorageBackedInvoiceDocumentUpload {
  switch (context.targetFormat) {
    case "html":
      return {
        body: encodeStringBody(context.renderedBody),
        format: "html",
        language: context.language,
        metadata: { renderedBodyFormat: context.renderedBodyFormat },
      }
    case "json":
      return {
        body: encodeStringBody(JSON.stringify(context.variables, null, 2)),
        format: "json",
        language: context.language,
        metadata: { renderedBodyFormat: context.renderedBodyFormat },
      }
    case "xml":
      return {
        body: encodeStringBody(context.renderedBody),
        format: "xml",
        language: context.language,
        metadata: { renderedBodyFormat: context.renderedBodyFormat },
      }
    default:
      return defaultPdfInvoiceDocumentSerializer(context)
  }
}

export async function defaultPdfInvoiceDocumentSerializer(
  context: InvoiceDocumentGeneratorContext,
): Promise<StorageBackedInvoiceDocumentUpload> {
  const body = await renderPdfDocument({
    title: `Invoice ${context.invoice.id}`,
    content: context.renderedBody,
    format:
      context.renderedBodyFormat === "lexical_json"
        ? "lexical_json"
        : context.renderedBodyFormat === "html"
          ? "html"
          : "markdown",
    metadataLines: [
      `Invoice ID: ${context.invoice.id}`,
      ...(context.language ? [`Language: ${context.language}`] : []),
    ],
  })

  return {
    body,
    format: "pdf",
    language: context.language,
    metadata: {
      renderedBodyFormat: context.renderedBodyFormat,
      renderer: "voyant-basic-pdf",
    },
  }
}

export function createStorageBackedInvoiceDocumentGenerator(
  options: StorageBackedInvoiceDocumentGeneratorOptions,
): InvoiceDocumentGenerator {
  const serializer = options.serializer ?? defaultStorageBackedInvoiceDocumentSerializer

  return async (context) => {
    const upload = await serializer(context)
    const format = upload.format ?? context.targetFormat
    const keyPrefix =
      typeof options.keyPrefix === "function"
        ? await options.keyPrefix(context)
        : (options.keyPrefix ?? `invoices/${context.invoice.id}`)
    const key = upload.key?.trim() || `${keyPrefix.replace(/\/$/, "")}/rendition.${format}`
    const uploaded = await options.storage.upload(upload.body, {
      key,
      contentType: defaultInvoiceDocumentMimeType(format),
      metadata: toUploadMetadata(upload.metadata),
    })

    return {
      format,
      storageKey: uploaded.key,
      contentType: defaultInvoiceDocumentMimeType(format),
      fileSize: getBodySize(upload.body),
      language: upload.language ?? context.language,
      metadata: {
        ...(upload.metadata ?? {}),
        storageProvider: options.storage.name,
        ...(uploaded.url ? { url: uploaded.url } : {}),
      },
    }
  }
}

export function createPdfInvoiceDocumentGenerator(
  options: Omit<StorageBackedInvoiceDocumentGeneratorOptions, "serializer">,
): InvoiceDocumentGenerator {
  return createStorageBackedInvoiceDocumentGenerator({
    ...options,
    serializer: defaultPdfInvoiceDocumentSerializer,
  })
}

async function prepareInvoiceDocument(
  db: PostgresJsDatabase,
  invoiceId: string,
  input: GenerateInvoiceDocumentInput,
  resolveCustomFields?: InvoiceDocumentRuntimeOptions["resolveCustomFields"],
): Promise<PreparedInvoiceDocument> {
  const invoice = await financeService.getInvoiceById(db, invoiceId)
  if (!invoice) {
    return { status: "not_found" }
  }

  let templateId = input.templateId ?? invoice.templateId ?? null
  if (!templateId) {
    const defaultTemplates = await db
      .select()
      .from(invoiceTemplates)
      .where(and(eq(invoiceTemplates.isDefault, true), eq(invoiceTemplates.active, true)))
      .orderBy(desc(invoiceTemplates.updatedAt))

    const defaultTemplate = pickDefaultInvoiceTemplate(
      defaultTemplates,
      input.language ?? invoice.language,
    )
    templateId = defaultTemplate?.id ?? null
  }

  const [template, lineItems, paymentRows] = await Promise.all([
    templateId ? financeService.getInvoiceTemplateById(db, templateId) : Promise.resolve(null),
    financeService.listInvoiceLineItems(db, invoiceId),
    financeService.listPayments(db, invoiceId),
  ])

  const renderedBodyFormat = template?.bodyFormat ?? "html"
  const variables: Record<string, unknown> = {
    invoice,
    lineItems,
    payments: paymentRows,
  }
  if (resolveCustomFields) {
    // Invoice-visible custom fields for the customer, available to templates as
    // `{{customFields.<key>}}` (unified custom-fields system).
    variables.customFields = await resolveCustomFields(db, invoice)
  }
  const renderedBody = template
    ? renderInvoiceBody(template.body, template.bodyFormat, variables)
    : JSON.stringify(variables)

  return {
    status: "ready",
    invoice,
    template,
    lineItems,
    payments: paymentRows,
    renderedBody,
    renderedBodyFormat,
    variables,
    targetFormat: input.format,
    language: input.language ?? invoice.language ?? template?.language ?? null,
  }
}

export const financeDocumentsService = {
  async generateInvoiceDocument(
    db: PostgresJsDatabase,
    invoiceId: string,
    input: GenerateInvoiceDocumentInput,
    runtime: InvoiceDocumentRuntimeOptions,
    options: { regenerated?: boolean } = {},
  ): Promise<
    | { status: "not_found" | "generator_failed" }
    | ({ status: "generated" } & GeneratedInvoiceDocumentRecord)
  > {
    const prepared = await prepareInvoiceDocument(db, invoiceId, input, runtime.resolveCustomFields)
    if (prepared.status === "not_found") {
      return { status: "not_found" }
    }

    let artifact: GeneratedInvoiceRenditionArtifact
    try {
      artifact = await runtime.generator({
        db,
        invoice: prepared.invoice,
        template: prepared.template,
        lineItems: prepared.lineItems,
        payments: prepared.payments,
        renderedBody: prepared.renderedBody,
        renderedBodyFormat: prepared.renderedBodyFormat,
        variables: prepared.variables,
        bindings: runtime.bindings ?? {},
        targetFormat: prepared.targetFormat,
        language: prepared.language,
      })
    } catch {
      return { status: "generator_failed" }
    }

    const format = artifact.format ?? prepared.targetFormat
    const bindResult = await financeService.bindInvoiceRendition(
      db,
      invoiceId,
      {
        templateId: prepared.template?.id ?? null,
        format,
        storageKey: artifact.storageKey?.trim() || null,
        contentType: artifact.contentType ?? defaultInvoiceDocumentMimeType(format),
        fileSize: artifact.fileSize ?? null,
        checksum: artifact.checksum ?? null,
        language: artifact.language ?? prepared.language ?? null,
        generatedAt: new Date().toISOString(),
        metadata: {
          ...(artifact.metadata ?? {}),
          renderedBodyFormat: prepared.renderedBodyFormat,
        },
        replaceExisting: input.replaceExisting,
      },
      { eventBus: runtime.eventBus },
    )

    if (bindResult.status !== "bound") {
      return { status: "not_found" }
    }
    const { rendition } = bindResult

    await runtime.eventBus?.emit(
      "invoice.document.generated",
      {
        invoiceId: prepared.invoice.id,
        invoiceStatus: prepared.invoice.status,
        invoiceType: prepared.invoice.invoiceType,
        renditionId: rendition.id,
        format: rendition.format,
        renderedBodyFormat: prepared.renderedBodyFormat,
        regenerated: options.regenerated ?? false,
      } satisfies InvoiceDocumentGeneratedEvent,
      {
        category: "internal",
        source: "service",
      },
    )

    return {
      status: "generated",
      invoiceId: prepared.invoice.id,
      renderedBodyFormat: prepared.renderedBodyFormat,
      renderedBody: prepared.renderedBody,
      rendition,
    }
  },

  async regenerateInvoiceDocument(
    db: PostgresJsDatabase,
    invoiceId: string,
    input: GenerateInvoiceDocumentInput,
    runtime: InvoiceDocumentRuntimeOptions,
  ) {
    return this.generateInvoiceDocument(db, invoiceId, input, runtime, { regenerated: true })
  },
}

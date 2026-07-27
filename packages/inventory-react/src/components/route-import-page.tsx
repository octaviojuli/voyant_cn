"use client"

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components"
import { cn } from "@voyant-travel/ui/lib/utils"
import { Upload } from "lucide-react"
import { useId, useRef, useState } from "react"

import { useRouteImportDraftMutation } from "../hooks/use-route-import-draft-mutation.js"
import { useRouteImportDrafts } from "../hooks/use-route-import-drafts.js"
import { useProductsUiI18nOrDefault, useProductsUiMessagesOrDefault } from "../i18n/index.js"
import type { RouteImportDraftRow } from "../schemas.js"

const ACCEPT =
  ".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export interface RouteImportPageProps {
  onDraftOpen?: (draft: RouteImportDraftRow) => void
  className?: string
}

/** 草稿里已知的字段。其余结构交由详情页按需读取。 */
interface DraftShape {
  title?: string
  days?: number | null
  nights?: number | null
}

function draftShapeOf(row: RouteImportDraftRow): DraftShape {
  return (row.draft ?? {}) as DraftShape
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  pending_review: "default",
  in_review: "secondary",
  committed: "outline",
  discarded: "outline",
}

export function RouteImportPage({ onDraftOpen, className }: RouteImportPageProps = {}) {
  const messages = useProductsUiMessagesOrDefault().routeImportPage
  const { formatDateTime } = useProductsUiI18nOrDefault()
  const drafts = useRouteImportDrafts()
  const { upload } = useRouteImportDraftMutation()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = (file: File | undefined) => {
    if (!file) return
    setError(null)
    upload.mutate(file, {
      onSuccess: (row) => onDraftOpen?.(row),
      // 后端把「文件过大」「格式不支持」写在 error 里,原样透出比一句
      // 「上传失败」有用得多。
      onError: (cause) => setError(cause instanceof Error ? cause.message : messages.upload.failed),
    })
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div data-slot="route-import-page" className={cn("flex flex-col gap-6 p-6", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{messages.title}</h1>
        <p className="text-sm text-muted-foreground">{messages.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{messages.upload.label}</CardTitle>
          <CardDescription>{messages.upload.hint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => pick(event.target.files?.[0])}
            />
            <Button
              type="button"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              {upload.isPending ? messages.upload.uploading : messages.upload.button}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {drafts.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (drafts.data?.data.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">{messages.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{messages.columns.file}</TableHead>
              <TableHead>{messages.columns.route}</TableHead>
              <TableHead>{messages.columns.days}</TableHead>
              <TableHead>{messages.columns.status}</TableHead>
              <TableHead>{messages.columns.created}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.data?.data.map((row) => {
              const shape = draftShapeOf(row)
              const status = messages.status[row.status as keyof typeof messages.status]
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onDraftOpen?.(row)}
                >
                  <TableCell className="font-medium">{row.sourceFilename}</TableCell>
                  <TableCell>{shape.title || "—"}</TableCell>
                  <TableCell>{shape.days ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
                      {status ?? row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

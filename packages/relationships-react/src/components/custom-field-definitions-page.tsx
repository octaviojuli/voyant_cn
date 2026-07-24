"use client"

import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components"
import { cn } from "@voyant-travel/ui/lib/utils"
import { AlertCircle, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useCustomFieldDefinitionMutation } from "../hooks/use-custom-field-definition-mutation.js"
import { useCustomFieldDefinitions } from "../hooks/use-custom-field-definitions.js"
import { useCrmUiMessagesOrDefault } from "../i18n/index.js"
import type { CustomFieldDefinitionRecord } from "../schemas.js"
import {
  CustomFieldDefinitionSheet,
  type EntityType,
  entityTypes,
} from "./custom-field-definition-sheet.js"

const PAGE_SIZE = 25
const ALL_ENTITIES = "all"

export interface CustomFieldDefinitionsPageProps {
  className?: string
  pageSize?: number
}

export function CustomFieldDefinitionsPage({
  className,
  pageSize = PAGE_SIZE,
}: CustomFieldDefinitionsPageProps = {}) {
  const messages = useCrmUiMessagesOrDefault()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CustomFieldDefinitionRecord | undefined>()
  const [deleting, setDeleting] = useState<CustomFieldDefinitionRecord | undefined>()
  const [entityFilter, setEntityFilter] = useState<EntityType | typeof ALL_ENTITIES>(ALL_ENTITIES)
  const [pageIndex, setPageIndex] = useState(0)
  const { remove } = useCustomFieldDefinitionMutation()

  const query = useCustomFieldDefinitions({
    entityType: entityFilter === ALL_ENTITIES ? undefined : entityFilter,
    limit: pageSize,
    offset: pageIndex * pageSize,
  })

  const definitions = query.data?.data ?? []
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const entityLabels = messages.common.entityTypeLabels
  const pageMessages = messages.customFields.page
  const fieldTypeLabels = messages.customFields.fieldTypeLabels

  return (
    <div
      data-slot="custom-field-definitions-page"
      className={cn("flex flex-col gap-6 p-6", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight">{pageMessages.title}</h2>
          <p className="text-sm text-muted-foreground">{pageMessages.description}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(undefined)
            setSheetOpen(true)
          }}
        >
          <Plus className="mr-1.5 size-3.5" />
          {pageMessages.addField}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {pageMessages.entityFilterLabel}
        </Label>
        <Select
          value={entityFilter}
          onValueChange={(value) => {
            setEntityFilter((value ?? ALL_ENTITIES) as EntityType | typeof ALL_ENTITIES)
            setPageIndex(0)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ENTITIES}>{pageMessages.allEntities}</SelectItem>
            {entityTypes.map((entityType) => (
              <SelectItem key={entityType} value={entityType}>
                {entityLabels[entityType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            {pageMessages.loadFailed}{" "}
            {query.error instanceof Error ? query.error.message : pageMessages.requestFailed}
          </AlertDescription>
        </Alert>
      ) : query.isPending ? (
        <CustomFieldDefinitionsSkeleton />
      ) : (
        <div className="rounded-md border bg-card text-card-foreground shadow-sm">
          {definitions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <p className="text-sm font-medium">{pageMessages.emptyTitle}</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {pageMessages.emptyDescription}
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {definitions.map((definition) => (
                <div
                  key={definition.id}
                  className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{definition.label}</span>
                      <Badge variant="outline">{entityLabels[definition.entityType]}</Badge>
                      <Badge variant="secondary">{fieldTypeLabels[definition.fieldType]}</Badge>
                      {definition.isRequired ? <Badge>{pageMessages.requiredBadge}</Badge> : null}
                      {definition.isSearchable ? (
                        <Badge variant="outline">{pageMessages.searchableBadge}</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono">{definition.key}</span>
                      {definition.options?.length ? (
                        <span>
                          {pageMessages.optionCount.replace(
                            "{count}",
                            String(definition.options.length),
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(definition)
                          setSheetOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                        {pageMessages.edit}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={remove.isPending}
                        onClick={() => setDeleting(definition)}
                      >
                        <Trash2 className="size-4" />
                        {pageMessages.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          {messages.common.pageSummary
            .replace("{shown}", String(definitions.length))
            .replace("{total}", String(total))}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            {messages.common.previous}
          </Button>
          <span>
            {messages.common.page} {pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(pageIndex + 1) * pageSize >= total}
            onClick={() => setPageIndex((current) => current + 1)}
          >
            {messages.common.next}
          </Button>
        </div>
      </div>

      <CustomFieldDefinitionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        definition={editing}
        onSuccess={() => {
          setSheetOpen(false)
          setEditing(undefined)
          void query.refetch()
        }}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{pageMessages.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {pageMessages.deleteDescription.replace("{label}", deleting?.label ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {messages.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending || !deleting}
              onClick={async () => {
                if (!deleting) return
                await remove.mutateAsync(deleting.id)
                setDeleting(undefined)
                void query.refetch()
              }}
            >
              {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pageMessages.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CustomFieldDefinitionsSkeleton() {
  const rows = ["first", "second", "third", "fourth", "fifth"]

  return (
    <div className="rounded-md border bg-card text-card-foreground shadow-sm">
      {rows.map((row) => (
        <div
          key={row}
          className="flex items-center justify-between border-b px-6 py-4 last:border-b-0"
        >
          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-3 w-72 rounded bg-muted" />
          </div>
          <div className="h-8 w-8 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

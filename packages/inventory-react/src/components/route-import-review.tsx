"use client"

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from "@voyant-travel/ui/components"
import { cn } from "@voyant-travel/ui/lib/utils"
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useState } from "react"

import { useRouteImportDraftMutation } from "../hooks/use-route-import-draft-mutation.js"
import { useRouteImportDraft } from "../hooks/use-route-import-drafts.js"
import { useProductsUiMessagesOrDefault } from "../i18n/index.js"

/** 只读取要展示的字段。草稿的完整结构由后端定义,这里不重复维护。 */
interface ReviewDraft {
  brand?: string | null
  title?: string
  tags?: string[]
  days?: number | null
  nights?: number | null
  startCity?: string | null
  endCity?: string | null
  inclusionsHtml?: string | null
  exclusionsHtml?: string | null
  termsHtml?: string | null
  unresolved?: { field: string; reason: string; excerpt?: string | null }[]
  itinerary?: ReviewDay[]
}

interface ReviewDay {
  dayNumber: number
  title?: string
  routeChain?: string[]
  distanceKm?: number | null
  driveMinutes?: number | null
  meals?: { breakfast?: string | null; lunch?: string | null; dinner?: string | null }
  accommodation?: string | null
  bodyHtml?: string
  pois?: { name: string; descriptionHtml?: string }[]
}

export interface RouteImportReviewProps {
  draftId: string
  onBack?: () => void
  onProductOpen?: (productId: string) => void
  className?: string
}

export function RouteImportReview({
  draftId,
  onBack,
  onProductOpen,
  className,
}: RouteImportReviewProps) {
  const messages = useProductsUiMessagesOrDefault().routeImportPage
  const detail = useRouteImportDraft(draftId)
  const { commit, discard } = useRouteImportDraftMutation()
  const [issues, setIssues] = useState<unknown[] | null>(null)

  if (detail.isLoading) {
    return (
      <div className={cn("flex flex-col gap-4 p-6", className)}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const row = detail.data?.data
  if (!row) return null

  const draft = (row.draft ?? {}) as ReviewDraft
  const days = draft.itinerary ?? []
  const unresolved = draft.unresolved ?? []
  const committed = row.status === "committed"

  const runCommit = () => {
    setIssues(null)
    commit.mutate(
      { id: draftId },
      {
        // 422 带着问题清单回来,草稿仍可编辑,原样列出来让人照着改。
        onError: (cause) => {
          const body = (cause as { body?: { issues?: unknown[] } }).body
          setIssues(body?.issues ?? [])
        },
      },
    )
  }

  return (
    <div data-slot="route-import-review" className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {messages.detail.back}
        </Button>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{draft.title || row.sourceFilename}</h1>
          <Badge variant="outline">
            {messages.status[row.status as keyof typeof messages.status] ?? row.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {messages.detail.sourceFile}: {row.sourceFilename}
        </p>
      </div>

      {unresolved.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{messages.detail.unresolved}</AlertTitle>
          <AlertDescription>
            <p>{messages.detail.unresolvedHint}</p>
            <ul className="mt-2 list-disc pl-4">
              {unresolved.map((item) => (
                <li key={`${item.field}-${item.reason}`}>
                  <span className="font-medium">{item.field}</span> — {item.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {committed && row.productId ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>{messages.detail.committed}</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onProductOpen?.(row.productId as string)}
            >
              {messages.detail.openProduct}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{messages.detail.routeMap}</CardTitle>
        </CardHeader>
        <CardContent>
          {row.routeMapSvg ? (
            // 用 <img> 而不是内联 SVG:<img> 里的 SVG 按规范不执行脚本,
            // 而图上的城市名来自上传的文档,等同于外部输入。
            <img
              src={svgDataUri(row.routeMapSvg)}
              alt={draft.title ?? messages.detail.routeMap}
              className="max-w-full"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{messages.detail.routeMapEmpty}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.detail.basics}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Fact label={messages.columns.route} value={draft.title} />
          <Fact
            label={messages.columns.days}
            value={
              draft.days != null && draft.nights != null ? `${draft.days} / ${draft.nights}` : null
            }
          />
          <Fact
            label={messages.detail.routeMap}
            value={
              draft.startCity && draft.endCity ? `${draft.startCity} → ${draft.endCity}` : null
            }
          />
          {draft.tags && draft.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 sm:col-span-2">
              {draft.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.detail.itinerary}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {days.map((day) => (
            <DayBlock key={day.dayNumber} day={day} messages={messages} />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <HtmlCard
          title={messages.detail.inclusions}
          html={draft.inclusionsHtml}
          empty={messages.detail.noContent}
        />
        <HtmlCard
          title={messages.detail.exclusions}
          html={draft.exclusionsHtml}
          empty={messages.detail.noContent}
        />
      </div>
      <HtmlCard
        title={messages.detail.terms}
        html={draft.termsHtml}
        empty={messages.detail.noContent}
      />

      {issues ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{messages.detail.commitFailed}</AlertTitle>
          <AlertDescription>
            <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(issues, null, 2)}</pre>
          </AlertDescription>
        </Alert>
      ) : null}

      {!committed ? (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runCommit} disabled={commit.isPending}>
              {commit.isPending ? messages.detail.committing : messages.detail.commit}
            </Button>
            <Button
              variant="outline"
              onClick={() => discard.mutate({ id: draftId })}
              disabled={discard.isPending}
            >
              {messages.detail.discard}
            </Button>
            <p className="text-sm text-muted-foreground">{messages.detail.commitHint}</p>
          </div>
        </>
      ) : null}
    </div>
  )
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function DayBlock({
  day,
  messages,
}: {
  day: ReviewDay
  messages: ReturnType<typeof useProductsUiMessagesOrDefault>["routeImportPage"]
}) {
  const meals = [day.meals?.breakfast, day.meals?.lunch, day.meals?.dinner].filter(Boolean)
  const travel = [
    day.distanceKm != null ? `${day.distanceKm} km` : null,
    day.driveMinutes != null ? `${(day.driveMinutes / 60).toFixed(1)} h` : null,
  ].filter(Boolean)

  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <Badge variant="secondary">
          {messages.detail.day.replace("{day}", String(day.dayNumber))}
        </Badge>
        <span className="font-medium">{day.title}</span>
      </div>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
        <Fact label={messages.detail.meals} value={meals.join(" / ") || null} />
        <Fact label={messages.detail.accommodation} value={day.accommodation ?? null} />
        <Fact label={messages.detail.distance} value={travel.join(" · ") || null} />
      </dl>
    </div>
  )
}

function HtmlCard({ title, html, empty }: { title: string; html?: string | null; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {html ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 解析器产出的受控标签集(p/ul/li/strong),原文已逐字符转义 -- owner: inventory-react; 与产品详情页渲染费用条款的做法一致。
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  )
}

/** SVG 走 data URI 交给 <img>,而不是内联进 DOM。 */
function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

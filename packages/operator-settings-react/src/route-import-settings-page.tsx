"use client"

/**
 * 设置 → 线路上线助理。
 *
 * 只放「全公司一个值、几乎不变」的参数。供应商是个例外:它随每份资料变,
 * 这里存的只是复核界面的默认选中项,人在确认前可以当场改——做成纯设置项
 * 会逼着操作员「改设置 → 上传 → 改回来」,早晚挂错。
 *
 * 页面顶部显示接口算出的 `resolved`,而不是让人对着一堆空输入框猜「那到底
 * 会用什么值」。解析只有服务端一处实现,界面不自己再算一遍。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useOperatorAdminMessages } from "@voyant-travel/admin/providers/operator-admin-messages"
import { useVoyantReactContext } from "@voyant-travel/react"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@voyant-travel/ui/components"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const PATH = "/v1/admin/settings/route-import"

interface RouteImportSettingsRow {
  sellCurrency: string | null
  timezone: string | null
  productTypeId: string | null
  defaultSupplierId: string | null
  adultMinAge: number | null
  childMinAge: number | null
}

interface RouteImportResolved {
  sellCurrency: string
  timezone: string
  productTypeId: string | null
  defaultSupplierId: string | null
  adultMinAge: number
  childMinAge: number
}

interface RouteImportSettingsResponse {
  data: RouteImportSettingsRow | null
  resolved: RouteImportResolved
}

/** 表单以字符串持有,空串即「未设置」,提交时再转回 null。 */
interface FormState {
  sellCurrency: string
  timezone: string
  productTypeId: string
  defaultSupplierId: string
  adultMinAge: string
  childMinAge: string
}

const EMPTY_FORM: FormState = {
  sellCurrency: "",
  timezone: "",
  productTypeId: "",
  defaultSupplierId: "",
  adultMinAge: "",
  childMinAge: "",
}

function toForm(row: RouteImportSettingsRow | null): FormState {
  if (!row) return EMPTY_FORM
  return {
    sellCurrency: row.sellCurrency ?? "",
    timezone: row.timezone ?? "",
    productTypeId: row.productTypeId ?? "",
    defaultSupplierId: row.defaultSupplierId ?? "",
    adultMinAge: row.adultMinAge == null ? "" : String(row.adultMinAge),
    childMinAge: row.childMinAge == null ? "" : String(row.childMinAge),
  }
}

/** 空串提交成 null(清空),而不是空字符串——两者在服务端语义不同。 */
function textOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function RouteImportSettingsPage() {
  const { baseUrl, fetcher } = useVoyantReactContext()
  const messages = useOperatorAdminMessages().settings
  const page = messages.routeImportPage
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const settings = useQuery({
    queryKey: ["voyant", "settings", "route-import"],
    queryFn: async (): Promise<RouteImportSettingsResponse> => {
      const response = await fetcher(`${baseUrl}${PATH}`)
      if (!response.ok) throw new Error(String(response.status))
      return response.json() as Promise<RouteImportSettingsResponse>
    },
  })

  // 取到之后回填一次。之后以本地编辑为准,免得后台刷新把人正在改的内容盖掉。
  useEffect(() => {
    if (settings.data) setForm(toForm(settings.data.data))
  }, [settings.data])

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetcher(`${baseUrl}${PATH}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellCurrency: textOrNull(form.sellCurrency),
          timezone: textOrNull(form.timezone),
          productTypeId: textOrNull(form.productTypeId),
          defaultSupplierId: textOrNull(form.defaultSupplierId),
          adultMinAge: numberOrNull(form.adultMinAge),
          childMinAge: numberOrNull(form.childMinAge),
        }),
      })
      if (!response.ok) throw new Error(String(response.status))
      return response.json() as Promise<RouteImportSettingsResponse>
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["voyant", "settings", "route-import"], next)
      toast.success(page.saved)
    },
  })

  const resolved = settings.data?.resolved

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
        <p className="text-sm text-muted-foreground">{page.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{page.resolvedTitle}</CardTitle>
          <CardDescription>{page.resolvedHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <Resolved label={page.sellCurrency} value={resolved?.sellCurrency} />
          <Resolved label={page.timezone} value={resolved?.timezone} />
          <Resolved
            label={page.adultMinAge}
            value={resolved == null ? undefined : String(resolved.adultMinAge)}
          />
          <Resolved
            label={page.childMinAge}
            value={resolved == null ? undefined : String(resolved.childMinAge)}
          />
          <Resolved label={page.productType} value={resolved?.productTypeId ?? page.unset} />
          <Resolved
            label={page.defaultSupplier}
            value={resolved?.defaultSupplierId ?? page.unset}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{page.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="route-import-currency"
            label={page.sellCurrency}
            value={form.sellCurrency}
            onChange={(sellCurrency) => setForm((prev) => ({ ...prev, sellCurrency }))}
            maxLength={3}
          />
          <Field
            id="route-import-timezone"
            label={page.timezone}
            value={form.timezone}
            onChange={(timezone) => setForm((prev) => ({ ...prev, timezone }))}
          />
          <Field
            id="route-import-adult-age"
            label={page.adultMinAge}
            value={form.adultMinAge}
            onChange={(adultMinAge) => setForm((prev) => ({ ...prev, adultMinAge }))}
            type="number"
            hint={page.ageHint}
          />
          <Field
            id="route-import-child-age"
            label={page.childMinAge}
            value={form.childMinAge}
            onChange={(childMinAge) => setForm((prev) => ({ ...prev, childMinAge }))}
            type="number"
          />
          <Field
            id="route-import-product-type"
            label={page.productType}
            value={form.productTypeId}
            onChange={(productTypeId) => setForm((prev) => ({ ...prev, productTypeId }))}
          />
          <Field
            id="route-import-supplier"
            label={page.defaultSupplier}
            value={form.defaultSupplierId}
            onChange={(defaultSupplierId) => setForm((prev) => ({ ...prev, defaultSupplierId }))}
            hint={page.supplierHint}
          />
        </CardContent>
      </Card>

      <div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || settings.isLoading}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {save.isPending ? page.saving : page.save}
        </Button>
      </div>
    </div>
  )
}

function Resolved({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type,
  maxLength,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  type?: string
  maxLength?: number
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        type={type}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

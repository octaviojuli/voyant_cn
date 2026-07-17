// @ts-nocheck -- legacy seed fixture typing cleanup is tracked separately from demo data edits.
/**
 * Operator demo zh-CN content-template seed helpers.
 *
 * Inserts Simplified Chinese (zh-CN) content templates for the three
 * customer-facing document surfaces — legal contracts (合同), finance
 * invoices (账单), and email notifications (通知) — so a Chinese-language
 * demo tenant renders localized documents end to end.
 *
 * Each function is independently invokable (a dedicated zh seed entrypoint
 * arrives in a later batch — nothing here is wired into `seed.ts` yet).
 * Callers pass a Drizzle client plus a context object; the functions return
 * the inserted template ids so the caller can wire follow-up data.
 *
 * Terminology follows docs/i18n-zh-glossary.md: 合同=Contract, 账单=Invoice
 * (never 发票), 收款=Payment, 付款计划=Payment Schedule, 订单=Booking,
 * 出行人=Traveler, 取消政策=Cancellation Policy. Bodies are LiquidJS
 * templates; date/amount filters pass "zh-CN" as the locale argument.
 */

import { invoiceTemplates } from "@voyant-travel/finance/schema"
import { contractTemplates, contractTemplateVersions } from "@voyant-travel/legal/schema"
import { notificationTemplates } from "@voyant-travel/notifications/schema"
import { eq } from "drizzle-orm"
import type { drizzle } from "drizzle-orm/postgres-js"

type Db = ReturnType<typeof drizzle>

export interface ZhCnTemplateSeedContext {
  /** Optional progress logger; defaults to console.log to match seed.ts. */
  log?: (message: string) => void
}

function resolveLog(ctx: ZhCnTemplateSeedContext) {
  return ctx.log ?? ((message: string) => console.log(message))
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT TEMPLATE (legal) — 旅游服务合同
// ─────────────────────────────────────────────────────────────────────────────

const ZH_CONTRACT_BODY = `# 旅游服务合同

**合同编号:** {{ contract.number }}
**签订日期:** {{ contract.date | format_date: "long", "zh-CN" }}
**订单编号:** {{ booking.bookingNumber }}

## 一、订单信息

- 产品名称:{{ booking.productName }}
- 出行日期:{{ booking.startDate | format_date: "long", "zh-CN" }}{% if booking.endDate %} 至 {{ booking.endDate | format_date: "long", "zh-CN" }}{% endif %}
- 出行人数:{{ booking.pax }} 人

## 二、出行人名单

主出行人:{{ leadTraveler.fullName }}

{% for t in travelers %}{{ forloop.index }}. {{ t.fullName }}{% if t.dateOfBirth %}(出生日期:{{ t.dateOfBirth | format_date: "short", "zh-CN" }}){% endif %}
{% endfor %}

## 三、费用与付款计划

- 合同总额:{{ booking.totalAmountCents | cents: booking.currency, "zh-CN" }}
- 已收款:{{ booking.paidAmountCents | cents: booking.currency, "zh-CN" }}{% if payment.latestCompleted %}(最近一笔通过{{ payment.latestCompleted.methodLabel }},{{ payment.latestCompleted.date | format_date: "long", "zh-CN" }}){% endif %}
{% if booking.depositAmountCents %}- 定金:{{ booking.depositAmountCents | cents: booking.currency, "zh-CN" }}{% if booking.depositDueDate %},应于 {{ booking.depositDueDate | format_date: "long", "zh-CN" }} 前支付{% endif %}
{% endif %}{% if booking.balanceAmountCents %}- 尾款:{{ booking.balanceAmountCents | cents: booking.currency, "zh-CN" }}{% if booking.balanceDueDate %},应于 {{ booking.balanceDueDate | format_date: "long", "zh-CN" }} 前支付{% endif %}
{% endif %}- 未结余额:{{ booking.amountDueCents | cents: booking.currency, "zh-CN" }}

## 四、取消政策

订单的取消与变更按双方确认的取消政策执行;具体条款以订单确认件及附件为准。
财务性冲销(账单作废、贷记单)不影响本合同项下已确认的服务安排,双方另行结算。

## 五、其他约定

1. 本合同自双方签署之日起生效。
2. 服务凭证将在履约安排确认后签发并送达出行人。
3. 本合同未尽事宜,双方友好协商解决。

**签署日期:** {{ contract.signedAt | format_date: "long", "zh-CN" }}
`

/**
 * Insert the default zh-CN customer contract template (scope `customer`
 * covers booking-generated contracts — the auto-generate subscriber renders
 * it for confirmed bookings). Returns the inserted template id.
 */
export async function seedZhContractTemplate(
  db: Db,
  ctx: ZhCnTemplateSeedContext = {},
): Promise<string> {
  const log = resolveLog(ctx)
  log("→ seeding zh-CN contract template…")

  const [template] = await db
    .insert(contractTemplates)
    .values({
      slug: "travel-services-contract-zh",
      name: "旅游服务合同(zh-CN)",
      scope: "customer",
      language: "zh-CN",
      description: "面向订单的简体中文默认合同模板(Markdown + Liquid)。",
      body: ZH_CONTRACT_BODY,
      isDefault: true,
      active: true,
    })
    .returning()

  const [version] = await db
    .insert(contractTemplateVersions)
    .values({
      templateId: template.id,
      version: 1,
      body: ZH_CONTRACT_BODY,
    })
    .returning()

  await db
    .update(contractTemplates)
    .set({ currentVersionId: version.id, updatedAt: new Date() })
    .where(eq(contractTemplates.id, template.id))

  return template.id
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE TEMPLATE (finance) — 账单
// ─────────────────────────────────────────────────────────────────────────────

const ZH_INVOICE_BODY = `# 账单

**账单编号:** {{ invoice.invoiceNumber }}
**开具日期:** {{ invoice.issueDate | format_date: "long", "zh-CN" }}
**到期日期:** {{ invoice.dueDate | format_date: "long", "zh-CN" }}
**订单参考:** {{ invoice.bookingId }}

## 行项目

| 项目 | 数量 | 单价 | 小计 |
| --- | --- | --- | --- |
{% for item in lineItems %}| {{ item.description }} | {{ item.quantity }} | {{ item.unitPriceCents | cents: invoice.currency, "zh-CN" }} | {{ item.totalCents | cents: invoice.currency, "zh-CN" }} |
{% endfor %}

## 汇总

- 小计:{{ invoice.subtotalCents | cents: invoice.currency, "zh-CN" }}
- 税额:{{ invoice.taxCents | cents: invoice.currency, "zh-CN" }}
- **合计:{{ invoice.totalCents | cents: invoice.currency, "zh-CN" }}**
- 已收款:{{ invoice.paidCents | cents: invoice.currency, "zh-CN" }}
- 未结余额:{{ invoice.balanceDueCents | cents: invoice.currency, "zh-CN" }}
{% if invoice.notes %}
## 备注

{{ invoice.notes }}
{% endif %}`

/**
 * Insert the default zh-CN invoice template. With the language-aware
 * default selection in `@voyant-travel/finance`, invoices whose language is
 * `zh-CN` (or `zh`) pick this template automatically when no explicit
 * template is set. Returns the inserted template id.
 */
export async function seedZhInvoiceTemplate(
  db: Db,
  ctx: ZhCnTemplateSeedContext = {},
): Promise<string> {
  const log = resolveLog(ctx)
  log("→ seeding zh-CN invoice template…")

  const [template] = await db
    .insert(invoiceTemplates)
    .values({
      name: "账单模板(zh-CN)",
      slug: "invoice-zh-cn",
      language: "zh-CN",
      bodyFormat: "markdown",
      body: ZH_INVOICE_BODY,
      isDefault: true,
      active: true,
    })
    .returning()

  return template.id
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION TEMPLATES (notifications) — 通知
// ─────────────────────────────────────────────────────────────────────────────

const ZH_BOOKING_CONFIRMATION_HTML = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>订单已确认</h1>
  <p>{{ customer.firstName | default: "尊敬的客户" }},您好!</p>
  <p>您的订单 <strong>{{ booking.reference }}</strong> 已确认,感谢您的预订。</p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 4px 0;">订单编号</td><td style="text-align: right;">{{ booking.reference }}</td></tr>
    <tr><td style="padding: 4px 0;">出行日期</td><td style="text-align: right;">{{ booking.startDate | date_format: "long", "zh-CN" }}</td></tr>
    <tr><td style="padding: 4px 0;">出行人数</td><td style="text-align: right;">{{ booking.pax }} 人</td></tr>
    <tr><td style="padding: 4px 0;"><strong>订单总额</strong></td><td style="text-align: right;"><strong>{{ booking.total | currency: booking.currency, "zh-CN" }}</strong></td></tr>
  </table>
  <p>服务凭证与行程详情将在出行前另行送达。如需变更或取消,请参阅订单的取消政策,或直接联系您的旅行顾问。</p>
  <p>祝您旅途愉快!</p>
</div>`

const ZH_BOOKING_CONFIRMATION_TEXT = `{{ customer.firstName | default: "尊敬的客户" }},您好!

您的订单 {{ booking.reference }} 已确认,感谢您的预订。

订单编号:{{ booking.reference }}
出行日期:{{ booking.startDate | date_format: "long", "zh-CN" }}
出行人数:{{ booking.pax }} 人
订单总额:{{ booking.total | currency: booking.currency, "zh-CN" }}

服务凭证与行程详情将在出行前另行送达。如需变更或取消,请参阅订单的取消政策,或直接联系您的旅行顾问。

祝您旅途愉快!`

const ZH_PAYMENT_RECEIPT_HTML = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>收款确认</h1>
  <p>{{ customer.firstName | default: "尊敬的客户" }},您好!</p>
  <p>我们已收到您针对订单 <strong>{{ booking.reference }}</strong> 的付款,特此确认。</p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 4px 0;">订单编号</td><td style="text-align: right;">{{ booking.reference }}</td></tr>
    <tr><td style="padding: 4px 0;"><strong>收款金额</strong></td><td style="text-align: right;"><strong>{{ payment.amount | currency: payment.currency, "zh-CN" }}</strong></td></tr>
    <tr><td style="padding: 4px 0;">账单编号</td><td style="text-align: right;">{{ invoice.number | default: "—" }}</td></tr>
    <tr><td style="padding: 4px 0;">账单未结余额</td><td style="text-align: right;">{{ invoice.balanceDueAmount | currency: invoice.currency, "zh-CN" }}</td></tr>
  </table>
  <p>若订单设有付款计划,后续各期款项将按计划另行提醒。如有疑问,请联系您的旅行顾问。</p>
</div>`

const ZH_PAYMENT_RECEIPT_TEXT = `{{ customer.firstName | default: "尊敬的客户" }},您好!

我们已收到您针对订单 {{ booking.reference }} 的付款,特此确认。

订单编号:{{ booking.reference }}
收款金额:{{ payment.amount | currency: payment.currency, "zh-CN" }}
账单编号:{{ invoice.number | default: "—" }}
账单未结余额:{{ invoice.balanceDueAmount | currency: invoice.currency, "zh-CN" }}

若订单设有付款计划,后续各期款项将按计划另行提醒。如有疑问,请联系您的旅行顾问。`

/**
 * Insert the zh-CN email notification templates using the per-locale slug
 * convention (`<base-slug>-zh`): booking confirmation (订单确认) and payment
 * receipt (收款确认). Returns the inserted template ids.
 */
export async function seedZhNotificationTemplates(
  db: Db,
  ctx: ZhCnTemplateSeedContext = {},
): Promise<string[]> {
  const log = resolveLog(ctx)
  log("→ seeding zh-CN notification templates…")

  const inserted = await db
    .insert(notificationTemplates)
    .values([
      {
        slug: "booking-confirmation-zh",
        name: "订单确认(zh-CN)",
        channel: "email",
        status: "active",
        subjectTemplate: "您的订单已确认 - {{ booking.reference }}",
        htmlTemplate: ZH_BOOKING_CONFIRMATION_HTML,
        textTemplate: ZH_BOOKING_CONFIRMATION_TEXT,
        metadata: { locale: "zh-CN", baseSlug: "booking-confirmation" },
      },
      {
        slug: "payment-receipt-zh",
        name: "收款确认(zh-CN)",
        channel: "email",
        status: "active",
        subjectTemplate: "收款确认 - {{ booking.reference }}",
        htmlTemplate: ZH_PAYMENT_RECEIPT_HTML,
        textTemplate: ZH_PAYMENT_RECEIPT_TEXT,
        metadata: { locale: "zh-CN", baseSlug: "payment-receipt" },
      },
    ])
    .returning()

  return inserted.map((row) => row.id)
}

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface ZhCnTemplateSeedResult {
  contractTemplateId: string
  invoiceTemplateId: string
  notificationTemplateIds: string[]
}

/** Seed all zh-CN content templates (contract, invoice, notifications). */
export async function seedZhCnTemplates(
  db: Db,
  ctx: ZhCnTemplateSeedContext = {},
): Promise<ZhCnTemplateSeedResult> {
  const contractTemplateId = await seedZhContractTemplate(db, ctx)
  const invoiceTemplateId = await seedZhInvoiceTemplate(db, ctx)
  const notificationTemplateIds = await seedZhNotificationTemplates(db, ctx)
  return { contractTemplateId, invoiceTemplateId, notificationTemplateIds }
}

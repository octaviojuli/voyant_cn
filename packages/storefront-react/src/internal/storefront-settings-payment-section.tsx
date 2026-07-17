import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Textarea,
} from "@voyant-travel/ui/components"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@voyant-travel/ui/components/field"
import { Loader2, Save } from "lucide-react"

import { useStorefrontSettingsUiMessagesOrDefault } from "../i18n/provider.js"
import { type FormState, paymentMethods } from "./storefront-settings-form.js"

type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void

export function PaymentSection({ form, setField }: { form: FormState; setField: SetField }) {
  const t = useStorefrontSettingsUiMessagesOrDefault().payment
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>{t.methodsLegend}</FieldLegend>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {paymentMethods.map((method) => (
                <Field key={method.code} orientation="horizontal">
                  <Checkbox
                    id={`storefront-payment-${method.code}`}
                    checked={form.enabledMethods[method.code]}
                    onCheckedChange={(checked) =>
                      setField("enabledMethods", {
                        ...form.enabledMethods,
                        [method.code]: checked === true,
                      })
                    }
                  />
                  <FieldLabel htmlFor={`storefront-payment-${method.code}`}>
                    {t.methodLabels[method.code]}
                  </FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="storefront-default-method">{t.defaultMethod}</FieldLabel>
              <select
                id="storefront-default-method"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={form.defaultMethod}
                onChange={(event) =>
                  setField("defaultMethod", event.target.value as FormState["defaultMethod"])
                }
              >
                <option value="none">{t.defaultMethodNone}</option>
                {paymentMethods.map((method) => (
                  <option key={method.code} value={method.code}>
                    {t.methodLabels[method.code]}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-payment-structure">{t.paymentStructure}</FieldLabel>
              <select
                id="storefront-payment-structure"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={form.paymentStructure}
                onChange={(event) =>
                  setField("paymentStructure", event.target.value as FormState["paymentStructure"])
                }
              >
                <option value="full">{t.structureLabels.full}</option>
                <option value="split">{t.structureLabels.split}</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-deposit-percent">{t.depositPercent}</FieldLabel>
              <Input
                id="storefront-deposit-percent"
                type="number"
                min={0}
                max={100}
                value={form.depositPercent}
                onChange={(event) => setField("depositPercent", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-balance-due">{t.balanceDueDays}</FieldLabel>
              <Input
                id="storefront-balance-due"
                type="number"
                min={0}
                value={form.balanceDueDaysBeforeDeparture}
                onChange={(event) => setField("balanceDueDaysBeforeDeparture", event.target.value)}
              />
            </Field>
          </div>

          <FieldSet>
            <FieldLegend>{t.bankDetailsLegend}</FieldLegend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="storefront-bank-provider">{t.provider}</FieldLabel>
                <Input
                  id="storefront-bank-provider"
                  value={form.bankProvider}
                  onChange={(event) => setField("bankProvider", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="storefront-bank-currency">{t.currency}</FieldLabel>
                <Input
                  id="storefront-bank-currency"
                  value={form.bankCurrency}
                  onChange={(event) => setField("bankCurrency", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="storefront-account-holder">{t.accountHolder}</FieldLabel>
                <Input
                  id="storefront-account-holder"
                  value={form.accountHolder}
                  onChange={(event) => setField("accountHolder", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="storefront-bank-name">{t.bankName}</FieldLabel>
                <Input
                  id="storefront-bank-name"
                  value={form.bankName}
                  onChange={(event) => setField("bankName", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="storefront-iban">{t.iban}</FieldLabel>
                <Input
                  id="storefront-iban"
                  value={form.iban}
                  onChange={(event) => setField("iban", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="storefront-bic">{t.bic}</FieldLabel>
                <Input
                  id="storefront-bic"
                  value={form.bic}
                  onChange={(event) => setField("bic", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="storefront-bank-due-days">{t.dueDays}</FieldLabel>
                <Input
                  id="storefront-bank-due-days"
                  type="number"
                  min={0}
                  value={form.bankTransferDueDays}
                  onChange={(event) => setField("bankTransferDueDays", event.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="storefront-payment-reference">{t.paymentReference}</FieldLabel>
              <Input
                id="storefront-payment-reference"
                value={form.paymentReference}
                onChange={(event) => setField("paymentReference", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-bank-instructions">{t.instructions}</FieldLabel>
              <Textarea
                id="storefront-bank-instructions"
                value={form.bankInstructions}
                onChange={(event) => setField("bankInstructions", event.target.value)}
              />
            </Field>
          </FieldSet>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export function StorefrontSettingsSaveButton({
  isSaving,
  save,
}: {
  isSaving: boolean
  save: () => void
}) {
  const t = useStorefrontSettingsUiMessagesOrDefault().save
  return (
    <div className="flex justify-end">
      <Button type="button" onClick={save} disabled={isSaving}>
        {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {t.button}
      </Button>
    </div>
  )
}

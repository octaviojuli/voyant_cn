"use client"

import {
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from "@voyant-travel/ui/components"
import { buttonVariants } from "@voyant-travel/ui/components/button"
import {
  BriefcaseBusiness,
  Calendar,
  CircleDot,
  Globe,
  Languages,
  Mail,
  Phone,
  Tag,
  User,
  Users,
} from "lucide-react"
import type { ReactNode } from "react"

import { useCrmUiI18nOrDefault } from "../i18n/index.js"
import type { UpdatePersonInput } from "../index.js"
import { InlineCurrencyField } from "./inline-currency-field.js"
import { InlineField } from "./inline-field.js"
import { InlineLanguageField } from "./inline-language-field.js"
import { InlineSelectField } from "./inline-select-field.js"
import { initialsFrom, personDisplayName } from "./person-detail-panels.js"
import type { PersonData, PersonOrganization } from "./person-detail-types.js"
import { TagsEditor } from "./tags-editor.js"

export interface PersonSidebarProps {
  person: PersonData
  organization: PersonOrganization | null
  onOrganizationOpen?: (organizationId: string) => void
  onUpdateField: (patch: UpdatePersonInput) => Promise<void>
  children?: ReactNode
}

export function PersonSidebar({
  person,
  organization,
  onOrganizationOpen,
  onUpdateField,
  children,
}: PersonSidebarProps) {
  const { locale, messages } = useCrmUiI18nOrDefault()
  const displayName = personDisplayName(person, messages.personCard.unnamed, locale)
  const websiteHref = person.website
    ? person.website.startsWith("http")
      ? person.website
      : `https://${person.website}`
    : undefined
  const relationOptions = [
    { value: "client", label: messages.common.relationTypeLabels.client },
    { value: "partner", label: messages.common.relationTypeLabels.partner },
    { value: "supplier", label: messages.common.relationTypeLabels.supplier },
    { value: "other", label: messages.common.relationTypeLabels.other },
  ]
  const statusOptions = [
    { value: "active", label: messages.common.recordStatusLabels.active },
    { value: "inactive", label: messages.common.recordStatusLabels.inactive },
    { value: "archived", label: messages.common.recordStatusLabels.archived },
  ]

  return (
    <aside className="col-span-12 flex flex-col gap-4 lg:col-span-3">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <Avatar className="size-20">
            <AvatarFallback className="text-xl">{initialsFrom(displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex max-w-full flex-col gap-1">
            <h2 className="truncate text-lg font-semibold leading-tight">{displayName}</h2>
            {person.jobTitle ? (
              <p className="truncate text-sm text-muted-foreground">{person.jobTitle}</p>
            ) : null}
            {organization ? (
              <button
                type="button"
                onClick={() => onOrganizationOpen?.(organization.id)}
                className="truncate text-sm text-primary hover:underline"
              >
                {organization.name}
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {person.relation ? (
              <Badge variant="secondary">
                {messages.common.relationTypeLabels[
                  person.relation as keyof typeof messages.common.relationTypeLabels
                ] ?? person.relation}
              </Badge>
            ) : null}
            <Badge variant="outline">
              {messages.common.recordStatusLabels[
                person.status as keyof typeof messages.common.recordStatusLabels
              ] ?? person.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {messages.personDetail.sidebar.about}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          <InlineField
            icon={User}
            label={messages.personDetail.sidebar.fields.firstName}
            value={person.firstName}
            onSave={(next) => onUpdateField({ firstName: next ?? person.firstName })}
          />
          <InlineField
            icon={User}
            label={messages.personDetail.sidebar.fields.lastName}
            value={person.lastName}
            onSave={(next) => onUpdateField({ lastName: next ?? person.lastName })}
          />
          <InlineField
            icon={BriefcaseBusiness}
            label={messages.personDetail.sidebar.fields.jobTitle}
            value={person.jobTitle}
            onSave={(next) => onUpdateField({ jobTitle: next })}
          />
          <InlineField
            icon={Mail}
            label={messages.personDetail.sidebar.fields.email}
            kind="email"
            value={person.email}
            onSave={(next) => onUpdateField({ email: next })}
          />
          <InlineField
            icon={Phone}
            label={messages.personDetail.sidebar.fields.phone}
            value={person.phone}
            onSave={(next) => onUpdateField({ phone: next })}
          />
          <InlineField
            icon={Globe}
            label={messages.personDetail.sidebar.fields.website}
            kind="url"
            value={person.website}
            onSave={(next) => onUpdateField({ website: next })}
          />
          <InlineSelectField
            icon={Users}
            label={messages.personDetail.sidebar.fields.relation}
            value={person.relation}
            options={relationOptions}
            onSave={(next) => onUpdateField({ relation: next })}
          />
          <InlineSelectField
            icon={CircleDot}
            label={messages.personDetail.sidebar.fields.status}
            value={person.status}
            options={statusOptions}
            allowClear={false}
            onSave={(next) => onUpdateField({ status: next ?? "active" })}
          />
          <InlineCurrencyField
            label={messages.personDetail.sidebar.fields.preferredCurrency}
            value={person.preferredCurrency}
            onSave={(next) => onUpdateField({ preferredCurrency: next })}
          />
          <InlineLanguageField
            icon={Languages}
            label={messages.personDetail.sidebar.fields.preferredLanguage}
            value={person.preferredLanguage}
            onSave={(next) => onUpdateField({ preferredLanguage: next })}
          />
          <InlineField
            icon={Calendar}
            label={messages.personDetail.sidebar.fields.dateOfBirth}
            value={person.dateOfBirth}
            onSave={(next) => onUpdateField({ dateOfBirth: next })}
          />
          <InlineField
            icon={Tag}
            label={messages.personDetail.sidebar.fields.source}
            value={person.source}
            onSave={(next) => onUpdateField({ source: next })}
          />
        </CardContent>
      </Card>

      {websiteHref ? (
        <a
          href={websiteHref}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Globe className="size-4" aria-hidden="true" />
          {messages.personDetail.sidebar.openWebsite}
        </a>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {messages.personDetail.sidebar.tags}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TagsEditor tags={person.tags} onChange={(tags) => onUpdateField({ tags })} />
        </CardContent>
      </Card>

      {children}
    </aside>
  )
}

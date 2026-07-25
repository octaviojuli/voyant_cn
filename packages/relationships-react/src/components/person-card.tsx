"use client"

import { Avatar, AvatarFallback } from "@voyant-travel/ui/components/avatar"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Card, CardContent, CardHeader } from "@voyant-travel/ui/components/card"
import { cn } from "@voyant-travel/ui/lib/utils"
import { Mail, Phone } from "lucide-react"
import type * as React from "react"
import { useCrmUiI18nOrDefault } from "../i18n/index.js"
import type { CrmRelationType } from "../i18n/messages.js"
import type { PersonRecord } from "../index.js"

export interface PersonCardProps extends React.ComponentPropsWithoutRef<typeof Card> {
  person: PersonRecord
  onEdit?: (person: PersonRecord) => void
}

export function PersonCard({ person, onEdit, className, ...props }: PersonCardProps) {
  const { formatPersonName, messages } = useCrmUiI18nOrDefault()
  const fullName = formatPersonName(person)
  const initials = [person.firstName?.[0], person.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase()
  return (
    <Card
      data-slot="person-card"
      className={cn("overflow-hidden", className)}
      onClick={onEdit ? () => onEdit(person) : undefined}
      {...props}
    >
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar data-slot="person-card-avatar" className="size-12">
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{fullName || messages.personCard.unnamed}</div>
          {person.jobTitle ? (
            <div className="text-sm text-muted-foreground truncate">{person.jobTitle}</div>
          ) : null}
        </div>
        {person.relation ? (
          <Badge data-slot="person-card-relation" variant="secondary" className="capitalize">
            {messages.common.relationTypeLabels[person.relation as CrmRelationType] ??
              person.relation}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {person.email ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{person.email}</span>
          </div>
        ) : null}
        {person.phone ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{person.phone}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

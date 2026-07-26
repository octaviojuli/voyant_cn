import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@voyant-travel/ui/components"
import { useProductDetailMessages } from "./host.js"

import {
  type AvailabilityRule,
  ScheduleForm,
  type ScheduleFormSaveResult,
} from "./product-schedule-form.js"

export type { AvailabilityRule, ScheduleFormSaveResult }

type ScheduleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  rule?: AvailabilityRule
  onSuccess: (result: ScheduleFormSaveResult) => void
}

export function ScheduleDialog({
  open,
  onOpenChange,
  productId,
  rule,
  onSuccess,
}: ScheduleDialogProps) {
  const messages = useProductDetailMessages()
  const scheduleMessages = messages.products.operations.schedules
  const isEditing = !!rule

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? scheduleMessages.editTitle : scheduleMessages.newTitle}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <ScheduleForm
            productId={productId}
            rule={rule}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

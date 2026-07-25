import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { formatMessage } from "@voyant-travel/i18n"
import { ConfirmActionButton, SelectionActionBar } from "@voyant-travel/ui/components"
import { DataTable } from "@voyant-travel/ui/components/data-table"
import { TabsContent } from "@voyant-travel/ui/components/tabs"
import { useDistributionUiI18nOrDefault } from "../i18n/index.js"
import type { DistributionEntity } from "../i18n/messages.js"
import { formatDistributionCount, formatDistributionSummary } from "../i18n/utils.js"
import { SectionHeader } from "./distribution-section-header.js"
import type {
  ChannelCommissionRuleRow,
  ChannelContractRow,
  ChannelRow,
  ProductOption,
  SupplierOption,
} from "./distribution-shared.js"
import { channelColumns, commissionColumns, contractColumns } from "./distribution-shared.js"

type BulkFn = (args: {
  ids: string[]
  endpoint: string
  target: string
  noun: DistributionEntity
  payload: Record<string, unknown>
  successVerb: string
  clearSelection: () => void
}) => Promise<void> // i18n-literal-ok type annotation

type DeleteFn = (args: {
  ids: string[]
  endpoint: string
  target: string
  noun: DistributionEntity
  clearSelection: () => void
}) => Promise<void> // i18n-literal-ok type annotation

function getSelectionSummary(count: number, template: string) {
  return formatDistributionSummary(template, { count })
}

export function DistributionChannelsTab(props: {
  filteredChannels: ChannelRow[]
  channelSelection: RowSelectionState
  setChannelSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkUpdate: BulkFn
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onOpenRoute: (channelId: string) => void
  onEdit: (row: ChannelRow) => void
}) {
  const i18n = useDistributionUiI18nOrDefault()
  const { messages } = i18n
  const tab = messages.tabs.channels

  return (
    <TabsContent value="channels" className="space-y-4">
      <SectionHeader
        title={tab.title}
        description={tab.description}
        actionLabel={tab.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={channelColumns(props.onOpenRoute, i18n)}
        data={props.filteredChannels}
        emptyMessage={tab.empty}
        paginationMessages={i18n.messages.common.pagination}
        enableRowSelection
        getRowId={(row) => row.id}
        rowSelection={props.channelSelection}
        onRowSelectionChange={props.setChannelSelection}
        renderSelectionActions={({ selectedRows, clearSelection }) => {
          const countLabel = formatDistributionCount(messages, "channel", selectedRows.length)

          return (
            <SelectionActionBar
              selectedCount={selectedRows.length}
              onClear={clearSelection}
              selectionSummary={getSelectionSummary(
                selectedRows.length,
                messages.common.selectionSummary,
              )}
              clearLabel={messages.common.clearSelection}
            >
              <ConfirmActionButton
                buttonLabel={tab.actions.activate.button}
                confirmLabel={tab.actions.activate.confirm}
                cancelLabel={messages.common.cancel}
                title={formatMessage(tab.actions.activate.title, { countLabel })}
                description={tab.actions.activate.description}
                disabled={props.bulkActionTarget === "channels-activate"}
                onConfirm={() =>
                  props.handleBulkUpdate({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/distribution/channels",
                    target: "channels-activate",
                    noun: "channel",
                    payload: { status: "active" },
                    successVerb: messages.page.bulkVerbs.activated,
                    clearSelection,
                  })
                }
              />
              <ConfirmActionButton
                buttonLabel={tab.actions.archive.button}
                confirmLabel={tab.actions.archive.confirm}
                cancelLabel={messages.common.cancel}
                title={formatMessage(tab.actions.archive.title, { countLabel })}
                description={tab.actions.archive.description}
                disabled={props.bulkActionTarget === "channels-archive"}
                onConfirm={() =>
                  props.handleBulkUpdate({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/distribution/channels",
                    target: "channels-archive",
                    noun: "channel",
                    payload: { status: "archived" },
                    successVerb: messages.page.bulkVerbs.archived,
                    clearSelection,
                  })
                }
              />
              <ConfirmActionButton
                buttonLabel={tab.actions.delete.button}
                confirmLabel={tab.actions.delete.confirm}
                cancelLabel={messages.common.cancel}
                title={formatMessage(tab.actions.delete.title, { countLabel })}
                description={tab.actions.delete.description}
                disabled={props.bulkActionTarget === "channels-delete"}
                variant="destructive"
                confirmVariant="destructive"
                onConfirm={() =>
                  props.handleBulkDelete({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/distribution/channels",
                    target: "channels-delete",
                    noun: "channel",
                    clearSelection,
                  })
                }
              />
            </SelectionActionBar>
          )
        }}
        onRowClick={(row) => props.onEdit(row.original)}
      />
    </TabsContent>
  )
}

export function DistributionContractsTab(props: {
  channels: ChannelRow[]
  suppliers: SupplierOption[]
  filteredContracts: ChannelContractRow[]
  contractSelection: RowSelectionState
  setContractSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkUpdate: BulkFn
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onOpenRoute: (contractId: string) => void
  onEdit: (row: ChannelContractRow) => void
}) {
  const i18n = useDistributionUiI18nOrDefault()
  const { messages } = i18n
  const tab = messages.tabs.contracts

  return (
    <TabsContent value="contracts" className="space-y-4">
      <SectionHeader
        title={tab.title}
        description={tab.description}
        actionLabel={tab.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={contractColumns(props.channels, props.suppliers, props.onOpenRoute, i18n)}
        data={props.filteredContracts}
        emptyMessage={tab.empty}
        paginationMessages={i18n.messages.common.pagination}
        enableRowSelection
        getRowId={(row) => row.id}
        rowSelection={props.contractSelection}
        onRowSelectionChange={props.setContractSelection}
        renderSelectionActions={({ selectedRows, clearSelection }) => {
          const countLabel = formatDistributionCount(messages, "contract", selectedRows.length)

          return (
            <SelectionActionBar
              selectedCount={selectedRows.length}
              onClear={clearSelection}
              selectionSummary={getSelectionSummary(
                selectedRows.length,
                messages.common.selectionSummary,
              )}
              clearLabel={messages.common.clearSelection}
            >
              <ConfirmActionButton
                buttonLabel={tab.actions.activate.button}
                confirmLabel={tab.actions.activate.confirm}
                cancelLabel={messages.common.cancel}
                title={formatMessage(tab.actions.activate.title, { countLabel })}
                description={tab.actions.activate.description}
                disabled={props.bulkActionTarget === "contracts-activate"}
                onConfirm={() =>
                  props.handleBulkUpdate({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/distribution/contracts",
                    target: "contracts-activate",
                    noun: "contract",
                    payload: { status: "active" },
                    successVerb: messages.page.bulkVerbs.activated,
                    clearSelection,
                  })
                }
              />
              <ConfirmActionButton
                buttonLabel={tab.actions.expire.button}
                confirmLabel={tab.actions.expire.confirm}
                cancelLabel={messages.common.cancel}
                title={formatMessage(tab.actions.expire.title, { countLabel })}
                description={tab.actions.expire.description}
                disabled={props.bulkActionTarget === "contracts-expire"}
                onConfirm={() =>
                  props.handleBulkUpdate({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/distribution/contracts",
                    target: "contracts-expire",
                    noun: "contract",
                    payload: { status: "expired" },
                    successVerb: messages.page.bulkVerbs.expired,
                    clearSelection,
                  })
                }
              />
              <ConfirmActionButton
                buttonLabel={tab.actions.delete.button}
                confirmLabel={tab.actions.delete.confirm}
                cancelLabel={messages.common.cancel}
                title={formatMessage(tab.actions.delete.title, { countLabel })}
                description={tab.actions.delete.description}
                disabled={props.bulkActionTarget === "contracts-delete"}
                variant="destructive"
                confirmVariant="destructive"
                onConfirm={() =>
                  props.handleBulkDelete({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/distribution/contracts",
                    target: "contracts-delete",
                    noun: "contract",
                    clearSelection,
                  })
                }
              />
            </SelectionActionBar>
          )
        }}
        onRowClick={(row) => props.onEdit(row.original)}
      />
    </TabsContent>
  )
}

export function DistributionCommissionsTab(props: {
  contracts: ChannelContractRow[]
  products: ProductOption[]
  filteredCommissionRules: ChannelCommissionRuleRow[]
  commissionSelection: RowSelectionState
  setCommissionSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onOpenRoute: (commissionRuleId: string) => void
  onEdit: (row: ChannelCommissionRuleRow) => void
}) {
  const i18n = useDistributionUiI18nOrDefault()
  const { messages } = i18n
  const tab = messages.tabs.commissions

  return (
    <TabsContent value="commissions" className="space-y-4">
      <SectionHeader
        title={tab.title}
        description={tab.description}
        actionLabel={tab.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={commissionColumns(props.contracts, props.products, props.onOpenRoute, i18n)}
        data={props.filteredCommissionRules}
        emptyMessage={tab.empty}
        paginationMessages={i18n.messages.common.pagination}
        enableRowSelection
        getRowId={(row) => row.id}
        rowSelection={props.commissionSelection}
        onRowSelectionChange={props.setCommissionSelection}
        renderSelectionActions={({ selectedRows, clearSelection }) => {
          const countLabel = formatDistributionCount(
            messages,
            "commissionRule",
            selectedRows.length,
          )

          return (
            <SelectionActionBar
              selectedCount={selectedRows.length}
              onClear={clearSelection}
              selectionSummary={getSelectionSummary(
                selectedRows.length,
                messages.common.selectionSummary,
              )}
              clearLabel={messages.common.clearSelection}
            >
              <ConfirmActionButton
                buttonLabel={tab.actions.delete.button}
                confirmLabel={tab.actions.delete.confirm}
                cancelLabel={messages.common.cancel}
                title={formatMessage(tab.actions.delete.title, { countLabel })}
                description={tab.actions.delete.description}
                disabled={props.bulkActionTarget === "commission-rules-delete"}
                variant="destructive"
                confirmVariant="destructive"
                onConfirm={() =>
                  props.handleBulkDelete({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/distribution/commission-rules",
                    target: "commission-rules-delete",
                    noun: "commissionRule",
                    clearSelection,
                  })
                }
              />
            </SelectionActionBar>
          )
        }}
        onRowClick={(row) => props.onEdit(row.original)}
      />
    </TabsContent>
  )
}

import type { ResourceAllocationRow, ResourceRow, ResourceSlotAssignmentRow } from "../index.js"

export type ResourceKind = ResourceRow["kind"]
export type AllocationMode = ResourceAllocationRow["allocationMode"]
export type AssignmentStatus = ResourceSlotAssignmentRow["status"]

type SelectionNoun = {
  singular: string
  plural: string
}

type BulkActionMessages = {
  buttonLabel: string
  confirmLabel: string
  title: string
  description: string
  successVerb: string
}

export type ResourcesUiMessages = {
  common: {
    edit: string
    open: string
    view: string
    cancel: string
    pagination: {
      showing: string
      page: string
      previous: string
      next: string
    }
    clearSelection: string
    clearFilters: string
    selectionSummary: string
    selectionLabel: string
    slotLabel: string
    dateTimeFallback: string
    resourceKindLabels: Record<ResourceKind, string>
    allocationModeLabels: Record<AllocationMode, string>
    assignmentStatusLabels: Record<AssignmentStatus, string>
    active: string
    inactive: string
    allKinds: string
    selectionNouns: {
      resource: SelectionNoun
      pool: SelectionNoun
      allocation: SelectionNoun
      assignment: SelectionNoun
      closeout: SelectionNoun
    }
  }
  resourcesPage: {
    title: string
    description: string
    loading: string
    loadFailed: string
    filters: {
      searchPlaceholder: string
      button: string
      clear: string
      activeLabel: string
      activeAll: string
      activeOnly: string
      inactiveOnly: string
      supplierLabel: string
      supplierAny: string
      supplierEmpty: string
      productLabel: string
      productAny: string
      productEmpty: string
      assignmentStatusLabel: string
      assignmentStatusAll: string
      noAdditionalFilters: string
    }
    tabs: {
      resources: string
      pools: string
      allocations: string
      assignments: string
      closeouts: string
    }
  }
  overview: {
    metrics: {
      activeResources: {
        title: string
        description: string
      }
      activePools: {
        title: string
        description: string
      }
      liveAssignments: {
        title: string
        description: string
      }
      closeouts: {
        title: string
        description: string
      }
    }
    assignmentGaps: {
      title: string
      empty: string
      statusBooking: string
    }
    ownershipGaps: {
      title: string
      empty: string
      detail: string
    }
    filters: {
      searchPlaceholder: string
      allKindsPlaceholder: string
    }
    labels: {
      status: string
      booking: string
      capacity: string
      noSupplierAssigned: string
    }
  }
  tabsPrimary: {
    columns: {
      resources: {
        name: string
        kind: string
        supplier: string
        capacity: string
        status: string
        view: string
      }
      pools: {
        name: string
        kind: string
        product: string
        sharedCapacity: string
        view: string
      }
      allocations: {
        pool: string
        product: string
        mode: string
        quantityRequired: string
        priority: string
        view: string
      }
    }
    sections: {
      resources: {
        title: string
        description: string
        actionLabel: string
        emptyMessage: string
        actions: {
          activate: BulkActionMessages
          deactivate: BulkActionMessages
          delete: BulkActionMessages
        }
      }
      pools: {
        title: string
        description: string
        actionLabel: string
        emptyMessage: string
        actions: {
          activate: BulkActionMessages
          deactivate: BulkActionMessages
          delete: BulkActionMessages
        }
      }
      allocations: {
        title: string
        description: string
        actionLabel: string
        emptyMessage: string
        actions: {
          delete: BulkActionMessages
        }
      }
    }
  }
  tabsSecondary: {
    columns: {
      assignments: {
        slot: string
        resource: string
        booking: string
        status: string
        released: string
        view: string
      }
      closeouts: {
        resource: string
        date: string
        starts: string
        ends: string
        reason: string
      }
    }
    sections: {
      assignments: {
        title: string
        description: string
        actionLabel: string
        emptyMessage: string
        actions: {
          assign: BulkActionMessages
          release: BulkActionMessages
          delete: BulkActionMessages
        }
      }
      closeouts: {
        title: string
        description: string
        actionLabel: string
        emptyMessage: string
        actions: {
          delete: BulkActionMessages
        }
      }
    }
  }
  detailPages: {
    common: {
      backToResources: string
      booking: string
      capacity: string
      code: string
      created: string
      delete: string
      edit: string
      noBooking: string
      noPool: string
      noResource: string
      noRule: string
      noStartTime: string
      noValue: string
      notes: string
      openPool: string
      openProduct: string
      openResource: string
      openSlot: string
      openSupplier: string
      pool: string
      product: string
      quantity: string
      resource: string
      slot: string
      supplier: string
      to: string
      updated: string
    }
    resource: {
      assignmentsEmpty: string
      assignmentsTitle: string
      assignedBy: string
      closeoutsEmpty: string
      closeoutsTitle: string
      createdBy: string
      deleteConfirm: string
      deleteFailed: string
      detailsTitle: string
      loadFailed: string
      noSupplierAssigned: string
      notFound: string
      poolMembershipsEmpty: string
      poolMembershipsTitle: string
      removePoolMember: string
      released: string
    }
    pool: {
      allocationsEmpty: string
      allocationsTitle: string
      deleteConfirm: string
      deleteFailed: string
      detailsTitle: string
      liveAssignmentsEmpty: string
      liveAssignmentsTitle: string
      loadFailed: string
      membersEmpty: string
      membersTitle: string
      addMember: string
      addMemberPlaceholder: string
      memberAlreadyAssigned: string
      removeMember: string
      noResource: string
      notFound: string
      sharedCapacity: string
    }
    allocation: {
      deleteConfirm: string
      deleteFailed: string
      detailsTitle: string
      loadFailed: string
      notFound: string
      pageTitle: string
      priority: string
      rule: string
      startTime: string
    }
    assignment: {
      assignedAt: string
      assignedBy: string
      deleteConfirm: string
      deleteFailed: string
      detailsTitle: string
      loadFailed: string
      notFound: string
      pageTitle: string
      released: string
    }
  }
}

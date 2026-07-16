import type { ExtrasUiMessages } from "./messages.js"

export const extrasUiZh = {
  catalogCard: {
    untitled: "未命名附加项",
    unitPrefix: "/ {unit}",
  },
  productCombobox: {
    placeholder: "搜索产品…",
    loading: "加载中…",
    empty: "未找到产品。",
    statusLabels: {
      draft: "草稿",
      active: "在售",
      archived: "已归档",
    },
    bookingModeLabels: {
      date: "日期",
      date_time: "日期和时间",
      open: "开放",
      stay: "住宿",
      transfer: "接送",
      itinerary: "行程",
      other: "其他",
    },
  },
  slotManifest: {
    title: "附加项清单",
    emptyExtras: "该产品未配置班期清单类附加项。",
    emptyTravelers: "该班期没有已分配的有效出行人。",
    travelerColumn: "出行人",
    bookingColumn: "订单",
    selectedLabel: "已选",
    selectLabel: "选择",
    cancelLabel: "取消",
    collectedLabel: "已收款",
    pendingLabel: "待收款",
    waivedLabel: "已豁免",
    notRequiredLabel: "无需收款",
    collectionModeLabels: {
      cash_on_trip: "行中现金收取",
      external: "外部收取",
      included: "已包含",
      none: "无需收款",
      booking_total: "计入订单总额",
    },
    markCollected: "标记已收款",
    markWaived: "豁免",
    selectAll: "全选",
    clearAll: "全部清除",
    loading: "正在加载附加项…",
  },
} satisfies ExtrasUiMessages

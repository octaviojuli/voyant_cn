import type { SellabilityUiMessages } from "./messages.js"

export const sellabilityUiZh = {
  common: {
    loading: "正在加载…",
    cancel: "取消",
    active: "启用",
    channelKindLabels: {
      direct: "直销",
      affiliate: "联盟",
      ota: "OTA",
      reseller: "转售方",
      marketplace: "平台市场",
      api_partner: "API 合作伙伴",
      connect: "Connect",
    },
    channelStatusLabels: {
      active: "启用",
      inactive: "停用",
      pending: "待启用",
      archived: "已归档",
    },
    productStatusLabels: {
      draft: "草稿",
      active: "启用",
      archived: "已归档",
    },
    productBookingModeLabels: {
      date: "日期",
      date_time: "日期与时间",
      open: "开放",
      stay: "住宿",
      transfer: "接送",
      itinerary: "行程",
      other: "其他",
    },
    policyScopeLabels: {
      global: "全局",
      product: "产品",
      option: "选项",
      market: "市场",
      channel: "渠道",
    },
    policyTypeLabels: {
      capability: "能力",
      occupancy: "入住",
      pickup: "接驳",
      question: "问题",
      allotment: "切位",
      availability_window: "可售窗口",
      currency: "货币",
      custom: "自定义",
    },
  },
  channelCombobox: {
    placeholder: "选择渠道…",
    empty: "未找到渠道。",
  },
  marketCombobox: {
    placeholder: "搜索市场…",
    empty: "未找到市场。",
  },
  productCombobox: {
    placeholder: "搜索产品…",
    empty: "未找到产品。",
  },
  productOptionCombobox: {
    placeholder: "选择产品选项…",
    empty: "未找到产品选项。",
    selectProductFirst: "请先选择产品。",
  },
  policyDialog: {
    titles: {
      create: "添加政策",
      edit: "编辑政策",
    },
    fields: {
      name: "名称",
      scope: "适用范围",
      type: "类型",
      priority: "优先级",
      product: "产品",
      option: "选项",
      market: "市场",
      channel: "渠道",
      conditionsJson: "条件(JSON)",
      effectsJson: "效果(JSON)",
      notes: "备注",
      active: "启用",
    },
    placeholders: {
      name: "缺少能力时禁止预订",
    },
    actions: {
      create: "添加政策",
      save: "保存更改",
    },
    validation: {
      nameRequired: "名称为必填项",
      jsonObject: "必须是 JSON 对象",
    },
  },
} satisfies SellabilityUiMessages

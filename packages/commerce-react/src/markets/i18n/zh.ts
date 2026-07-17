import type { MarketsUiMessages } from "./messages.js"

export const marketsUiZh = {
  settingsPage: {
    title: "市场",
    description: "管理销售区域、默认语言、货币与税务上下文。",
    empty: "尚未配置任何市场。",
    add: "添加市场",
  },
  common: {
    cancel: "取消",
    saveChanges: "保存更改",
    active: "启用",
    default: "默认",
    marketStatusLabels: {
      active: "启用",
      inactive: "停用",
      archived: "已归档",
    },
  },
  marketDialog: {
    titles: {
      create: "添加市场",
      edit: "编辑市场",
    },
    fields: {
      code: "代码",
      name: "名称",
      status: "状态",
      regionCode: "区域代码",
      country: "国家/地区",
      languageTag: "语言标签",
      defaultCurrency: "默认货币",
      timezone: "时区",
      taxContext: "税务上下文",
    },
    placeholders: {
      code: "EU-DE",
      name: "德国",
      regionCode: "EU、APAC…",
      languageTag: "en、de-DE…",
      timezone: "Europe/Berlin",
      taxContext: "EU-VAT、US-Sales-Tax…",
    },
    actions: {
      create: "添加市场",
    },
    validation: {
      codeRequired: "代码为必填项",
      nameRequired: "名称为必填项",
      currencyThreeChars: "货币代码须为 3 个字符",
    },
  },
  marketCurrencyDialog: {
    titles: {
      create: "添加货币",
      edit: "编辑货币",
    },
    fields: {
      currencyCode: "货币代码",
      sortOrder: "排序",
      isDefault: "默认",
      isSettlement: "结算",
      isReporting: "报表",
      active: "启用",
    },
    actions: {
      create: "添加货币",
    },
    validation: {
      currencyThreeChars: "货币代码须为 3 个字符",
    },
  },
  marketLocaleDialog: {
    titles: {
      create: "添加语言",
      edit: "编辑语言",
    },
    fields: {
      languageTag: "语言标签",
      sortOrder: "排序",
      isDefault: "默认",
      active: "启用",
    },
    placeholders: {
      languageTag: "en-GB、de-DE…",
    },
    actions: {
      create: "添加语言",
    },
    validation: {
      languageTagRequired: "语言标签为必填项",
    },
  },
} satisfies MarketsUiMessages

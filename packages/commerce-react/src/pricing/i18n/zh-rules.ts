import type { PricingUiMessages } from "./messages.js"

export const pricingUiZhRules = {
  priceScheduleDialog: {
    titles: {
      create: "新建价格档期",
      edit: "编辑价格档期",
    },
    fields: {
      catalog: "价目表",
      name: "名称",
      code: "代码",
      recurrenceRule: "循环规则(RRULE)",
      validFrom: "生效开始",
      validTo: "生效结束",
      timezone: "时区",
      priority: "优先级",
      active: "启用",
      notes: "备注",
    },
    placeholders: {
      catalog: "搜索价目表…",
      name: "旺季",
      code: "high-season",
      recurrenceRule: "FREQ=YEARLY;BYMONTH=6,7,8",
      validFrom: "选填",
      validTo: "选填",
      timezone: "Europe/Istanbul",
    },
    validation: {
      catalogRequired: "价目表为必填项",
      nameRequired: "名称为必填项",
      recurrenceRuleRequired: "RRULE 为必填项",
    },
    helpText: {
      recurrenceRuleExample: "例如 FREQ=YEARLY;BYMONTH=6,7,8 表示 6 月至 8 月。",
    },
    actions: {
      create: "创建档期",
    },
  },
  cancellationPolicyRuleDialog: {
    titles: {
      create: "添加取消规则",
      edit: "编辑取消规则",
    },
    fields: {
      cutoffMinutesBefore: "截止(提前分钟数)",
      sortOrder: "排序",
      chargeType: "收费类型",
      chargeAmount: "收费金额",
      chargePercent: "收费百分比(0-100)",
      active: "启用",
      notes: "备注",
    },
    placeholders: {
      cutoffMinutesBefore: "2880",
      chargePercent: "50",
    },
    helpText: {
      cutoffMinutesBefore: "48 小时 = 2880 分钟 · 24 小时 = 1440 分钟",
    },
    actions: {
      create: "添加规则",
    },
  },
  optionPriceRuleDialog: {
    titles: {
      create: "添加选项价格规则",
      edit: "编辑选项价格规则",
    },
    fields: {
      product: "产品",
      option: "选项",
      name: "名称",
      code: "代码",
      catalog: "价目表",
      schedule: "档期(可选)",
      cancellationPolicy: "取消政策(可选)",
      pricingMode: "计价方式",
      baseSell: "基础售价",
      baseCost: "基础成本",
      minPerBooking: "每单最小数量",
      maxPerBooking: "每单最大数量",
      description: "描述",
      allPricingCategories: "全部计价类别",
      defaultRule: "默认规则",
      active: "启用",
      notes: "备注",
    },
    validation: {
      productRequired: "产品为必填项",
      optionRequired: "选项为必填项",
      catalogRequired: "价目表为必填项",
      nameRequired: "名称为必填项",
    },
    actions: {
      create: "创建规则",
    },
  },
  locationPriceRuleDialog: {
    fields: {
      optionPriceRule: "选项价格规则",
      optionId: "选项",
      facilityId: "场所 ID(可选)",
      pickupPointId: "接驳点 ID",
      dropoffName: "下车点名称",
      dropoffCode: "下车点代码(可选)",
      pricingMode: "计价方式",
      sellAmount: "售价金额",
      costAmount: "成本金额",
      sortOrder: "排序",
      active: "启用",
      notes: "备注",
    },
    placeholders: {
      optionId: "选择选项…",
      facilityId: "fac_…",
      pickupPointId: "ppnt_…",
    },
    validation: {
      optionPriceRuleRequired: "选项价格规则为必填项",
      optionIdRequired: "选项为必填项",
      pickupPointIdRequired: "接驳点为必填项",
      dropoffNameRequired: "下车点名称为必填项",
    },
    actions: {
      createRule: "添加规则",
      saveRule: "保存更改",
    },
    pickup: {
      titles: {
        create: "添加上车点价格规则",
        edit: "编辑上车点价格规则",
      },
    },
    dropoff: {
      titles: {
        create: "添加下车点价格规则",
        edit: "编辑下车点价格规则",
      },
    },
    extra: {
      titles: {
        create: "添加附加项价格规则",
        edit: "编辑附加项价格规则",
      },
      fields: {
        productExtraId: "产品附加项 ID(可选)",
        optionExtraConfigId: "选项附加项配置 ID(可选)",
      },
      placeholders: {
        productExtraId: "pext_…",
        optionExtraConfigId: "oecf_…",
      },
    },
  },
  optionStartTimeRuleDialog: {
    titles: {
      create: "添加出发时间规则",
      edit: "编辑出发时间规则",
    },
    fields: {
      optionPriceRule: "选项价格规则",
      optionId: "选项",
      startTimeId: "出发时间 ID",
      ruleMode: "规则模式",
      adjustmentType: "调整类型",
      sellAdjustment: "售价调整",
      costAdjustment: "成本调整",
      adjustmentPercent: "调整(%)",
      active: "启用",
      notes: "备注",
    },
    placeholders: {
      optionId: "选择选项…",
      startTimeId: "pst_…",
      select: "选择…",
    },
    validation: {
      optionPriceRuleRequired: "选项价格规则为必填项",
      optionIdRequired: "选项为必填项",
      startTimeIdRequired: "出发时间 ID 为必填项",
    },
    actions: {
      create: "添加规则",
    },
  },
  optionUnitPriceRuleDialog: {
    titles: {
      create: "添加计价单元价格规则",
      edit: "编辑计价单元价格规则",
    },
    fields: {
      optionPriceRule: "选项价格规则",
      option: "选项",
      unit: "计价单元",
      pricingCategory: "计价类别(可选)",
      pricingMode: "计价方式",
      sellAmount: "售价金额",
      costAmount: "成本金额",
      minQuantity: "最小数量",
      maxQuantity: "最大数量",
      sortOrder: "排序",
      active: "启用",
      notes: "备注",
    },
    placeholders: {
      pricingCategory: "搜索计价类别…",
    },
    validation: {
      optionPriceRuleRequired: "选项价格规则为必填项",
      optionRequired: "选项为必填项",
      unitRequired: "计价单元为必填项",
    },
    actions: {
      create: "添加规则",
    },
  },
  optionUnitTierDialog: {
    titles: {
      create: "添加单元阶梯",
      edit: "编辑单元阶梯",
    },
    fields: {
      optionUnitPriceRule: "计价单元价格规则",
      minQuantity: "最小数量",
      maxQuantity: "最大数量",
      sellAmount: "售价金额",
      costAmount: "成本金额",
      sortOrder: "排序",
      active: "启用",
    },
    placeholders: {
      optionUnitPriceRule: "选择计价单元价格规则…",
    },
    validation: {
      optionUnitPriceRuleRequired: "计价单元价格规则为必填项",
      minQuantityMin: "最小数量须不小于 1",
    },
    actions: {
      create: "添加阶梯",
    },
  },
} satisfies Pick<
  PricingUiMessages,
  | "priceScheduleDialog"
  | "cancellationPolicyRuleDialog"
  | "optionPriceRuleDialog"
  | "locationPriceRuleDialog"
  | "optionStartTimeRuleDialog"
  | "optionUnitPriceRuleDialog"
  | "optionUnitTierDialog"
>

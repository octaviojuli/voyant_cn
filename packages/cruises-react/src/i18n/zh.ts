import type { CruisesUiMessages } from "./messages.js"

export const cruisesUiZh: CruisesUiMessages = {
  common: {
    fallbackCurrencyAmount: "{currency} {amount}",
    occupancyTableLabels: {
      single: "单人",
      double: "双人",
      triple: "三人",
      quad: "四人",
      fallback: "{count}人入住",
    },
  },
  catalogCard: {
    untitled: "未命名航次",
    priceFrom: "{amount} 起",
    nightsSingular: "{count} 晚",
    nightsPlural: "{count} 晚",
  },
  enrichmentProgramList: {
    loading: "正在加载船上讲座项目…",
    empty: "该邮轮暂无已发布的船上讲座项目。",
    avatarFallback: "?",
    kindLabels: {
      naturalist: "博物学家",
      historian: "历史学家",
      photographer: "摄影师",
      lecturer: "讲师",
      expert: "专家",
      other: "专业人士",
    },
  },
  externalCruiseBadge: {
    title: "经 {sourceProvider} 外采",
    label: "外采 · {sourceProvider}",
  },
  pricingGrid: {
    empty: "该航次暂未发布价格。",
    cabinCategory: "舱房类别",
    perPerson: "每人",
    availabilityLabels: {
      available: "可预订",
      limited: "余位有限",
      on_request: "需询位",
      wait_list: "候补",
      sold_out: "售罄",
    },
  },
  quoteDisplay: {
    heading: "您的报价",
    guestLabelSingular: "位出行人",
    guestLabelPlural: "位出行人",
    occupancyCabin: "{count} 人舱房",
    guestSummary: "共 {guestCount} {guestLabel}({occupancyLabel})",
    baseLine: "基础价 · 每人 {price} × {guestCount}",
    sections: {
      additions: "附加费用",
      credits: "抵扣",
      included: "已包含",
    },
    componentKindLabels: {
      gratuity: "小费",
      onboard_credit: "船上消费金",
      port_charge: "港务费",
      tax: "税费",
      ncf: "非佣金费用",
      airfare: "机票",
      transfer: "接送",
      insurance: "保险",
    },
    componentScope: {
      perPerson: "每人",
      perCabin: "每舱房",
    },
    includedAmount: "已包含",
    totals: {
      perPerson: "每人合计",
      totalForCabin: "舱房总价",
    },
  },
}

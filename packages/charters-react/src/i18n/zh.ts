import type { ChartersUiMessages } from "./messages.js"

export const chartersUiZh: ChartersUiMessages = {
  common: {
    fallbackCurrencyAmount: "{currency} {amount}",
  },
  catalogCard: {
    untitled: "未命名包船",
    ratePerWeek: "每周 {amount}",
    cabinsSingular: "{count} 间舱房",
    cabinsPlural: "{count} 间舱房",
  },
  externalCharterBadge: {
    title: "经 {sourceProvider} 外采",
    label: "外采 · {sourceProvider}",
  },
  apaTracker: {
    heading: "APA 对账",
    subtitle: "预付备航金(APA)· 占包船费 {percent}%",
    status: {
      settled: "已结算",
      inProgress: "进行中",
    },
    bars: {
      collectedFromCharterer: "已向承租方收取",
      spentOnBoard: "船上已支出",
      ofAmount: "(共 {amount})",
    },
    tiles: {
      refundIssued: "已退款",
      remainingToRefundOrSpend: "待退还或支出",
      overspentTopUpRequired: "已超支(需补款)",
      fullyReconciled: "已全额对平",
    },
    settledAt: "已于 {date} 结算",
  },
  wholeYachtQuoteCard: {
    wholeYacht: {
      heading: "整船包船报价",
      summary: "包船费与 APA 预先收取;APA 在包船结束后对账",
      dueBeforeEmbarkation: "须于登船前支付",
      charterFee: "包船费",
      apaLabel: "APA(预付备航金,占包船费 {percent}%)",
      totalDue: "应付总额",
      explanation:
        "APA 用于支付包船期间的燃油、餐饮、饮品、港务费及其他运营开支。实际支出在包船结束时对账,结余部分将退还承租方。",
    },
    perSuite: {
      summary: "按套房包船报价",
      allInForSuite: "本套房一价全含",
      suitePrice: "套房售价",
      portFee: "港务费",
      total: "合计",
    },
  },
  voyageSuiteGrid: {
    empty: "该航次暂未发布套房。",
    defaultSelectLabel: "出报价",
    priceOnRequest: "价格另询",
    perSuiteAllIn: "每套房,一价全含",
    availabilityLabels: {
      available: "可预订",
      limited: "余位有限",
      on_request: "需询位",
      wait_list: "候补",
      sold_out: "售罄",
    },
    categoryLabels: {
      standard: "标准",
      deluxe: "豪华",
      suite: "套房",
      penthouse: "顶层套房",
      owners: "船东套房",
      signature: "尊享",
    },
    metadata: {
      squareFeet: "{value} 平方英尺",
      maxGuests: "最多 {count} 位宾客",
    },
  },
}

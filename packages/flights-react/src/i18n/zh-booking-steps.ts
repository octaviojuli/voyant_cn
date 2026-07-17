import type { FlightsUiMessages } from "./messages.js"

/**
 * Simplified Chinese copy for the booking-flow step sections. Split out of
 * `zh.ts` to keep each locale file reviewable; `zh.ts` assembles the full
 * dictionary.
 */
export const flightsUiZhBookingSteps = {
  flightBaggageStep: {
    unavailable: "无法加载该方案的行李选项。",
    title: "添加托运行李",
    description: "座位下方的随身行李已包含。可为每位乘客选择托运行李档位，或跳过此步骤。",
    sameForBothDirections: "去返程相同",
    bags: "{leg}行李",
    noCheckedBag: "不带托运行李",
  },
  flightBillingStep: {
    title: "账单信息",
    description: "收据与税务单据将以此名义签发。",
    tabs: {
      personal: "个人",
      company: "公司",
    },
    fields: {
      firstName: "名",
      lastName: "姓",
      companyName: "公司名称",
      vatNumber: "税号 / VAT 编号",
      email: "邮箱",
      phone: "电话",
      workPhone: "工作电话",
      streetAddress: "街道地址",
      addressLine2: "地址第二行",
      city: "城市",
      postalCode: "邮政编码",
      country: "国家",
    },
    placeholders: {
      vatNumber: "例：RO43917962",
      streetAddress: "街道 + 门牌号",
      addressLine2: "公寓、单元等",
      searchPassengers: "搜索乘客…",
    },
    saveDefault: "将这些信息保存为该联系人的默认账单信息",
    pickFromPassengers: "从乘客中选择",
    noMatchingPassengers: "没有匹配的乘客。",
    validation: {
      emailRequired: "请填写邮箱",
      emailInvalid: "邮箱格式不正确",
      streetAddressRequired: "请填写街道地址",
      cityRequired: "请填写城市",
      countryRequired: "请填写国家",
      firstNameRequired: "请填写名",
      lastNameRequired: "请填写姓",
      companyNameRequired: "请填写公司名称",
      vatNumberRequired: "请填写 VAT / 税号",
    },
  },
  flightBookingJourney: {
    steps: {
      review: "核对方案",
      passengers: "乘客",
      contact: "联系与支付",
      confirm: "确认",
    },
    reviewTitle: "核对所选航班",
    backToResults: "返回结果列表",
    back: "返回",
    booking: "预订中…",
    confirmBooking: "确认预订",
    continue: "继续",
    rows: {
      total: "合计",
      passengers: "乘客",
      contact: "联系方式",
      payment: "支付",
      offerExpires: "方案有效期至",
    },
    confirmDescription:
      "提交后将通过连接器预留座位，并依据所选付款意向立即出票或开启出票窗口。确认后，订单将显示在下方交易单号下。",
  },
  flightBookingLedger: {
    flight: "航班",
    outbound: "去程",
    return: "返程",
    passengers: "乘客",
    working: "处理中…",
    billing: "账单信息",
    payment: "支付",
  },
  flightBookingShell: {
    steps: {
      review: "核对",
      fares: "票价",
      passengers: "乘客",
      bags: "行李",
      seats: "座位",
      services: "服务",
      billing: "账单",
      payment: "支付",
      confirm: "确认",
    },
    seatMapsUnavailable: "座位图不可用",
    backToResults: "返回结果列表",
    back: "返回",
    booking: "预订中…",
    confirmBooking: "确认预订",
    continue: "继续",
    reviewTrip: "核对行程",
    reviewFlight: "核对航班",
    confirmTitle: "确认预订",
    rows: {
      passengers: "乘客",
      documents: "证件",
      contact: "联系方式",
      billedTo: "账单抬头",
      payment: "支付",
    },
    documentsAllAdded: "已添加全部 {count} 份",
    documentsSomeAdded: "已添加 {count}/{total} 份",
    documentsAddAtCheckIn: "值机时补充",
    confirmDescription:
      "提交后将通过连接器预留座位，并依据所选付款意向立即出票或开启出票窗口。确认后，订单将显示在交易单号下。",
    lineItems: {
      fare: "{label}票价{suffix}",
      seatsPicked: "已选 {count} 个座位",
      specialAssistance: "特殊协助({count})",
    },
    segmentNotFound: "未找到航段",
  },
  flightContactForm: {
    title: "联系方式",
    description: "航空公司将通过该联系方式发送本订单的确认信息、航班变动与运营通知。",
    email: "邮箱",
    phone: "电话",
    emailPlaceholder: "traveler@example.com",
    phonePlaceholder: "+1 555 123 4567",
    validation: {
      emailRequired: "请填写邮箱",
      emailInvalid: "邮箱格式不正确",
    },
  },
  flightFareUpsellStep: {
    unavailable: "该方案未提供票价升级档位。",
    title: "升级票价",
    description: "可按航段加购行李、选座与变更灵活性，也可保留基础票价。",
    sameForAllPassengers: "所有乘客使用相同票价",
    resetToBasic: "重置为基础票价",
    appliesToAllPassengers: "适用于全部 {count} 名乘客",
    cabinBag: "手提行李 {weight}",
    noCabinBag: "不含手提行李",
    checkedBag: "托运行李 {weight}{pieces}",
    noCheckedBag: "不含托运行李",
    freeSeatSelection: "免费选座",
    standardSeatSelection: "标准选座",
    noSeatSelection: "不含选座",
    priorityBoarding: "优先登机",
    loungeAccess: "贵宾休息室",
    freeChanges: "免费更改",
    changesForFee: "付费更改",
    refundable: "可退票",
    nonRefundable: "不可退票",
  },
  flightPassengerForm: {
    documentsRequiredNotice:
      "该航线为国际航线——现在填写旅行证件可加快在线值机，并避免机场柜台费用；也可先跳过，稍后补充。",
    fields: {
      firstName: "名",
      middleName: "中间名",
      lastName: "姓",
      dateOfBirth: "出生日期",
      gender: "性别",
      travelDocument: "旅行证件",
      documentType: "证件类型",
      documentNumber: "证件号码",
      countryOfIssue: "签发国家",
      countryOfNationality: "国籍",
      expiryDate: "有效期至",
    },
    placeholders: {
      asOnPassport: "与护照上一致",
      optional: "选填",
      selectDate: "选择日期",
      select: "选择",
      asPrintedOnDocument: "与证件上印刷一致",
    },
    addNow: "现在填写",
    skipDocuments: "跳过，值机时再补充。多数国际行程需提前提供。",
    validation: {
      firstNameRequired: "请填写名",
      lastNameRequired: "请填写姓",
      dateOfBirthRequired: "请填写出生日期",
      documentNumberRequired: "请填写证件号码",
      documentCountryRequired: "请填写证件签发国家",
      documentExpiryRequired: "请填写证件有效期",
    },
  },
  flightPaymentSelector: {
    title: "付款意向",
    description: "选择订单的支付方式。预留可先确认座位、稍后出票；银行卡 / 挂账则立即出票。",
    intents: {
      hold: {
        title: "预留座位——稍后支付",
        description: "立即确认订单，并在连接器的预留时限内锁定售价。款项到账后出票。",
      },
      card: {
        title: "银行卡支付",
        description: "立即出票。卡片信息由连接器的令牌化流程在本表单之外处理。",
      },
      bank_transfer: {
        title: "银行转账",
        description: "创建支付会话，在交易单上提供银行转账指引与参考信息。",
      },
      ticket_on_credit: {
        title: "代理挂账出票",
        description: "以运营方的 IATA 办公室挂账额度出票，于下一报告周期通过 BSP 结算。",
      },
    },
  },
  flightPaymentStep: {
    agencyCreditLabel: "以代理挂账额度出票",
    agencyCreditDescription: "计入代理的 IATA / 票务批发商挂账额度。",
  },
  flightSeatMap: {
    cabin: "客舱",
    pickingSeatFor: "正在为 {passenger} 选座",
    window: "靠窗",
    aisle: "靠过道",
    noCharge: "免费",
    pickedBy: "{passenger} 已选",
    seatAvailable: "座位 {seat},可选",
    seatSelected: "座位 {seat},已选",
    seatUnavailable: "座位 {seat},不可选",
    seatSelectedFor: "已为 {passenger} 选定座位 {seat}",
    categories: {
      exit_row: "安全出口排——加宽腿部空间",
      extra_legroom: "加宽腿部空间",
      preferred: "优选座位",
      premium: "高级座位",
      bulkhead: "隔板座",
      standard: "标准座位",
    },
    legend: {
      available: "可选",
      preferred: "优选",
      exitRow: "安全出口排",
      picked: "已选",
      taken: "已占",
    },
  },
  flightSeatsStep: {
    title: "选择座位",
    description: "自选心仪座位，或由航空公司在值机时分配。",
    modes: {
      skip: {
        title: "稍后选座",
        body: "值机时自动分配座位，可能无法相邻。",
      },
      auto: {
        title: "自动相邻分配",
        body: "航空公司将尽量安排同行乘客相邻就座，免费。",
      },
      now: {
        title: "立即选座",
        body: "按航段精确选座——靠窗、安全出口排、加宽腿部空间。",
      },
    },
    seatMapUnavailable: "该航段暂无座位图。",
  },
  flightServicesStep: {
    title: "服务与附加项",
    description: "均为选填——留空即跳过。",
    servicesUnavailable: "无法加载该方案的服务项。",
    specialAssistance: "特殊协助",
    noAssistanceNeeded: "无需协助",
    extras: "{leg}附加项",
    decreaseExtra: "减少 {passenger} 的{leg}{service}",
    increaseExtra: "增加 {passenger} 的{leg}{service}",
  },
} satisfies Pick<
  FlightsUiMessages,
  | "flightBaggageStep"
  | "flightBillingStep"
  | "flightBookingJourney"
  | "flightBookingLedger"
  | "flightBookingShell"
  | "flightContactForm"
  | "flightFareUpsellStep"
  | "flightPassengerForm"
  | "flightPaymentSelector"
  | "flightPaymentStep"
  | "flightSeatMap"
  | "flightSeatsStep"
  | "flightServicesStep"
>

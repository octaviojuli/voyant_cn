import type { CheckoutUiMessages } from "./messages.js"

export const checkoutUiZh: CheckoutUiMessages = {
  paymentLinkLandingPage: {
    cardTab: "银行卡支付",
    bankTab: "银行转账",
    expires: "{date} 过期",
    noMethods: {
      title: "暂无可用支付方式",
      body: "该支付链接未配置任何支付方式,请联系您的旅行顾问。",
    },
    card: {
      description: "您将跳转至银行卡处理机构托管的安全支付页面。",
      payAmount: "支付 {amount}",
      startFailed: "银行卡支付暂时无法发起。",
      errorAdvice: "{message}若问题持续,请改用银行转账或联系您的旅行顾问。",
    },
    bank: {
      instructions: "请向以下账户汇款 {amount}。收到款项后订单即确认(通常需 1—3 个工作日)。",
      beneficiary: "收款人",
      iban: "IBAN",
      bicSwift: "BIC / SWIFT",
      bank: "开户银行",
      reference: "汇款附言",
    },
    copy: {
      copied: "已复制",
      copyValue: "复制 {value}",
    },
    terminal: {
      paid: {
        title: "已收到付款",
        body: "感谢支付——订单已确认,确认邮件将很快发送至您的邮箱。",
      },
      failed: {
        title: "支付失败",
        body: "本次支付未能完成,请重试或联系客服。",
      },
      expired: {
        title: "支付链接已过期",
        body: "该支付链接已过期,请向您的旅行顾问索取新的链接。",
      },
      cancelled: {
        title: "支付已取消",
        body: "本次支付已取消。如非您本人操作,请联系您的旅行顾问。",
      },
      tryAgain: "重试",
    },
    processing: {
      title: "正在处理支付…",
      body: "正在与支付处理机构确认款项,通常只需几秒钟。",
    },
    descriptions: {
      booking: "订单付款",
      booking_payment_schedule: "订单定金",
      booking_guarantee: "订单担保",
      invoice: "账单付款",
      order: "交易单付款",
      flight_order: "机票付款",
      other: "付款",
      default: "付款",
    },
  },
  paymentStep: {
    title: "支付",
    description: "选择已保存的支付方式,或使用其他支付选项。",
    savedMethods: {
      title: "已保存的支付方式",
      countOnFile: "已存档 {count} 个",
      empty: "该联系人暂无已保存的支付方式。",
      defaultBadge: "默认",
      expires: "{month}/{year} 到期",
      selected: "已选择",
    },
    otherOptions: {
      title: "其他支付选项",
      newCard: {
        title: "新信用卡/借记卡",
        body: "立即使用一次性银行卡扣款。",
        cardholderName: "持卡人姓名",
        cardNumber: "卡号",
        expiry: "MM/YY",
        cardNumberPlaceholder: ".... .... .... ....",
        expiryPlaceholder: "08/29",
      },
      hold: {
        title: "预留——生成收款链接",
        body: "锁定交易单并生成收款链接,客户打开后可选择银行卡或银行转账付款,链接可按需分享。",
      },
      cardSecurityNote:
        "此处输入的卡号在生产环境经由支付处理机构的托管表单完成令牌化——绝不会经由本界面传输。",
      brandFallback: "银行卡",
    },
  },
  collectPaymentDialog: {
    title: "生成收款链接",
    description: "分享给客户以收取款项。",
    scheduleLabel: "收款项目",
    scheduleHelp: "",
    scheduleCustomPlaceholder: "自定义金额",
    scheduleClear: "清除付款计划",
    scheduleFullAmount: "全款({amount})",
    scheduleTypeLabels: {
      deposit: "定金",
      installment: "分期",
      balance: "尾款",
      hold: "预留",
      other: "其他",
    },
    amountLabel: "金额({currency})",
    amountLabelShort: "金额",
    currencyLabel: "币种",
    amountHelp: "",
    cancel: "取消",
    done: "完成",
    generateLink: "生成链接",
    validation: {
      amountAboveZero: "请输入大于零的金额。",
      linkReady: "收款链接已就绪——请复制或分享给客户。",
    },
    result: {
      noLink: "会话已创建,但未能生成链接。会话 ID:{sessionId}。",
      noSession: "-",
      ready: "收款链接已就绪",
      body: "将此链接分享给客户,客户可在页面上选择银行卡或银行转账。",
      copyLink: "复制链接",
      openLink: "打开链接",
    },
  },
}

export const crmUiZhCommerceMessages = {
  createActivityDialog: {
    title: "新建跟进记录",
    description: "记录一次电话、邮件、会议或任务。",
    fields: {
      subject: "主题",
      type: "类型",
      status: "状态",
      description: "描述",
      linkTo: "关联到",
      entityId: "关联对象",
    },
    placeholders: {
      subject: "与 Acme 的初步沟通电话",
      entityId: "搜索或粘贴引用",
    },
    validation: {
      subjectRequired: "主题为必填项",
      createFailed: "跟进记录创建失败",
    },
  },
  createQuoteDialog: {
    title: "新建报价",
    fields: {
      title: "标题",
      stage: "阶段",
    },
    placeholders: {
      title: "新建报价",
      stage: "选择阶段…",
    },
    validation: {
      titleRequired: "标题为必填项",
      stageRequired: "阶段为必填项",
      createFailed: "报价创建失败",
    },
  },
  quotesBoard: {
    fallbackName: "未命名阶段",
  },
  quoteSummaryCard: {
    unknown: "未知",
    expectedClose: "预计结案",
  },
  inlineEditor: {
    failedToSave: "保存失败。",
    notSet: "未设置",
    selectPlaceholder: "选择…",
    noneOption: "无",
    invalidNumber: "请输入有效的数字。",
    minNumber: "不能小于 {min}。",
    maxNumber: "不能大于 {max}。",
    searchCurrencyPlaceholder: "搜索货币…",
    noCurrenciesFound: "未找到货币。",
    searchLanguagePlaceholder: "搜索语言…",
    noLanguagesFound: "未找到语言。",
    addTemplate: "添加 {label}",
    addTagPlaceholder: "添加标签…",
    tagAlreadyAdded: "标签已添加。",
    addTagFailed: "标签添加失败。",
    removeTagFailed: "标签移除失败。",
  },
  createQuoteVersionDialog: {
    title: "新建报价版本",
    fields: {
      quote: "报价",
      currency: "货币",
      validUntil: "有效期至",
    },
    placeholders: {
      searchQuotes: "搜索报价…",
      selectCurrency: "选择货币…",
      pickDate: "选择日期",
    },
    empty: {
      loading: "加载中…",
      noQuotes: "未找到报价。",
    },
    validation: {
      selectQuote: "请选择报价",
      selectCurrency: "请选择货币",
      createFailed: "报价版本创建失败",
    },
    actions: {
      create: "创建",
    },
  },
  quoteVersionLinesCard: {
    title: "版本行项目",
    empty: "暂无行项目。",
    fields: {
      description: "描述",
      quantity: "数量",
      priceCents: "价格",
    },
    validation: {
      descriptionRequired: "描述为必填项",
      addFailed: "行项目添加失败",
    },
    subtotal: "小计",
  },
  activitiesPage: {
    title: "跟进记录",
    description: "CRM 中的电话、邮件、会议、任务与跟进。",
    create: "新建跟进记录",
    filters: {
      type: "类型",
      status: "状态",
      allTypes: "全部类型",
      allStatuses: "全部状态",
    },
    empty: "没有符合筛选条件的跟进记录。",
  },
  quoteVersionsPage: {
    title: "报价版本",
    description: "销售管道中各报价已签发的版本。",
    create: "新建报价版本",
    filters: {
      status: "状态",
      allStatuses: "全部状态",
    },
    columns: {
      quoteVersion: "版本",
      status: "状态",
      total: "总计",
      validUntil: "有效期至",
      updated: "更新时间",
    },
    loadFailed: "报价加载失败。",
    empty: "未找到报价。",
  },
} as const

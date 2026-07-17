import type { PricingUiMessages } from "./messages.js"

export const pricingUiZhCore = {
  common: {
    cancel: "取消",
    saveChanges: "保存更改",
    create: "创建",
    add: "添加",
    loading: "正在加载…",
    none: "—",
    previous: "上一页",
    next: "下一页",
    page: "页",
    active: "启用",
    inactive: "停用",
    categoryTypeLabels: {
      adult: "成人",
      child: "儿童",
      infant: "婴儿",
      senior: "长者",
      group: "团体",
      room: "房间",
      vehicle: "车辆",
      service: "服务",
      other: "其他",
    },
    dependencyTypeLabels: {
      requires: "必须搭配",
      limits_per_master: "按主类别限量",
      limits_sum: "限制总量",
      excludes: "互斥",
    },
    chargeTypeLabels: {
      none: "无",
      amount: "金额",
      percentage: "百分比",
    },
    addonPricingModeLabels: {
      included: "已包含",
      per_person: "按人",
      per_booking: "按订单",
      on_request: "价格另询",
      unavailable: "不可用",
    },
    optionPriceRulePricingModeLabels: {
      per_person: "按人",
      per_booking: "按订单",
      starting_from: "起价",
      free: "免费",
      on_request: "价格另询",
    },
    startTimeRuleModeLabels: {
      included: "包含",
      excluded: "排除",
      override: "覆盖",
      adjustment: "调整",
    },
    adjustmentTypeLabels: {
      fixed: "固定金额",
      percentage: "百分比",
    },
    unitPricingModeLabels: {
      per_unit: "按单元",
      per_person: "按人",
      per_booking: "按订单",
      included: "已包含",
      free: "免费",
      on_request: "价格另询",
    },
  },
  comboboxes: {
    pricingCategory: {
      placeholder: "搜索计价类别…",
      empty: "未找到计价类别。",
    },
    priceCatalog: {
      placeholder: "搜索价目表…",
      empty: "未找到价目表。",
    },
    priceSchedule: {
      placeholder: "搜索价格档期…",
      empty: "未找到价格档期。",
    },
    cancellationPolicy: {
      placeholder: "搜索取消费用政策…",
      empty: "未找到取消费用政策。",
    },
    optionPriceRule: {
      placeholder: "搜索选项价格规则…",
      empty: "未找到选项价格规则。",
    },
    product: {
      placeholder: "搜索产品…",
      empty: "未找到产品。",
    },
    productOption: {
      placeholder: "选择产品选项…",
      empty: "未找到产品选项。",
      missingParent: "请先选择产品。",
    },
    optionUnit: {
      placeholder: "选择计价单元…",
      empty: "未找到计价单元。",
      missingParent: "请先选择选项。",
    },
    optionUnitPriceRule: {
      placeholder: "选择计价单元价格规则…",
      empty: "未找到计价单元价格规则。",
    },
  },
  pricingCategoriesPage: {
    title: "计价类别",
    description: "用于年龄、房间、车辆等计价维度的可复用类别。",
  },
  priceCatalogsPage: {
    title: "价目表",
    description: "创建指定货币与定价口径的价目表。",
    addCatalog: "添加价目表",
    empty: "暂无价目表。创建价目表以定义按货币区分的价格卡。",
    default: "默认",
    edit: "编辑",
    delete: "删除",
    deleteConfirm: "要删除该价目表吗?",
    showingSummary: "显示 {count} / {total} 条",
    selectCurrencyPlaceholder: "选择货币…",
    noCurrenciesFound: "未找到货币。",
    editSheetTitle: "编辑价目表",
    newSheetTitle: "新建价目表",
    nameLabel: "名称",
    namePlaceholder: "EUR 公开售价",
    codeLabel: "代码",
    codePlaceholder: "EUR-PUBLIC",
    currencyLabel: "货币",
    typeLabel: "类型",
    defaultCatalogLabel: "默认价目表",
    activeLabel: "启用",
    notesLabel: "备注",
    notesPlaceholder: "备注(可选)",
    cancel: "取消",
    saveChanges: "保存更改",
    createCatalog: "创建价目表",
    catalogTypeLabels: {
      public: "公开",
      contract: "合同",
      net: "净价",
      gross: "含佣价",
      promo: "促销",
      internal: "内部",
      other: "其他",
    },
    validation: {
      nameRequired: "名称为必填项",
      codeRequired: "代码为必填项",
      currencyLength: "须使用 3 位 ISO 货币代码",
    },
  },
  pricingCategoryDialog: {
    titles: {
      create: "新建计价类别",
      edit: "编辑计价类别",
    },
    descriptions: {
      create: "创建可在产品与选项间复用的计价类别。",
      edit: "更新可复用计价类别的规则与适用条件。",
    },
  },
  pricingCategoryForm: {
    fields: {
      name: "名称",
      code: "代码",
      type: "类型",
      seatOccupancy: "占座",
      ageQualified: "年龄限定",
      minAge: "最小年龄",
      maxAge: "最大年龄",
      sortOrder: "排序",
      active: "启用",
    },
    placeholders: {
      name: "成人",
      code: "adult",
    },
    validation: {
      nameRequired: "类别名称为必填项。",
      saveFailed: "保存计价类别失败。",
    },
    actions: {
      create: "创建类别",
    },
  },
  pricingCategoryList: {
    searchPlaceholder: "搜索计价类别…",
    add: "新建类别",
    columns: {
      name: "名称",
      code: "代码",
      type: "类型",
      age: "年龄",
      seat: "座位",
      sort: "排序",
      status: "状态",
      actions: "操作",
    },
    loadingError: "加载计价类别失败。",
    empty: "未找到计价类别。",
    edit: "编辑",
    delete: "删除",
    deleteConfirm: "要删除类别“{name}”吗?",
    showingSummary: "显示 {count} / {total} 条",
  },
  pricingCategoryDependencyDialog: {
    titles: {
      create: "添加类别依赖",
      edit: "编辑类别依赖",
    },
    description: "计价类别之间的规则,例如必须搭配、互斥与数量限制。",
  },
  pricingCategoryDependencyForm: {
    fields: {
      masterCategory: "主类别",
      dependentCategory: "从属类别",
      dependencyType: "依赖类型",
      maxPerMaster: "每主类别上限",
      maxDependentSum: "从属总量上限",
      active: "启用",
      notes: "备注",
    },
    placeholders: {
      categorySearch: "搜索类别",
    },
    validation: {
      categoriesRequired: "主类别与从属类别均为必填项。",
      saveFailed: "保存类别依赖失败。",
    },
    actions: {
      create: "添加依赖",
    },
  },
} satisfies Pick<
  PricingUiMessages,
  | "common"
  | "comboboxes"
  | "pricingCategoriesPage"
  | "priceCatalogsPage"
  | "pricingCategoryDialog"
  | "pricingCategoryForm"
  | "pricingCategoryList"
  | "pricingCategoryDependencyDialog"
  | "pricingCategoryDependencyForm"
>

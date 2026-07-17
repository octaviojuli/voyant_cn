import type { ProductsUiOperationsMessages } from "./messages-operations.js"

export const productsUiOperationsZh = {
  productDayDialog: {
    titles: {
      create: "添加行程日",
      edit: "编辑行程日",
    },
    descriptions: {
      create: "在产品行程中创建结构化的一天。",
      edit: "更新该行程日的标题、地点与概述。",
    },
  },
  productDayForm: {
    fields: {
      dayNumber: "日序号",
      location: "地点",
      title: "标题",
      description: "描述",
    },
    placeholders: {
      location: "Dubrovnik",
      title: "抵达 Dubrovnik",
      description: "该行程日的概述与活动安排",
    },
    validation: {
      dayNumberMin: "日序号不得小于 1。",
      saveFailed: "行程日保存失败。",
    },
    actions: {
      addDay: "添加行程日",
      saveDay: "保存行程日",
    },
  },
  productDayServiceForm: {
    fields: {
      supplierService: "供应商服务",
      serviceType: "服务类型",
      countryCode: "国家代码",
      name: "名称",
      description: "描述",
      costCurrency: "币种",
      costAmount: "成本",
      quantity: "数量",
      sortOrder: "排序",
      notes: "备注",
    },
    placeholders: {
      supplierService: "选择供应商服务",
      countryCode: "RO",
      name: "酒店住宿",
      description: "运营服务详情",
      notes: "内部备注",
    },
    serviceTypes: {
      accommodation: "住宿",
      transfer: "接送",
      experience: "体验",
      guide: "导游",
      meal: "用餐",
      other: "其他",
    },
    validation: {
      nameRequired: "服务名称为必填项。",
      currencyRequired: "币种必须为 3 位 ISO 代码。",
      costNonNegative: "成本必须大于或等于零。",
      quantityMin: "数量不得小于 1。",
      saveFailed: "服务保存失败。",
    },
    actions: {
      addService: "添加服务",
      saveService: "保存服务",
    },
  },
  productDayServiceDialog: {
    titles: {
      create: "添加服务",
      edit: "编辑服务",
    },
    descriptions: {
      create: "为该行程日添加一项运营服务。",
      edit: "更新该行程日的运营服务。",
    },
  },
  productItineraryDayRow: {
    dayLabel: "第 {dayNumber} 天",
    emptyServices: "该行程日尚未配置服务。",
    servicesLoadingError: "行程日服务加载失败。",
    columns: {
      name: "名称",
      type: "类型",
      cost: "成本",
      quantity: "数量",
    },
  },
  productItineraryDialog: {
    titles: {
      create: "新建行程方案",
      edit: "重命名行程方案",
    },
    descriptions: {
      create: "为该产品添加另一套行程方案。",
      edit: "更新行程方案名称与默认状态。",
    },
    fields: {
      name: "名称",
      defaultItinerary: "设为默认行程方案",
      notesDefaultLocked: "当前为默认方案。如需更改，请将其他行程方案设为默认。",
      notesFirstDefault: "第一套行程方案会自动成为默认。",
    },
    placeholders: {
      name: "例如：主行程方案、亲子版本",
    },
    validation: {
      nameRequired: "名称为必填项",
      saveFailed: "行程方案保存失败。",
    },
    actions: {
      createItinerary: "创建行程方案",
    },
  },
  optionUnitDialog: {
    titles: {
      create: "新建计价单元",
      edit: "编辑计价单元",
    },
    descriptions: {
      create: "添加所售卖或分配的对象，例如成人票、儿童票、双人间、大巴座位、舱房或服务。",
      edit: "更新库存上限、年龄规则，以及该单元代表房间时的入住人数。",
    },
  },
  optionUnitForm: {
    fields: {
      name: "名称",
      code: "代码",
      unitType: "所分配的对象是什么？",
      sortOrder: "排序",
      minQuantity: "每班期最少数量",
      maxQuantity: "每班期可售数量",
      minAge: "最小年龄",
      maxAge: "最大年龄",
      occupancyMin: "最少入住人数",
      occupancyMax: "最多入住人数",
      description: "描述",
      required: "必选",
      hidden: "隐藏",
    },
    placeholders: {
      name: "成人票",
      code: "adult",
      description: "关于该计价单元的内部备注(可选)",
    },
    validation: {
      nameRequired: "计价单元名称为必填项。",
      saveFailed: "计价单元保存失败。",
    },
    actions: {
      createUnit: "创建计价单元",
    },
  },
  productVersionDialog: {
    title: "创建版本快照",
    description: "将当前产品状态(含行程方案与选项结构)保存为新版本。",
    fields: {
      notes: "备注",
    },
    placeholders: {
      notes: "本版本有哪些变更？",
    },
    validation: {
      saveFailed: "版本快照创建失败。",
    },
    actions: {
      createVersion: "创建版本",
    },
  },
  productVersionsSection: {
    titles: {
      default: "版本",
    },
    descriptions: {
      default: "创建并浏览不可变的产品快照。",
    },
    actions: {
      createVersion: "创建版本",
    },
    loadingError: "产品版本加载失败。",
    empty: "尚未创建版本快照。",
    versionLabel: "版本",
  },
  productOptionDialog: {
    titles: {
      create: "新建产品选项",
      edit: "编辑产品选项",
    },
    descriptions: {
      create: "创建面向客户的选择，例如默认、成人票、双人间、单人间、标准舱房或 VIP 接送。",
      edit: "更新可售时间、排序，以及优先向客户展示哪个选项。",
    },
  },
  productOptionForm: {
    fields: {
      name: "名称",
      code: "代码",
      description: "描述",
      status: "状态",
      sortOrder: "排序",
      availableFrom: "可售开始",
      availableTo: "可售结束",
      defaultOption: "优先向客户展示",
    },
    placeholders: {
      name: "默认",
      code: "default",
      description: "关于该产品选项的内部备注(可选)",
      availableFrom: "选择开始日期",
      availableTo: "选择结束日期",
    },
    validation: {
      nameRequired: "选项名称为必填项。",
      saveFailed: "产品选项保存失败。",
    },
    actions: {
      createOption: "创建产品选项",
    },
  },
  productOptionsSection: {
    titles: {
      default: "产品选项与价格",
      units: "该选项的库存",
      personUnits: "该选项的出行人类型",
      roomUnits: "该选项的房间库存",
    },
    descriptions: {
      default: "配置客户可选择的内容、可用的库存或出行人类型，以及每位出行人支付的售价。",
      units: "定义该选项背后的实体单元、票种、房间、座位、舱房或服务。",
      personUnits: "定义客户可预订的出行人年龄段。班期容量控制可出行的总人数。",
      roomUnits: "定义该选项可用的实体房间。",
    },
    actions: {
      addOption: "添加选项",
      addUnit: "添加计价单元",
      addPersonUnit: "添加出行人类型",
      addRoomUnit: "添加房间单元",
      duplicate: "复制选项",
      edit: "编辑",
      delete: "删除",
    },
    loadingError: {
      options: "产品选项加载失败。",
      units: "计价单元加载失败。",
    },
    empty: {
      options: "尚未配置客户选项。",
      units: "该选项尚未配置计价单元。",
    },
    configurationWarnings: {
      roomOptionsTitle: "这些选项疑似把房型配置成了产品选项",
      roomOptionsDescription:
        "选项 {options} 疑似房型安排。对于单人间、双人间、三人间等房型选择，请使用一个选项搭配多个房间单元；仅当客户在选择真正不同的套餐时才使用多个选项。",
    },
    deleteConfirm: {
      option: "确定删除选项“{name}”及其配置吗？",
      unit: "确定删除计价单元“{name}”吗？",
    },
    columns: {
      unitType: "类型",
      unitName: "名称",
      quantity: "库存",
      personQuantity: "可订数量",
      roomQuantity: "房间库存",
      age: "出行人年龄",
      occupancy: "房间入住人数",
      actions: "操作",
    },
    unitSummaries: {
      range: "{range}",
      rooms: "每班期房间数",
      roomsWithCount: "每班期最多 {count} 间",
      vehicles: "每班期车辆数",
      vehiclesWithCount: "每班期最多 {count} 辆",
      sleeps: "可住 {count} 人",
      sleepsRange: "可住 {range} 人",
    },
    badges: {
      defaultOption: "优先展示",
    },
  },
} satisfies ProductsUiOperationsMessages

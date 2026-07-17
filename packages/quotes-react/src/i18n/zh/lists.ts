export const crmUiZhListsMessages = {
  personCard: {
    unnamed: "未命名",
  },
  personCardConnected: {
    loadFailed: "联系人加载失败：",
  },
  personList: {
    searchPlaceholder: "搜索联系人…",
    create: "新建联系人",
    columns: {
      name: "姓名",
      email: "邮箱",
      phone: "电话",
      relation: "关系",
      status: "状态",
    },
    filters: {
      button: "筛选",
      relationLabel: "关系",
      relationAll: "全部关系",
      statusLabel: "状态",
      statusAll: "全部状态",
      organizationLabel: "组织",
      organizationAny: "任意组织",
      organizationEmpty: "未找到组织。",
      clear: "清除",
    },
    loadFailed: "联系人加载失败。",
    empty: "未找到联系人。",
  },
  peoplePage: {
    title: "联系人",
    description: "CRM 中的联系人、出行人、代理与合作伙伴。",
  },
  organizationList: {
    searchPlaceholder: "搜索组织…",
    create: "新建组织",
    columns: {
      name: "名称",
      industry: "行业",
      relation: "关系",
      website: "网站",
      status: "状态",
      updated: "更新时间",
    },
    filters: {
      button: "筛选",
      relationLabel: "关系",
      relationAll: "全部关系",
      statusLabel: "状态",
      statusAll: "全部状态",
      clear: "清除",
    },
    loadFailed: "组织加载失败。",
    empty: "未找到组织。",
  },
  organizationsPage: {
    title: "组织",
    description: "公司、代理社、供应商与账户关系。",
  },
  entityComboboxes: {
    person: {
      placeholder: "搜索联系人…",
      empty: "未找到联系人。",
      loading: "正在加载联系人…",
    },
    organization: {
      placeholder: "搜索组织…",
      empty: "未找到组织。",
      loading: "正在加载组织…",
    },
  },
} as const

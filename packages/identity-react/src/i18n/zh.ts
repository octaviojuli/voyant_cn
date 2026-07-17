import type { IdentityUiMessages } from "./messages.js"

export const identityUiZh = {
  common: {
    cancel: "取消",
    saveChanges: "保存更改",
    primary: "主要",
    addressLabelLabels: {
      primary: "主要",
      billing: "账单",
      shipping: "收货",
      mailing: "邮寄",
      meeting: "会面",
      service: "服务",
      legal: "法定",
      other: "其他",
    },
    contactPointKindLabels: {
      email: "邮箱",
      phone: "电话",
      mobile: "手机",
      whatsapp: "WhatsApp",
      website: "网站",
      sms: "短信",
      fax: "传真",
      social: "社交账号",
      other: "其他",
    },
    namedContactRoleLabels: {
      general: "常规",
      primary: "主要",
      reservations: "预订",
      operations: "运营",
      front_desk: "前台",
      sales: "销售",
      emergency: "紧急联络",
      accounting: "财务",
      legal: "法务",
      other: "其他",
    },
  },
  identityPage: {
    title: "身份信息",
    description: "管理任意实体关联的联系方式、地址与指定联系人。",
    fields: {
      entityType: "实体类型",
      entity: "实体",
      customEntityType: "其他实体类型",
    },
    placeholders: {
      entityType: "person, organization, supplier...",
      entity: "自定义实体类型请粘贴引用标识",
    },
    entityTypeLabels: {
      person: "联系人",
      organization: "组织",
      supplier: "供应商",
      booking: "订单",
      product: "产品",
    },
    emptyScope: "在上方选择实体后，即可浏览其身份信息记录。",
    tabs: {
      contactPoints: "联系方式",
      addresses: "地址",
      namedContacts: "指定联系人",
    },
  },
  contactPointsTab: {
    description: "此实体的电话号码、邮箱及其他沟通方式。",
    add: "添加联系方式",
    empty: {
      loading: "正在加载联系方式…",
      none: "暂无联系方式。",
    },
    columns: {
      kind: "类型",
      value: "内容",
      label: "标签",
      primary: "主要",
    },
    actions: {
      deleteConfirm: "删除该联系方式？",
    },
  },
  addressesTab: {
    description: "与此实体关联的实际地址与邮政地址。",
    add: "添加地址",
    empty: {
      loading: "正在加载地址…",
      none: "暂无地址。",
    },
    columns: {
      label: "标签",
      street: "街道",
      city: "城市",
      country: "国家/地区",
      primary: "主要",
    },
    actions: {
      deleteConfirm: "删除该地址？",
    },
  },
  namedContactsTab: {
    description: "与此实体关联的指定联系人。",
    add: "添加指定联系人",
    empty: {
      loading: "正在加载指定联系人…",
      none: "暂无指定联系人。",
    },
    columns: {
      role: "角色",
      name: "姓名",
      title: "职务",
      email: "邮箱",
      phone: "电话",
      primary: "主要",
    },
    actions: {
      deleteConfirm: "删除该指定联系人？",
    },
  },
  addressDialog: {
    titles: {
      create: "添加地址",
      edit: "编辑地址",
    },
    fields: {
      label: "标签",
      line1: "地址第 1 行",
      line2: "地址第 2 行",
      city: "城市",
      region: "省/州",
      postalCode: "邮编",
      country: "国家/地区",
      timezone: "时区",
      latitude: "纬度",
      longitude: "经度",
      notes: "备注",
    },
    placeholders: {
      timezone: "Europe/Istanbul",
    },
    actions: {
      create: "添加地址",
    },
  },
  contactPointDialog: {
    titles: {
      create: "添加联系方式",
      edit: "编辑联系方式",
    },
    fields: {
      kind: "类型",
      label: "标签",
      value: "内容",
      notes: "备注",
    },
    placeholders: {
      label: "工作、个人…",
      value: "zhangwei@example.com",
    },
    actions: {
      create: "添加联系方式",
    },
    validation: {
      valueRequired: "内容为必填项",
    },
  },
  namedContactDialog: {
    titles: {
      create: "添加指定联系人",
      edit: "编辑指定联系人",
    },
    fields: {
      role: "角色",
      name: "姓名",
      title: "职务",
      email: "邮箱",
      phone: "电话",
      notes: "备注",
    },
    placeholders: {
      name: "王芳",
      title: "销售总监",
      email: "jane@example.com",
    },
    actions: {
      create: "添加指定联系人",
    },
    validation: {
      nameRequired: "姓名为必填项",
    },
  },
} satisfies IdentityUiMessages

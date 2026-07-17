import type { ExternalRefsUiMessages } from "./messages.js"

export const externalRefsUiZh: ExternalRefsUiMessages = {
  common: {
    refStatusLabels: {
      active: "启用",
      inactive: "停用",
      archived: "已归档",
    },
  },
  externalRefsPage: {
    title: "外部映射",
    description:
      "第三方系统中与 Voyant 实体关联的 ID。在下方输入实体类型与 ID,即可管理其外部映射。",
    fields: {
      entityType: "实体类型",
      entity: "实体",
      customEntityType: "其他实体类型",
    },
    placeholders: {
      entityType: "person, booking, product...",
      entity: "自定义实体类型请粘贴引用",
    },
    entityTypeLabels: {
      person: "联系人",
      organization: "组织",
      supplier: "供应商",
      booking: "订单",
      product: "产品",
    },
    emptyScope: "在上方选择一个实体,以浏览其外部映射。",
  },
  externalRefsTab: {
    description: "该实体与外部系统 ID 之间的关联。",
    add: "添加外部映射",
    empty: {
      none: "暂无外部映射。",
      loading: "正在加载外部映射…",
    },
    columns: {
      sourceSystem: "来源系统",
      objectType: "对象类型",
      externalId: "外部 ID",
      namespace: "命名空间",
      status: "状态",
      primary: "主要",
    },
    actions: {
      edit: "编辑外部映射",
      delete: "删除外部映射",
      deleteConfirm: "删除该外部映射?",
    },
    pagination: {
      previous: "上一页",
      next: "下一页",
      page: "第",
      of: "/",
    },
  },
  externalRefDialog: {
    titles: {
      edit: "编辑外部映射",
      add: "添加外部映射",
    },
    labels: {
      sourceSystem: "来源系统",
      objectType: "对象类型",
      namespace: "命名空间",
      externalId: "外部 ID",
      externalParentId: "外部上级 ID",
      status: "状态",
      primary: "主要",
      metadataJson: "元数据(JSON)",
    },
    placeholders: {
      sourceSystem: "bokun, pipedrive, stripe...",
      objectType: "booking, person, product...",
      namespace: "default",
      externalId: "abc-123",
      externalParentId: "parent-id...",
      metadataJson: '{ "key": "value" }',
    },
    actions: {
      cancel: "取消",
      saveChanges: "保存更改",
      addExternalRef: "添加外部映射",
    },
    validation: {
      sourceSystemRequired: "来源系统为必填项",
      objectTypeRequired: "对象类型为必填项",
      externalIdRequired: "外部 ID 为必填项",
      metadataMustBeObject: "必须是 JSON 对象",
    },
  },
}

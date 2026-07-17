import type { LegalUiMessages } from "./messages.js"

export const legalUiZhPolicies = {
  policiesPage: {
    title: "政策",
    description: "管理取消、付款及其他法务政策。",
    create: "新建政策",
    searchPlaceholder: "搜索政策…",
    allKinds: "全部类型",
    empty: "未找到政策。",
    loadFailed: "政策加载失败。",
    filters: {
      button: "筛选",
      clear: "清除筛选",
      kind: "类型",
    },
    columns: {
      name: "名称",
      slug: "Slug",
      kind: "类型",
      language: "语言",
      created: "创建时间",
    },
    pagination: {
      showing: "显示 {count} 条，共 {total} 项政策",
      page: "第 {page} 页，共 {pageCount} 页",
      previous: "上一页",
      next: "下一页",
    },
  },
  policyDetailPage: {
    notFound: "未找到政策",
    backToPolicies: "返回政策列表",
    deleteConfirm: "确定删除政策“{name}”?",
    deleteAssignmentConfirm: "确定删除该政策分配？",
    deleteRuleConfirm: "确定删除该规则？",
    always: "始终",
    actions: {
      newVersion: "新建版本",
      publish: "发布",
      retire: "下线",
      addRule: "添加规则",
      addAssignment: "添加政策分配",
    },
    sections: {
      versions: "版本",
      assignments: "政策分配",
      acceptances: "近期政策确认",
      body: "正文",
      rules: "规则",
    },
    fields: {
      scope: "适用范围",
      targetId: "目标 ID",
      priority: "优先级",
      valid: "有效期",
      versionId: "版本 ID",
      personId: "联系人",
      bookingId: "订单",
      target: "目标",
      method: "方式",
      acceptedAt: "确认时间",
      sort: "排序",
      type: "类型",
      label: "标签",
      days: "天数",
      refund: "退款",
      refundType: "类型",
    },
    empty: {
      noVersions: "暂无版本。",
      noAssignments: "暂无政策分配。",
      noAcceptances: "暂无政策确认。",
      noRules: "暂无规则。",
    },
    versionStatusLabels: {
      draft: "草稿",
      published: "已发布",
      retired: "已下线",
    },
    assignmentScopeLabels: {
      product: "产品",
      channel: "渠道",
      supplier: "供应商",
      market: "市场",
      organization: "组织",
      global: "全局",
    },
  },
  templatesPage: {
    title: "合同模板",
    description: "可复用的合同模板，支持 Liquid 变量与版本历史。",
    create: "新建模板",
    searchPlaceholder: "搜索模板…",
    empty: "暂无模板。创建一个以开始搭建合同模板。",
    loadFailed: "合同模板加载失败。",
    versions: "版本",
    noVersions: "暂无版本。",
    filters: {
      button: "筛选",
      clear: "清除筛选",
      scope: "适用范围",
      allScopes: "全部适用范围",
    },
    columns: {
      name: "名称",
      scope: "适用范围",
      status: "状态",
      created: "创建时间",
      version: "版本",
      changelog: "变更说明",
      createdBy: "创建人",
      createdAt: "创建时间",
    },
    deleteConfirm: "确定删除模板“{name}”?",
    editAction: "编辑模板",
    deleteAction: "删除模板",
  },
  templateDetailPage: {
    notFound: "未找到模板",
    backToTemplates: "返回模板列表",
    currentBadge: "当前",
    variablesDescription:
      "模板使用 Liquid 渲染。可参考下方说明查看可用的变量、过滤器、循环与条件语句。",
    deleteConfirm: "确定删除模板“{name}”?",
    actions: {
      addVersion: "添加版本",
    },
    sections: {
      details: "模板详情",
      description: "描述",
      currentBody: "当前正文",
      variables: "模板变量与 Liquid",
      versions: "版本",
    },
    fields: {
      language: "语言",
      currentVersionId: "当前版本 ID",
      created: "创建时间",
      updated: "更新时间",
      version: "版本",
      changelog: "变更说明",
      createdBy: "创建人",
      createdAt: "创建时间",
    },
    empty: {
      noDescription: "暂无描述。",
      noVersions: "暂无版本。",
    },
  },
  attachmentDialog: {
    titles: {
      create: "添加文档",
      edit: "编辑文档",
    },
    fields: {
      file: "文件",
      name: "名称",
      kind: "类型",
      mimeType: "MIME 类型",
      fileSize: "文件大小",
      checksum: "校验和",
      storageKey: "存储引用",
    },
    kindLabels: {
      document: "已签署文档",
      appendix: "附录",
      scan: "辅助扫描件",
    },
    placeholders: {
      file: "选择或拖入文件",
      name: "文档名称",
      kind: "appendix",
      mimeType: "application/pdf",
      fileSize: "字节",
      checksum: "选填",
      storageKey: "选填的存储引用",
    },
    actions: {
      create: "添加文档",
    },
    validation: {
      nameRequired: "名称为必填项",
      fileRequired: "请选择要上传的文件。",
    },
  },
  policyRuleDialog: {
    titles: {
      create: "新建规则",
      edit: "编辑规则",
    },
    fields: {
      ruleType: "规则类型",
      sortOrder: "排序",
      label: "标签",
      daysBeforeDeparture: "出发前天数",
      refundPercent: "退款比例(基点)",
      refundType: "退款类型",
      currency: "币种",
      flatAmountCents: "固定金额",
    },
    placeholders: {
      label: "如：出发前 30 天以上",
      daysBeforeDeparture: "如：30",
      refundPercent: "如：10000 = 100%",
      flatAmountCents: "如：50.00",
    },
    actions: {
      create: "创建规则",
    },
    ruleTypeLabels: {
      window: "时间窗口",
      percentage: "百分比",
      flat_amount: "固定金额",
      date_range: "日期区间",
      custom: "自定义",
    },
    refundTypeLabels: {
      cash: "现金",
      credit: "旅行储值金",
      cash_or_credit: "现金或旅行储值金",
      none: "不退款",
    },
    validation: {
      refundPercentMin: "退款比例不得低于 0",
      refundPercentMax: "退款比例不得高于 10000",
    },
  },
  signatureDialog: {
    title: "登记签署记录",
    fields: {
      signerName: "签署人姓名",
      signerEmail: "签署人邮箱",
      signerRole: "签署人角色",
      method: "方式",
      provider: "服务商",
      externalReference: "外部映射",
    },
    placeholders: {
      signerName: "全名",
      signerEmail: "email@example.com",
      signerRole: "如：CEO、法务代表",
      provider: "选填",
      externalReference: "选填",
    },
    actions: {
      submit: "登记签署记录",
    },
    methodLabels: {
      manual: "手工",
      electronic: "电子签署",
      docusign: "DocuSign",
      other: "其他",
    },
    validation: {
      signerNameRequired: "签署人姓名为必填项",
      signerEmailInvalid: "请输入有效的邮箱地址",
    },
  },
  policyVersionDialog: {
    titles: {
      create: "新建版本",
      edit: "编辑版本",
    },
    fields: {
      title: "标题",
      body: "正文",
    },
    placeholders: {
      title: "版本标题",
      body: "政策内容…",
    },
    actions: {
      create: "创建版本",
    },
    validation: {
      titleRequired: "标题为必填项",
    },
  },
} satisfies Pick<
  LegalUiMessages,
  | "policiesPage"
  | "policyDetailPage"
  | "templatesPage"
  | "templateDetailPage"
  | "attachmentDialog"
  | "policyRuleDialog"
  | "signatureDialog"
  | "policyVersionDialog"
>

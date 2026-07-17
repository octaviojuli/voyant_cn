import type { ProductsUiCatalogMessages } from "./messages-catalog.js"

export const productsUiCatalogZh = {
  productCategoryDialog: {
    titles: {
      create: "新建产品类目",
      edit: "编辑产品类目",
    },
    descriptions: {
      create: "创建用于组织产品目录的类目。",
      edit: "更新类目层级、Slug 与启用状态。",
    },
  },
  productCategoryForm: {
    fields: {
      name: "名称",
      slug: "Slug",
      parentCategory: "上级类目",
      description: "描述",
      sortOrder: "排序",
      active: "启用",
      customerPaymentPolicy: "客户付款政策",
    },
    descriptions: {
      customerPaymentPolicy:
        "设置后，该类目下的产品将继承这些条款，除非上架条目或订单另行设置覆盖。优先于供应商级政策。",
    },
    placeholders: {
      name: "探险",
      slug: "adventure",
      parentCategory: "搜索上级类目…",
      description: "类目描述…",
    },
    validation: {
      nameRequired: "类目名称为必填项。",
      slugRequired: "类目 Slug 为必填项。",
      saveFailed: "产品类目保存失败。",
    },
    actions: {
      createCategory: "创建类目",
    },
  },
  productCategoryList: {
    searchPlaceholder: "搜索产品类目…",
    addCategory: "添加类目",
    columns: {
      name: "名称",
      slug: "Slug",
      parent: "上级",
      status: "状态",
      actions: "操作",
    },
    loadingError: "产品类目加载失败。",
    empty: "未找到产品类目。",
    edit: "编辑",
    delete: "删除",
    deleteConfirm: "确定删除该产品类目吗？",
    showingSummary: "显示 {count} / {total} 条",
  },
  productTagDialog: {
    titles: {
      create: "新建产品标签",
      edit: "编辑产品标签",
    },
    descriptions: {
      create: "创建可复用的标签，用于筛选与分类。",
      edit: "更新用于标记与筛选产品的标签。",
    },
  },
  productTagForm: {
    fields: {
      name: "名称",
    },
    placeholders: {
      name: "亲子友好",
    },
    validation: {
      nameRequired: "标签名称为必填项。",
      saveFailed: "产品标签保存失败。",
    },
    actions: {
      createTag: "创建标签",
    },
  },
  productTagList: {
    searchPlaceholder: "搜索产品标签…",
    addTag: "添加标签",
    columns: {
      name: "名称",
      actions: "操作",
    },
    loadingError: "产品标签加载失败。",
    empty: "未找到产品标签。",
    edit: "编辑",
    delete: "删除",
    deleteConfirm: "确定删除该产品标签吗？",
    showingSummary: "显示 {count} / {total} 条",
  },
  productTagsPage: {
    title: "产品标签",
    description: "用于标记与筛选产品的自由标签。",
  },
  productTypesPage: {
    title: "产品类型",
    description: "产品的分类类型：城市短途、环线游、邮轮等。",
    addType: "添加类型",
    empty: "暂无产品类型。可创建城市短途、环线游或邮轮等类型。",
    edit: "编辑",
    delete: "删除",
    deleteConfirm: "确定删除该产品类型吗？",
    showingSummary: "显示 {count} / {total} 条",
    editSheetTitle: "编辑产品类型",
    newSheetTitle: "新建产品类型",
    nameLabel: "名称",
    namePlaceholder: "城市短途",
    codeLabel: "代码",
    codePlaceholder: "city-break",
    descriptionLabel: "描述",
    descriptionPlaceholder: "可选描述…",
    sortOrderLabel: "排序",
    activeLabel: "启用",
    cancel: "取消",
    saveChanges: "保存更改",
    createType: "创建类型",
    validation: {
      nameRequired: "名称为必填项",
      codeRequired: "代码为必填项",
    },
  },
  productMediaDialog: {
    titles: {
      create: "添加素材",
      edit: "编辑素材",
    },
    descriptions: {
      create: "通过 URL 登记产品级或行程日级素材。",
      edit: "更新该素材的元数据、排序与封面设置。",
    },
  },
  productMediaForm: {
    fields: {
      mediaType: "素材类型",
      name: "名称",
      url: "URL",
      storageKey: "存储键",
      mimeType: "MIME 类型",
      fileSize: "文件大小",
      sortOrder: "排序",
      coverMedia: "封面素材",
      altText: "替代文本",
    },
    placeholders: {
      name: "主视觉图",
      url: "https://example.com/media/hero.jpg",
      mimeType: "image/jpeg",
      altText: "简短的无障碍描述",
    },
    validation: {
      nameRequired: "素材名称为必填项。",
      urlRequired: "素材 URL 为必填项。",
      coverRequiresImage: "仅图片素材可设为封面。",
      saveFailed: "素材保存失败。",
    },
    actions: {
      addMedia: "添加素材",
      saveMedia: "保存素材",
    },
  },
  productMediaSection: {
    titles: {
      media: "素材",
      dayMedia: "行程日素材",
    },
    descriptions: {
      media: "管理产品级素材资源与封面选择。",
      dayMedia: "管理挂载在该行程日的素材。",
    },
    actions: {
      upload: "上传",
      addMedia: "添加素材",
      reorder: "调整排序",
      saveOrder: "保存排序",
      cancelReorder: "取消",
      drag: "拖动",
      markCover: "设为封面",
      openPreview: "打开素材预览",
      closePreview: "关闭预览",
      previousMedia: "上一个素材",
      nextMedia: "下一个素材",
      openFile: "打开文件",
      edit: "编辑",
      delete: "删除",
    },
    loadingError: "素材加载失败。",
    empty: "尚未配置素材。",
    itemCount: "素材数量：{count}",
    uploadFailed: "素材上传失败。",
    deleteConfirm: "确定删除该素材吗？",
    viewerTitle: "素材预览",
    coverBadge: "封面",
  },
} satisfies ProductsUiCatalogMessages

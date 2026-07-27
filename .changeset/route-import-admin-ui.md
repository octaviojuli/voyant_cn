---
"@voyant-travel/inventory": minor
"@voyant-travel/inventory-react": minor
"@voyant-travel/i18n": minor
---

线路上线助理接入管理后台:产品之下新增「线路上线助理」两个页面。

列表页上传 Word/PDF 并列出草稿;复核页展示线路概览图、基础信息、逐日行程
(用餐/住宿/里程车程)、费用包含与不含,以及解析器没能识别的字段,确认后
建出产品。

概览图以 `<img src="data:image/svg+xml,…">` 渲染而非内联进 DOM——图上的
城市名来自上传的文档,等同于外部输入,而 `<img>` 里的 SVG 按规范不执行脚本。

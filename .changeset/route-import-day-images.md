---
"@voyant-travel/inventory": minor
---

线路上线助理:文档内嵌配图自动挂到产品的对应日程。

Word 资料里的图片在上传时即存入对象存储并记下归属的日次,确认上线时按日次
挂到 `product_days` 上;每天的第一张设为该日封面,并另建一条产品级封面行
——否则全部图片都归了某一天,产品列表里会是一块空白。

新增 `product_import_drafts.images` 列存放已落库的图片键与归属。

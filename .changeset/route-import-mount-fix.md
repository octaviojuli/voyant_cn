---
"@voyant-travel/inventory": patch
"@voyant-travel/inventory-react": patch
---

修复线路上线助理接口与页面均无法访问的两处缺陷。

`packages/inventory/package.json` 缺少 `./import-extension` 导出,而
`operator-standard` 的启用清单按这个子路径解析扩展——解析不到就被静默丢弃,
接口从未挂载。

挂载点由 `products` 改为 `route-imports`:核心产品接口有 `/products/{id}`,
任何 `/products/<静态段>` 都会被它当成产品 ID 吃掉。前端页面路径同步移出
`/products/` 之下。

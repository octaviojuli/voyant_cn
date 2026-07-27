---
"@voyant-travel/inventory": minor
"@voyant-travel/operator-standard": minor
---

新增线路上线助理:上传 Word/PDF 线路资料,解析成待复核草稿,确认后建出产品。

新增的 `@voyant-travel/inventory/import-extension` 在 admin 面挂到 `products`
之下,提供草稿的增删改查与确认接口,并在 `operator-standard` 发行版中默认启用。

上传与确认刻意分成两步:价格、天数、费用包含解析错了是要赔钱的,中间必须
有人过目。助手一律建成 `draft` + `private` 的产品且不写入任何价格规则——
没有价格卖不出去,总好过带着 0 元价格被误发布。

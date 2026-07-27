---
"@voyant-travel/operator-settings": minor
"@voyant-travel/inventory": minor
---

线路上线助理的默认值设置。

新增 `route_import_settings` 单行表与 `GET/PATCH /v1/admin/settings/route-import`,
存售价币种、时区、产品类型、默认供应商、成人/儿童年龄线。接口同时返回
`resolved`——设置优先、缺项落兜底后**实际会用的一组值**,免得人对着一堆空值
猜「那到底会用什么」。

确认上线时的取值优先级:本次请求 > 助手设置 > 系统兜底。供应商刻意只有前
两级:它随每份资料变,做成纯设置项会逼着操作员「改设置 → 上传 → 改回来」,
早晚挂错;设置里存的只是复核界面的默认选中项。

---
"@voyant-travel/inventory-react": patch
"@voyant-travel/quotes-react": patch
---

修复 multipart 上传:FormData 请求体不再被强设为 application/json。

`fetchWithValidation` 原先只要请求体不为空就补上 `Content-Type:
application/json`。对 FormData 来说这是错的——显式设了 Content-Type,fetch
就不会生成 multipart 的 boundary,服务端收到的是一个声称是 JSON 的 multipart
body,`parseBody()` 解析不了。报价配图上传因此一直是坏的。

`legal-react` 早已有同样的防护,这里按同一写法补齐。

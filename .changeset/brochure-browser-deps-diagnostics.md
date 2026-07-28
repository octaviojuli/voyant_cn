---
"@voyant-travel/inventory": patch
---

部署的浏览器自检改为打印完整错误与缺失的共享库清单。

上一次自检只取了错误的第一行,而 playwright 的第一行永远是没有信息量的
`Target page, context or browser has been closed`,真正有用的
`error while loading shared libraries: ...` 在后面几行——被截掉后白等了一个
部署周期才知道是缺库。现在整段打印,并补一份 `ldd` 输出直接列出缺哪些 `.so`,
同时给出补齐用的那条 root 命令。

系统库的安装尝试也不再用标记文件跳过:运维补上免密 sudo 或手动装过库之后,
下一次部署就该自动恢复成浏览器排版,而不是因为一个陈年标记永远走纯文本。

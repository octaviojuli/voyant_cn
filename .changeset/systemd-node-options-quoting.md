---
"@voyant-travel/inventory": patch
---

修复 systemd 单元里 `NODE_OPTIONS` 的堆上限从未生效。

`Environment=` 的值按空格拆成多个赋值,不加引号时 `--max-old-space-size=4096`
不符合 `KEY=value` 形式会被直接丢弃,`NODE_OPTIONS` 只剩下
`--conditions=development`。每次启动 journal 里都有一行
`Invalid environment assignment, ignoring: --max-old-space-size=4096`,但服务
照常起来,所以一直没人注意。整体加引号后堆上限才真正生效——服务器现在还要
分内存给无头浏览器,给 Node 定个上限正合适。

这条规则足够机械,`deploy/ecs/lib.test.sh` 补了检查器钉住:任何带空格且未加
引号的 `Environment=` 行都会让部署前的脚本测试失败(退回坏写法即复现)。

`deploy/ecs/README.md` 同时写明 `voyant` 用户的免密 sudo 只覆盖
`systemctl restart voyant-operator` 与 `journalctl`——装包不在其中,这是部署
脚本装不上浏览器系统库的根因。

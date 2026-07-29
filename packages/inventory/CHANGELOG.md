# @voyant-travel/inventory

## 0.13.0

### Minor Changes

- f535cfd: 宣传册改走 HTML→PDF。

  原来的册子由 pdf-lib 把标记剥成纯文本一行行画出:没有表格、没有配图、没有
  页边距,标题与内部主键各印两遍,栏目名固定英文。现在渲染一份为打印而写的
  HTML,交给浏览器出 PDF,内容覆盖封面、线路概览图、行程总览表、逐日行程
  (含当天配图)、价格、费用包含/不含与预订须知。

  文案与日期金额格式跟着 `products.default_language_tag` 走——册子是发给客人
  的,不该跟着操作员当时的界面语言变。

  打印器按 Voyant Cloud 浏览器 → 本机无头浏览器 → 内置 pdf-lib 的顺序选取。
  取不到浏览器只是回落到纯文本排版,生成不会失败;自托管部署由
  `deploy/ecs/deploy.sh` 装一次本机浏览器,可用 `BROCHURE_CHROMIUM_PATH`
  指定。

  配图由服务端读字节内联成 `data:`。自托管部署的 `product_media.url` 是要鉴权
  的站内路径,让打印进程照 URL 去取只会 401,图会静默全丢而生成仍"成功"。
  内联带字节预算与优先级(封面 → 每日 → 其余);册子大小上限相应从 5 MiB
  提到 16 MiB,老上限是按纯文字 PDF 定的。

  同时修复:每日正文被转义后当纯文本印出标签;每日正文把景点词条重复追加了
  一遍;线路上线助理的接口未声明权限资源,运行时按挂载点推导出访问目录里
  不存在的 `route-imports`,这条接口因此不带产品权限校验。

- 192a635: 线路上线助理接入管理后台:产品之下新增「线路上线助理」两个页面。

  列表页上传 Word/PDF 并列出草稿;复核页展示线路概览图、基础信息、逐日行程
  (用餐/住宿/里程车程)、费用包含与不含,以及解析器没能识别的字段,确认后
  建出产品。

  概览图以 `<img src="data:image/svg+xml,…">` 渲染而非内联进 DOM——图上的
  城市名来自上传的文档,等同于外部输入,而 `<img>` 里的 SVG 按规范不执行脚本。

- 15d1f88: 新增线路上线助理:上传 Word/PDF 线路资料,解析成待复核草稿,确认后建出产品。

  新增的 `@voyant-travel/inventory/import-extension` 在 admin 面挂到 `products`
  之下,提供草稿的增删改查与确认接口,并在 `operator-standard` 发行版中默认启用。

  上传与确认刻意分成两步:价格、天数、费用包含解析错了是要赔钱的,中间必须
  有人过目。助手一律建成 `draft` + `private` 的产品且不写入任何价格规则——
  没有价格卖不出去,总好过带着 0 元价格被误发布。

- 08c5aa2: 线路上线助理:文档内嵌配图自动挂到产品的对应日程。

  Word 资料里的图片在上传时即存入对象存储并记下归属的日次,确认上线时按日次
  挂到 `product_days` 上;每天的第一张设为该日封面,并另建一条产品级封面行
  ——否则全部图片都归了某一天,产品列表里会是一块空白。

  新增 `product_import_drafts.images` 列存放已落库的图片键与归属。

- ffcf632: 线路上线助理的默认值设置。

  新增 `route_import_settings` 单行表与 `GET/PATCH /v1/admin/settings/route-import`,
  存售价币种、时区、产品类型、默认供应商、成人/儿童年龄线。接口同时返回
  `resolved`——设置优先、缺项落兜底后**实际会用的一组值**,免得人对着一堆空值
  猜「那到底会用什么」。

  确认上线时的取值优先级:本次请求 > 助手设置 > 系统兜底。供应商刻意只有前
  两级:它随每份资料变,做成纯设置项会逼着操作员「改设置 → 上传 → 改回来」,
  早晚挂错;设置里存的只是复核界面的默认选中项。

### Patch Changes

- 89fe90a: 下单报价按产品币种挑选价目表,不再固定取「默认公开价目表」。

  `loadResolvedOptionPrice` 原先只查一条 `catalog_type = public AND is_default`
  的价目表。这条查询有两处问题,叠在一起会让产品上配的价目规则**整体失效**:

  - `is_default` 没有唯一约束,基线数据里 EUR 与 GBP 两张公开价目表都带这个标记,
    `.limit(1)` 取到哪一张是随机的;
  - 完全没有比对币种,人民币产品会被拿去 EUR 价目表里找规则。

  找不到规则时调用方会一路回落到 `product.sell_amount_cents × 人数`——一个按人头
  平摊的固定单价。于是分档单价、季节价目档期、班期改价全部成了死配置,而且**不报
  错**:那个固定单价看着是对的,只有把儿童和成人放进同一单才会露馅——儿童被按成人
  价收了。

  改为先按产品的 `sell_currency` 过滤公开价目表,再按 `is_default`、`code` 排出
  候选顺序,逐个试到真正给该选项定了价的那一张为止。没有同币种价目表时仍会退回其
  余公开价目表,保持原有行为。

- 5652440: 部署的浏览器自检改为打印完整错误与缺失的共享库清单。

  上一次自检只取了错误的第一行,而 playwright 的第一行永远是没有信息量的
  `Target page, context or browser has been closed`,真正有用的
  `error while loading shared libraries: ...` 在后面几行——被截掉后白等了一个
  部署周期才知道是缺库。现在整段打印,并补一份 `ldd` 输出直接列出缺哪些 `.so`,
  同时给出补齐用的那条 root 命令。

  系统库的安装尝试也不再用标记文件跳过:运维补上免密 sudo 或手动装过库之后,
  下一次部署就该自动恢复成浏览器排版,而不是因为一个陈年标记永远走纯文本。

- 4ac7d46: 本机浏览器探测改为真启动一次,而不是只看可执行文件在不在。

  缺 `libnss3`、`libgbm1` 这类系统库时,二进制在、一启动就炸。只做存在性检查的
  话,探测会判定「能用」,生成宣传册当场 500——回落形同虚设。现在每个可执行
  文件在进程内真启一次并缓存结果,启不起来就回落到内置的纯文本打印器。

  线上正是这个形态:部署装浏览器用了 `--with-deps`,而它内部会 `sudo apt-get`;
  经 SSH 以非 root 用户运行、没有 TTY 也没有对应的免密 sudo,提权失败即整体
  退出,**连浏览器本体都没下**。部署脚本因此改为:系统库与浏览器本体分开装,
  系统库用 `sudo -n` 逐个尝试(装不上就算了),浏览器本体单独下载(纯下载,
  不需要任何权限),最后真启一次把结论打进部署日志——否则只能等到线上生成
  一份册子、看 PDF 的 Producer 才发现根本没走浏览器排版。

- f5e02bd: 浏览器探测不再缓存失败结果。

  原先启不动会把「不可用」缓存到进程结束。缺系统库时运维补装是常态,而负缓存
  意味着装好库之后还必须重启服务才恢复——部署日志里写的却是「装完不必重新
  部署」,那句话会因此变成假的。现在只缓存成功。

  代价是缺库期间每次生成都多试一次启动,但那种失败是立即返回的(动态链接器找
  不到 `.so` 就退出),量级在百毫秒,可以接受。

  `resolveLocalChromiumPrinter` 同时开放了注入浏览器工厂的入口,只为让这条规则
  可测:「先失败后成功」这种时序真 playwright 造不出来。

- 37fac2f: 修复线路上线助理接口与页面均无法访问的两处缺陷。

  `packages/inventory/package.json` 缺少 `./import-extension` 导出,而
  `operator-standard` 的启用清单按这个子路径解析扩展——解析不到就被静默丢弃,
  接口从未挂载。

  挂载点由 `products` 改为 `route-imports`:核心产品接口有 `/products/{id}`,
  任何 `/products/<静态段>` 都会被它当成产品 ID 吃掉。前端页面路径同步移出
  `/products/` 之下。

- 34aaebe: 解析器:须知章节被排在行程正文里时也能取到,并从当天正文剔除。

  部分供应商把整条线路的须知塞在第一天与第二天之间。尾部章节原先只从最后一个
  日次之后开始搜,于是须知既提取不到,又会原样混进当天的行程正文。

  同时补上「旅游需知」「出行须知」「温馨提示」「特别说明」几种标题写法——
  「需知」不是「须知」,少一个字整章就丢了。

- 89fe90a: 修复 systemd 单元里 `NODE_OPTIONS` 的堆上限从未生效。

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

- Updated dependencies [89fe90a]
- Updated dependencies [ffcf632]
  - @voyant-travel/operations@0.8.1
  - @voyant-travel/operator-settings@0.6.0
  - @voyant-travel/finance@0.163.0
  - @voyant-travel/bookings@0.163.0
  - @voyant-travel/catalog@0.161.0
  - @voyant-travel/workflows@0.122.1
  - @voyant-travel/commerce@0.37.1
  - @voyant-travel/relationships@0.127.1

## 0.12.0

### Minor Changes

- 8f0fa26: Make Hono the explicit sole server API runtime while moving package and
  deployment interfaces to role-based API vocabulary. Replace Hono-prefixed module,
  extension, bundle, lazy-route, and factory names with `Api*` names; move
  router-named domain runtime entry points to `./api-runtime`; and remove the old
  names without compatibility aliases.

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/action-ledger@0.110.0
  - @voyant-travel/bookings@0.162.0
  - @voyant-travel/catalog@0.160.0
  - @voyant-travel/commerce@0.37.0
  - @voyant-travel/finance@0.162.0
  - @voyant-travel/hono@0.128.0
  - @voyant-travel/operations@0.8.0
  - @voyant-travel/operator-settings@0.5.0
  - @voyant-travel/relationships@0.127.0
  - @voyant-travel/storage@0.111.0
  - @voyant-travel/workflows@0.122.0
  - @voyant-travel/db@0.114.8

## 0.11.1

### Patch Changes

- Updated dependencies [85bfe2c]
- Updated dependencies [a1842a7]
- Updated dependencies [85bfe2c]
  - @voyant-travel/finance@0.161.0
  - @voyant-travel/hono@0.127.2
  - @voyant-travel/action-ledger@0.109.1
  - @voyant-travel/bookings@0.161.0
  - @voyant-travel/catalog@0.159.0
  - @voyant-travel/commerce@0.36.1
  - @voyant-travel/operator-settings@0.4.1
  - @voyant-travel/relationships@0.126.1
  - @voyant-travel/operations@0.7.1

## 0.11.0

### Minor Changes

- a2fd806: Add package-owned MCP Tools for atomic product composition, composed booking creation,
  and approval-gated invoice/proforma issue from bookings. Reuse the existing domain
  orchestrators, structural schemas, mutation ledgers, and post-commit events, and make
  approved invoice execution exactly idempotent.
- 7e4ab07: Add guarded MCP Tools for product extras and option-level extra configuration.

### Patch Changes

- 372f4f4: Add a separately selectable Operations-owned dashboard Tool that composes the real aggregate
  services from Bookings, Finance, Inventory, Distribution, and Operations without crossing domain
  persistence boundaries. Require every underlying read scope and return structural source
  projections, KPIs, and bounded alerts.

  Complete the Quotes proposal lifecycle Tool surface with snapshot, send, accept, and decline
  capabilities, structural JSON-safe outputs, compatibility aliases, staff-only grants,
  confirmation, and graph-ledger/approval policy.

- 497dff2: Add governed product authoring, lifecycle, and composed-content read Tools plus provider-neutral trip requirement, candidate sourcing, selection, and re-shop Tools.
- 6604f9e: Expose structural output schemas for every first-party Tool that previously used an opaque runtime-only schema.
- Updated dependencies [cabf662]
- Updated dependencies [701ccc4]
- Updated dependencies [5f15e2e]
- Updated dependencies [7ac40a0]
- Updated dependencies [372f4f4]
- Updated dependencies [a2fd806]
- Updated dependencies [b8cef4c]
- Updated dependencies [db5adce]
- Updated dependencies [90e8d6d]
- Updated dependencies [54be000]
- Updated dependencies [bf19d5a]
- Updated dependencies [c9b6144]
- Updated dependencies [6604f9e]
- Updated dependencies [ff87f68]
  - @voyant-travel/action-ledger@0.109.0
  - @voyant-travel/core@0.124.0
  - @voyant-travel/tools@0.3.0
  - @voyant-travel/bookings@0.160.0
  - @voyant-travel/finance@0.160.0
  - @voyant-travel/catalog@0.158.0
  - @voyant-travel/commerce@0.36.0
  - @voyant-travel/operations@0.7.0
  - @voyant-travel/operator-settings@0.4.0
  - @voyant-travel/relationships@0.126.0
  - @voyant-travel/db@0.114.7
  - @voyant-travel/hono@0.127.1
  - @voyant-travel/storage@0.110.2
  - @voyant-travel/workflows@0.121.0

## 0.10.4

### Patch Changes

- 49f55d0: Keep catalog booking and checkout as a two-phase flow, and atomically convert
  owned-product availability holds into on-hold booking allocations without
  consuming capacity twice. Hold placement and release are now idempotent across
  retries and duplicate tokens, converted holds retain an audit link to their
  booking allocation, and checkout-only intents receive structured validation
  errors from the reservation route.
- Updated dependencies [7e9f77a]
- Updated dependencies [49f55d0]
- Updated dependencies [552acbf]
- Updated dependencies [9c85101]
  - @voyant-travel/core@0.123.0
  - @voyant-travel/hono@0.127.0
  - @voyant-travel/bookings@0.159.0
  - @voyant-travel/catalog@0.157.0
  - @voyant-travel/finance@0.159.0
  - @voyant-travel/operations@0.6.14
  - @voyant-travel/tools@0.2.2
  - @voyant-travel/action-ledger@0.108.6
  - @voyant-travel/commerce@0.35.9
  - @voyant-travel/db@0.114.6
  - @voyant-travel/operator-settings@0.3.14
  - @voyant-travel/relationships@0.125.4
  - @voyant-travel/storage@0.110.1
  - @voyant-travel/workflows@0.120.4

## 0.10.3

### Patch Changes

- 73ab096: Standardize first-party packages on package-owned deployment manifests, provider selection,
  access metadata, concrete event contracts, selected admin navigation, and published runtime
  references. Add Bookings Extras as an independently selected graph unit and remove the central
  admin navigation catalog.
  Link facets now distinguish entity `linkable` metadata from executable `definition` exports, and
  generated Node registries reject malformed definitions before service registration.
  Provider-owned required config and secrets now apply only when that provider is selected, so
  local and in-memory deployments do not require credentials for inactive remote providers.
- Updated dependencies [73ab096]
  - @voyant-travel/bookings@0.158.0
  - @voyant-travel/storage@0.110.0
  - @voyant-travel/action-ledger@0.108.5
  - @voyant-travel/catalog@0.156.0
  - @voyant-travel/commerce@0.35.8
  - @voyant-travel/core@0.122.2
  - @voyant-travel/db@0.114.5
  - @voyant-travel/finance@0.158.0
  - @voyant-travel/operations@0.6.13
  - @voyant-travel/operator-settings@0.3.13
  - @voyant-travel/relationships@0.125.3
  - @voyant-travel/types@0.109.2
  - @voyant-travel/workflows@0.120.3

## 0.10.2

### Patch Changes

- Updated dependencies [0808b21]
  - @voyant-travel/catalog@0.155.0
  - @voyant-travel/products-contracts@0.107.2
  - @voyant-travel/bookings@0.157.0
  - @voyant-travel/finance@0.157.0
  - @voyant-travel/commerce@0.35.7
  - @voyant-travel/operations@0.6.12
  - @voyant-travel/relationships@0.125.2
  - @voyant-travel/operator-settings@0.3.12

## 0.10.1

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.
- Updated dependencies [8d62a7c]
- Updated dependencies [7916020]
- Updated dependencies [8d62a7c]
  - @voyant-travel/core@0.122.1
  - @voyant-travel/db@0.114.4
  - @voyant-travel/types@0.109.1
  - @voyant-travel/utils@0.107.1
  - @voyant-travel/catalog@0.154.1
  - @voyant-travel/action-ledger@0.108.4
  - @voyant-travel/bookings@0.156.1
  - @voyant-travel/commerce@0.35.6
  - @voyant-travel/extras-contracts@0.104.3
  - @voyant-travel/finance@0.156.1
  - @voyant-travel/hono@0.126.3
  - @voyant-travel/operations@0.6.11
  - @voyant-travel/operator-settings@0.3.11
  - @voyant-travel/products-contracts@0.107.1
  - @voyant-travel/relationships@0.125.1
  - @voyant-travel/storage@0.109.4
  - @voyant-travel/tools@0.2.1
  - @voyant-travel/workflows@0.120.2

## 0.10.0

### Minor Changes

- bbe6396: Replace the overloaded Finance voucher domain with Travel Credits across the
  database schema, APIs, package exports, booking inputs, storefront settings,
  and operator UI. Redemption commands are replay-safe, codes are normalized and
  case-insensitively unique, and legacy records migrate in place without silently
  skipping invalid balances. Keep Promotion Codes in Commerce and move Bookings
  fulfillment to the explicit Service Voucher vocabulary.

### Patch Changes

- Updated dependencies [bbe6396]
  - @voyant-travel/finance@0.156.0
  - @voyant-travel/bookings@0.156.0
  - @voyant-travel/products-contracts@0.107.0
  - @voyant-travel/relationships@0.125.0
  - @voyant-travel/catalog@0.154.0
  - @voyant-travel/commerce@0.35.5
  - @voyant-travel/operator-settings@0.3.10
  - @voyant-travel/db@0.114.3
  - @voyant-travel/workflows@0.120.1
  - @voyant-travel/operations@0.6.10

## 0.9.3

### Patch Changes

- cc85042: Make deployment provider selection authoritative for Node storage, cache, shared
  state, and rate limiting. Replace vendor-specific object-store bindings and R2
  shims with logical media/document stores, a memory provider, an AWS SDK v3
  S3-compatible provider, and package-selected custom adapters. Add a portable
  storage provider conformance runner, resolve adapters from the `storage.object`
  graph provider, and make provider config/secret/resource usage explicit. Keep
  distributed shared state and rate-limit KV authoritative by bypassing the
  cache-only process-local L1, and move guest booking lookups onto the selected
  atomic rate-limit store. Remove the former R2/SigV4 exports.
- Updated dependencies [818ea84]
- Updated dependencies [cc85042]
- Updated dependencies [07a6ee3]
  - @voyant-travel/workflows@0.120.0
  - @voyant-travel/core@0.122.0
  - @voyant-travel/bookings@0.155.1
  - @voyant-travel/db@0.114.2
  - @voyant-travel/finance@0.155.1
  - @voyant-travel/hono@0.126.2
  - @voyant-travel/storage@0.109.3
  - @voyant-travel/action-ledger@0.108.3
  - @voyant-travel/catalog@0.153.1
  - @voyant-travel/commerce@0.35.3
  - @voyant-travel/operations@0.6.9
  - @voyant-travel/operator-settings@0.3.9
  - @voyant-travel/relationships@0.124.4

## 0.9.2

### Patch Changes

- Updated dependencies [3f6694b]
  - @voyant-travel/core@0.121.0
  - @voyant-travel/action-ledger@0.108.2
  - @voyant-travel/bookings@0.155.0
  - @voyant-travel/catalog@0.153.0
  - @voyant-travel/commerce@0.35.2
  - @voyant-travel/db@0.114.1
  - @voyant-travel/finance@0.155.0
  - @voyant-travel/hono@0.126.1
  - @voyant-travel/operations@0.6.8
  - @voyant-travel/operator-settings@0.3.8
  - @voyant-travel/relationships@0.124.3
  - @voyant-travel/storage@0.109.2
  - @voyant-travel/workflows@0.119.0

## 0.9.1

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [bef5b7c]
  - @voyant-travel/hono@0.126.0
  - @voyant-travel/types@0.109.0
  - @voyant-travel/utils@0.107.0
  - @voyant-travel/db@0.114.0
  - @voyant-travel/finance@0.154.0
  - @voyant-travel/core@0.120.0
  - @voyant-travel/action-ledger@0.108.1
  - @voyant-travel/bookings@0.154.0
  - @voyant-travel/catalog@0.152.0
  - @voyant-travel/commerce@0.35.1
  - @voyant-travel/operations@0.6.7
  - @voyant-travel/operator-settings@0.3.7
  - @voyant-travel/relationships@0.124.2
  - @voyant-travel/storage@0.109.1
  - @voyant-travel/workflows@0.118.0

## 0.9.0

### Minor Changes

- 047c3f9: Add package-owned graph runtime factories and typed deployment ports for Catalog search, booking, and offers; Inventory core, content, and brochures; Accommodations and Cruises content; and Action Ledger health.
- 490d132: Move owned product, accommodation, and cruise booking runtime behavior out of the Operator starter and into package-owned runtime surfaces.
- 490d132: Move standard Node media storage, video upload, document delivery, and brochure printing authority into package-owned runtime contributors.
- 282892e: Make `@voyant-travel/runtime` the single public Node project host, move low-level
  host primitives to `@voyant-travel/runtime-core`, and remove the package-owned
  runtime CLI. Rename remaining first-party operator-specific subpaths to generic
  runtime or runtime-support surfaces.

### Patch Changes

- 490d132: Move standard cross-package links from the operator starter to package-owned
  manifests and explicit standard-product selections, and generate executable
  links from the selected deployment graph.
- 490d132: Move Trips lifecycle composition, checkout FX handling, payment-policy readers, and workflow effects from the Operator starter into package-owned runtime surfaces.
- 490d132: Move Commerce runtime composition from the Operator starter into statically selected package contributors and typed domain ports.
- 490d132: Expose package-owned runtime contributor maps for Storefront, Legal, and Inventory deployment adapters.
- 490d132: Derive the final package runtime bindings from generic deployment capabilities and primitives, with no product-specific generated runtime host resources.
- 490d132: Declare package-owned runtime contributors in `voyant.package.v1` metadata and statically lower selected contributors into generated Node graph source. Node hosts now compose one generated contributor set from opaque host resources without enumerating first-party factories or package IDs.
- 490d132: Compose MCP tools and their service context from graph-selected package runtime exports instead of an Operator-owned product catalog.
- 490d132: Move runtime construction into BOM-selected domain contributors and replace the Finance target package with typed graph ports while keeping package dependencies acyclic.
- 490d132: Move catalog content configuration, booking financial lifecycle behavior, and catalog/commerce scheduled work behind package-owned graph factories and workflows.
- c65b05c: Move standard cross-package link tables and the person directory view into
  upgrade-safe package migration histories, use stable package ledger identities,
  and remove aggregate Drizzle and migration authority from the Operator starter.
- 490d132: Move Inventory workflow and brochure runtime composition behind package-owned typed ports and remove the Operator runtime capability.
- 490d132: Move the Catalog, Commerce, and Inventory OpenAPI surfaces to exact selected-graph API ownership, including overlapping package extensions.
- 490d132: Compose Action Ledger health from typed Bookings, Finance, and Inventory graph ports, consolidate Distribution channel-push composition into its domain package, and make Workflow Runs own runner registration authority.
- 490d132: Make package and project declarations the sole selected access authority, removing legacy catalog overlays and runtime synthesis.
- 490d132: Remove the final Operator admin factory compatibility registry by composing cross-domain behavior through package-owned selected graph slots and contributions.
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [cda53b6]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [282892e]
- Updated dependencies [490d132]
  - @voyant-travel/bookings@0.153.0
  - @voyant-travel/commerce@0.35.0
  - @voyant-travel/finance@0.153.0
  - @voyant-travel/action-ledger@0.108.0
  - @voyant-travel/relationships@0.124.1
  - @voyant-travel/storage@0.109.0
  - @voyant-travel/db@0.113.0
  - @voyant-travel/core@0.119.0
  - @voyant-travel/catalog@0.151.0
  - @voyant-travel/operations@0.6.6
  - @voyant-travel/operator-settings@0.3.6
  - @voyant-travel/tools@0.2.0
  - @voyant-travel/hono@0.125.1
  - @voyant-travel/types@0.108.1
  - @voyant-travel/workflows@0.117.0

## 0.8.6

### Patch Changes

- 8f4c242: Derive anonymous public and transactional path posture from selected deployment graph API bundles, including partial transactional path declarations.
- Updated dependencies [e68bdc1]
- Updated dependencies [d771be3]
- Updated dependencies [8e67fe8]
- Updated dependencies [26fe0e5]
- Updated dependencies [d771be3]
- Updated dependencies [18d8aa0]
- Updated dependencies [9b15ebe]
- Updated dependencies [8f4c242]
- Updated dependencies [d771be3]
- Updated dependencies [8f537b0]
- Updated dependencies [d26a820]
- Updated dependencies [d771be3]
- Updated dependencies [bd7a830]
  - @voyant-travel/catalog@0.150.0
  - @voyant-travel/commerce@0.34.0
  - @voyant-travel/core@0.118.0
  - @voyant-travel/action-ledger@0.107.0
  - @voyant-travel/types@0.108.0
  - @voyant-travel/hono@0.125.0
  - @voyant-travel/operations@0.6.5
  - @voyant-travel/db@0.112.2
  - @voyant-travel/storage@0.108.1
  - @voyant-travel/utils@0.106.1
  - @voyant-travel/workflows@0.116.0

## 0.8.5

### Patch Changes

- e5aa097: Activate package-owned workflow declarations through the generated deployment graph and deployment-supplied Node runtime services.
- 2ec05ae: Publish the product PDF workflow deployment runtime service contract for graph activation.
- Updated dependencies [c66f9a5]
  - @voyant-travel/core@0.117.0
  - @voyant-travel/storage@0.108.0
  - @voyant-travel/action-ledger@0.106.4
  - @voyant-travel/catalog@0.149.4
  - @voyant-travel/commerce@0.33.5
  - @voyant-travel/db@0.112.1
  - @voyant-travel/hono@0.124.1
  - @voyant-travel/operations@0.6.4
  - @voyant-travel/workflows@0.115.2

## 0.8.4

### Patch Changes

- Updated dependencies [ca90eb5]
  - @voyant-travel/db@0.112.0
  - @voyant-travel/hono@0.124.0
  - @voyant-travel/action-ledger@0.106.3
  - @voyant-travel/catalog@0.149.3
  - @voyant-travel/commerce@0.33.4
  - @voyant-travel/operations@0.6.3
  - @voyant-travel/types@0.107.3
  - @voyant-travel/workflows@0.115.1

## 0.8.3

### Patch Changes

- Updated dependencies [8576451]
  - @voyant-travel/core@0.116.0
  - @voyant-travel/workflows@0.115.0
  - @voyant-travel/action-ledger@0.106.2
  - @voyant-travel/catalog@0.149.2
  - @voyant-travel/commerce@0.33.3
  - @voyant-travel/db@0.111.2
  - @voyant-travel/hono@0.123.2
  - @voyant-travel/operations@0.6.2
  - @voyant-travel/storage@0.107.2

## 0.8.2

### Patch Changes

- Updated dependencies [d41872a]
  - @voyant-travel/workflows@0.114.0
  - @voyant-travel/commerce@0.33.2
  - @voyant-travel/hono@0.123.1

## 0.8.1

### Patch Changes

- e4e6621: Model package-owned Hono extensions as first-class deployment graph units while keeping externally distributed integrations in the plugin lane.
- Updated dependencies [e4e6621]
- Updated dependencies [953e418]
- Updated dependencies [2153e48]
- Updated dependencies [ec75753]
  - @voyant-travel/core@0.115.0
  - @voyant-travel/action-ledger@0.106.1
  - @voyant-travel/catalog@0.149.1
  - @voyant-travel/commerce@0.33.1
  - @voyant-travel/hono@0.123.0
  - @voyant-travel/workflows@0.113.0
  - @voyant-travel/db@0.111.1
  - @voyant-travel/operations@0.6.1
  - @voyant-travel/storage@0.107.1

## 0.8.0

### Minor Changes

- a370024: Publish package-owned deployment manifests for catalog, commerce, and inventory
  runtime, persistence, orchestration, and extension surfaces.
- a370024: Publish package-owned deployment declarations and configurable runtime factories for vertical
  content, brochure, booking-extension, base API, and scheduled workflow surfaces.
- e3dc5a9: Declare package-owned admin route and copy facets for vertical modules with existing public admin extensions.
- e3dc5a9: Declare package-owned Node deployment facets for product events, subscribers, workflows, access resources, tools, actions, and retain-data lifecycle behavior.

### Patch Changes

- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
  - @voyant-travel/core@0.114.0
  - @voyant-travel/catalog@0.149.0
  - @voyant-travel/commerce@0.33.0
  - @voyant-travel/action-ledger@0.106.0
  - @voyant-travel/db@0.111.0
  - @voyant-travel/operations@0.6.0
  - @voyant-travel/storage@0.107.0
  - @voyant-travel/hono@0.122.4
  - @voyant-travel/types@0.107.2
  - @voyant-travel/workflows@0.112.0

## 0.7.11

### Patch Changes

- Updated dependencies [496f2ef]
  - @voyant-travel/core@0.113.0
  - @voyant-travel/commerce@0.32.0
  - @voyant-travel/action-ledger@0.105.15
  - @voyant-travel/catalog@0.148.0
  - @voyant-travel/db@0.110.2
  - @voyant-travel/hono@0.122.3
  - @voyant-travel/operations@0.5.23

## 0.7.10

### Patch Changes

- 5e1d221: Publish `voyant.package.v1` compatibility metadata from first-party
  schema-owning packages so deployment graph package admission can validate their
  framework, target, and deployment-mode compatibility before runtime imports.
- Updated dependencies [5e1d221]
- Updated dependencies [682d7d0]
  - @voyant-travel/action-ledger@0.105.14
  - @voyant-travel/catalog@0.147.1
  - @voyant-travel/commerce@0.31.1
  - @voyant-travel/db@0.110.1
  - @voyant-travel/operations@0.5.22
  - @voyant-travel/hono@0.122.2

## 0.7.9

### Patch Changes

- @voyant-travel/catalog@0.147.0
- @voyant-travel/commerce@0.31.0
- @voyant-travel/operations@0.5.21

## 0.7.8

### Patch Changes

- @voyant-travel/catalog@0.146.0
- @voyant-travel/commerce@0.30.0
- @voyant-travel/operations@0.5.20

## 0.7.7

### Patch Changes

- @voyant-travel/catalog@0.145.0
- @voyant-travel/commerce@0.29.0
- @voyant-travel/operations@0.5.19

## 0.7.6

### Patch Changes

- @voyant-travel/catalog@0.144.0
- @voyant-travel/commerce@0.28.0
- @voyant-travel/operations@0.5.18

## 0.7.5

### Patch Changes

- Updated dependencies [4829ef3]
  - @voyant-travel/catalog@0.143.0
  - @voyant-travel/commerce@0.27.0
  - @voyant-travel/operations@0.5.17
  - @voyant-travel/products-contracts@0.106.1

## 0.7.4

### Patch Changes

- @voyant-travel/commerce@0.26.0
- @voyant-travel/catalog@0.142.0
- @voyant-travel/operations@0.5.16

## 0.7.3

### Patch Changes

- 425f92e: Add Node-native cache and shared-state providers behind the existing KVStore
  surface, including in-process LRU, tiered Redis/Postgres providers, Postgres
  fixed-window rate limiting, Redis rate limiting, and managed-runtime provider
  selection without KV-shaped binding requirements.
- Updated dependencies [425f92e]
  - @voyant-travel/utils@0.106.0
  - @voyant-travel/db@0.110.0
  - @voyant-travel/hono@0.122.0
  - @voyant-travel/core@0.112.3
  - @voyant-travel/action-ledger@0.105.13
  - @voyant-travel/catalog@0.141.0
  - @voyant-travel/commerce@0.25.0
  - @voyant-travel/operations@0.5.15
  - @voyant-travel/types@0.107.1

## 0.7.2

### Patch Changes

- Updated dependencies [05c10f2]
  - @voyant-travel/commerce@0.24.0
  - @voyant-travel/catalog@0.140.0
  - @voyant-travel/operations@0.5.14

## 0.7.1

### Patch Changes

- Updated dependencies [6711f4c]
  - @voyant-travel/catalog@0.139.0
  - @voyant-travel/commerce@0.23.0
  - @voyant-travel/operations@0.5.13

## 0.7.0

### Minor Changes

- 8405bee: Fold the product's default itinerary into the catalog product read-model document.

  `getCatalogProductById` (and the `/v1/public/products/:id` + `/slug/:slug`
  read-through documents) can now include the product's default day-by-day
  itinerary — days and day-services with `product_day_translations` /
  `product_day_service_translations` resolved by the document's locale, plus a
  per-day thumbnail. It is opt-in via `?include=itinerary`, encoded in the
  read-model variant so itinerary and non-itinerary documents cache — and warm on
  mutation — independently. Only the product default itinerary is folded;
  departure-specific overrides stay on the departure itinerary endpoint.

  The itinerary update/delete/duplicate admin routes (keyed on the itinerary id,
  not the product id) now trigger read-model recompute so the folded itinerary
  stays fresh.

### Patch Changes

- Updated dependencies [8405bee]
  - @voyant-travel/products-contracts@0.106.0
  - @voyant-travel/commerce@0.22.0
  - @voyant-travel/catalog@0.138.0
  - @voyant-travel/operations@0.5.12

## 0.6.1

### Patch Changes

- 4504abb: Export product read-model helpers and the public product read service, and add a write-time warm path for product read-model recomputation after inventory mutations.

## 0.6.0

### Minor Changes

- 77f139b: Add read-only agent tools for the products domain at
  `@voyant-travel/inventory/tools`: `list_products` and `get_product`, exposed as
  headless `defineTool`s over the existing products service (`products:read` scope,
  read tier). The operator registers them on the in-deployment MCP server alongside
  the trips tools — establishing the module-owned-tools pattern for the remaining
  domains.

### Patch Changes

- Updated dependencies [c9a356f]
- Updated dependencies [689a289]
- Updated dependencies [6474f42]
- Updated dependencies [5786f63]
- Updated dependencies [0c75844]
- Updated dependencies [1655995]
- Updated dependencies [22f0457]
  - @voyant-travel/types@0.107.0
  - @voyant-travel/core@0.112.0
  - @voyant-travel/hono@0.121.0
  - @voyant-travel/catalog@0.137.0
  - @voyant-travel/commerce@0.21.0
  - @voyant-travel/tools@0.1.0
  - @voyant-travel/operations@0.5.10
  - @voyant-travel/utils@0.105.6
  - @voyant-travel/action-ledger@0.105.12
  - @voyant-travel/db@0.109.5

## 0.5.18

### Patch Changes

- ae115de: Use owned product option-unit pax pricing tiers when booking journey quotes include explicit unit selections.

## 0.5.17

### Patch Changes

- Updated dependencies [1cb9cba]
- Updated dependencies [131ff9b]
- Updated dependencies [f1090b7]
- Updated dependencies [42f662c]
- Updated dependencies [fead555]
  - @voyant-travel/hono@0.120.0
  - @voyant-travel/operations@0.5.9
  - @voyant-travel/action-ledger@0.105.11
  - @voyant-travel/catalog@0.136.3
  - @voyant-travel/commerce@0.20.5

## 0.5.16

### Patch Changes

- Updated dependencies [86fbb05]
  - @voyant-travel/hono@0.119.0
  - @voyant-travel/action-ledger@0.105.10
  - @voyant-travel/catalog@0.136.2
  - @voyant-travel/commerce@0.20.4
  - @voyant-travel/operations@0.5.8

## 0.5.15

### Patch Changes

- 2d3b039: Offer bank transfer and inquiry on owned-product storefront checkout.

  The owned-product booking draft shape hardcoded `paymentIntents: ["hold",
"card"]`, so the storefront Payment step collapsed to card-only for owned
  products even though the deployment advertised bank transfer and inquiry
  (sourced products already offered all three). Both product draft shapes now
  declare the full engine allow list via a shared `DEFAULT_PAYMENT_INTENTS`
  constant, and deployment/surface `PaymentProviderCapabilities` narrow it at
  render time — so owned and sourced products offer the same payment paths. The
  `/checkout/start` flow already handled bank transfer and inquiry generically on
  the booking row, so no server change was needed.

- Updated dependencies [dd03968]
- Updated dependencies [2d3b039]
- Updated dependencies [bcd76ae]
  - @voyant-travel/operations@0.5.7
  - @voyant-travel/catalog@0.136.1
  - @voyant-travel/commerce@0.20.3

## 0.5.14

### Patch Changes

- 9ebd8e8: Owned product booking commit now resolves (or creates) a CRM person from the
  billing contact when the commit carries no `personId`/`organizationId` — the
  anonymous storefront checkout case. `createProductsBookingHandler` accepts a new
  optional `resolveBillingPerson` bridge (wired by the template to
  `relationshipsService.upsertPersonFromContact`), mirroring the sourced/session
  arm's `resolveBillingPerson` hook. This fixes anonymous storefront checkout for
  owned public products, which previously failed with a 400 "Select a billing
  person or organization".

## 0.5.13

### Patch Changes

- @voyant-travel/commerce@0.20.0
- @voyant-travel/catalog@0.136.0
- @voyant-travel/operations@0.5.6

## 0.5.12

### Patch Changes

- c5cd9cd: Return structured 409 conflicts for duplicate inventory taxonomy and product translation creates.
- Updated dependencies [fd17317]
  - @voyant-travel/hono@0.118.3

## 0.5.11

### Patch Changes

- 5c1294f: Reject inverted inventory product dates, option availability dates, option-unit quantity bounds, and duplicate itinerary day numbers.
- Updated dependencies [5c1294f]
  - @voyant-travel/products-contracts@0.105.17

## 0.5.10

### Patch Changes

- a10b9ba: Return deterministic 503 responses when product brochure generation cannot upload to configured storage or resolve a brochure URL.
- e005c4d: Reject inverted product option-unit age ranges and commerce pricing ranges across schemas and service mutations.
- ad02eae: Reject non-image product media as cover media and surface brochure generation failures in the product detail UI.
- Updated dependencies [ed5463f]
- Updated dependencies [e005c4d]
  - @voyant-travel/operations@0.5.5
  - @voyant-travel/products-contracts@0.105.16
  - @voyant-travel/commerce@0.19.4

## 0.5.9

### Patch Changes

- 61410dd: Preserve catalog sourced-entry provenance when packaged detail pages start the booking journey.
- Updated dependencies [61410dd]
  - @voyant-travel/catalog@0.135.3

## 0.5.8

### Patch Changes

- 98e270c: Add a public-audience listability predicate to the product document builder so deployments can tombstone non-listable customer catalog documents.
- Updated dependencies [d2351e0]
  - @voyant-travel/catalog@0.135.2

## 0.5.7

### Patch Changes

- fcb8b88: Add catalog-authoring validation for transfer pickup/dropoff rules, block static availability for dynamic products, and require scheduled products to have a future open departure before publishing.
- Updated dependencies [fcb8b88]
  - @voyant-travel/operations@0.5.4

## 0.5.6

### Patch Changes

- Updated dependencies [9a1197b]
  - @voyant-travel/storage@0.106.0
  - @voyant-travel/hono@0.118.0
  - @voyant-travel/action-ledger@0.105.9
  - @voyant-travel/catalog@0.135.1
  - @voyant-travel/commerce@0.19.1
  - @voyant-travel/operations@0.5.3

## 0.5.5

### Patch Changes

- Updated dependencies [7c5ee80]
  - @voyant-travel/hono@0.117.0
  - @voyant-travel/commerce@0.19.0
  - @voyant-travel/action-ledger@0.105.8
  - @voyant-travel/catalog@0.135.0
  - @voyant-travel/operations@0.5.2

## 0.5.4

### Patch Changes

- 12a1eb2: Expose client-safe subpaths for validation schemas, linkable metadata, template authoring metadata, finance payment-policy primitives, and Hono reporter utilities. Move browser-facing React/operator imports off mixed runtime barrels so client bundles do not pull Hono request context or other server-only runtime code.
- Updated dependencies [12a1eb2]
  - @voyant-travel/commerce@0.18.1
  - @voyant-travel/hono@0.116.2
  - @voyant-travel/operations@0.5.1

## 0.5.3

### Patch Changes

- Updated dependencies [787c852]
- Updated dependencies [293e5e4]
  - @voyant-travel/operations@0.5.0
  - @voyant-travel/hono@0.116.1
  - @voyant-travel/db@0.109.2
  - @voyant-travel/products-contracts@0.105.12
  - @voyant-travel/catalog@0.134.0
  - @voyant-travel/commerce@0.18.0

## 0.5.2

### Patch Changes

- Updated dependencies [924d201]
- Updated dependencies [f311826]
  - @voyant-travel/operations@0.4.0
  - @voyant-travel/db@0.109.1
  - @voyant-travel/products-contracts@0.105.11
  - @voyant-travel/catalog@0.133.0
  - @voyant-travel/commerce@0.17.0

## 0.5.1

### Patch Changes

- Updated dependencies [684b321]
- Updated dependencies [2542715]
  - @voyant-travel/hono@0.116.0
  - @voyant-travel/action-ledger@0.105.7
  - @voyant-travel/catalog@0.132.1
  - @voyant-travel/commerce@0.16.1
  - @voyant-travel/operations@0.3.1

## 0.5.0

### Minor Changes

- 51f7dea: Share one list-response contract instead of per-module copies (voyant#2109).

  `@voyant-travel/types` now owns the canonical offset-paginated list envelope: the `ListResponse<T>` type + `listResponse(data, { total, limit, offset })` builder, plus the zod `paginationSchema` (coerced `limit` 1–200 default 50, `offset` ≥0 default 0) and the `listResponseSchema(item)` factory. Both server services and `*-react` clients import from this single source.

  Server side: every module's local `paginate()` / inline `{ data, total, limit, offset }` construction now routes through the shared `listResponse` builder, and the count read is standardized on `count` internally — fixing the drift where finance, notifications and the legal contracts/policies services read `countResult[0]?.total` while every other module read `countResult[0]?.count` (their `count(*)` selects were aliased `total`; they are now aliased `count`). The returned shape is byte-for-byte identical.

  Client side: the ~23 copied `paginatedEnvelope` zod schemas across the `*-react` packages are replaced by re-exporting the shared `listResponseSchema` factory under the same `paginatedEnvelope` name, so consumers are unchanged.

  Input alignment: `finance-contracts` and `legal-contracts` pagination `limit` caps were raised from `.max(100)` to `.max(200)` to match the framework-wide max.

  Additive and non-breaking.

### Patch Changes

- Updated dependencies [04b257c]
- Updated dependencies [78c15fa]
- Updated dependencies [51f7dea]
  - @voyant-travel/hono@0.115.0
  - @voyant-travel/types@0.106.0
  - @voyant-travel/commerce@0.16.0
  - @voyant-travel/operations@0.3.0
  - @voyant-travel/action-ledger@0.105.6
  - @voyant-travel/catalog@0.132.0
  - @voyant-travel/utils@0.105.4

## 0.4.7

### Patch Changes

- Updated dependencies [4abf9a2]
  - @voyant-travel/hono@0.114.0
  - @voyant-travel/db@0.109.0
  - @voyant-travel/utils@0.105.3
  - @voyant-travel/action-ledger@0.105.5
  - @voyant-travel/catalog@0.131.0
  - @voyant-travel/commerce@0.15.0
  - @voyant-travel/operations@0.2.8
  - @voyant-travel/products-contracts@0.105.10

## 0.4.6

### Patch Changes

- Updated dependencies [6a0edd2]
  - @voyant-travel/catalog@0.130.0
  - @voyant-travel/products-contracts@0.105.9
  - @voyant-travel/commerce@0.14.0
  - @voyant-travel/operations@0.2.7

## 0.4.5

### Patch Changes

- Updated dependencies [021ec00]
  - @voyant-travel/hono@0.113.0
  - @voyant-travel/core@0.111.0
  - @voyant-travel/action-ledger@0.105.4
  - @voyant-travel/catalog@0.129.1
  - @voyant-travel/commerce@0.13.1
  - @voyant-travel/operations@0.2.6
  - @voyant-travel/db@0.108.5

## 0.4.4

### Patch Changes

- fcd2e0b: Add itinerary and day-service translation authoring surfaces, and localize owned itinerary content projection for translated days and service labels.
- Updated dependencies [fcd2e0b]
  - @voyant-travel/products-contracts@0.105.8

## 0.4.3

### Patch Changes

- @voyant-travel/catalog@0.129.0
- @voyant-travel/commerce@0.13.0
- @voyant-travel/operations@0.2.4

## 0.4.2

### Patch Changes

- @voyant-travel/catalog@0.128.0
- @voyant-travel/commerce@0.12.0
- @voyant-travel/operations@0.2.3

## 0.4.1

### Patch Changes

- Updated dependencies [7779772]
  - @voyant-travel/catalog@0.127.0
  - @voyant-travel/commerce@0.11.0
  - @voyant-travel/operations@0.2.2

## 0.4.0

### Minor Changes

- 9c47b00: Add a themed product brochure HTML renderer and printer decorator. Brochure
  template context now includes product media and pax pricing tiers so custom
  brochure layouts can render covers, galleries, and pricing tables without
  extra app-local queries, while still replacing the section set for fully custom
  brochure designs. The themed printer requires an HTML-capable browser printer
  and guards against accidental composition with the built-in basic PDF printer.

### Patch Changes

- @voyant-travel/catalog@0.126.0
- @voyant-travel/commerce@0.10.0
- @voyant-travel/operations@0.2.1

## 0.3.9

### Patch Changes

- Updated dependencies [435a5d1]
  - @voyant-travel/operations@0.2.0
  - @voyant-travel/commerce@0.9.0
  - @voyant-travel/catalog@0.125.0

## 0.3.8

### Patch Changes

- fc678e9: Align public product slug lookups with catalog search locale fallback so exact fallback slugs resolve product details.

## 0.3.7

### Patch Changes

- 1841ce2: D.2 slice 1 (batch 2) — 14 more packages own + ship their migration history (db, relationships, quotes, identity, distribution, inventory, commerce, catalog, finance, notifications, legal, storefront, charters, cruises). Each baseline reproduces the framework bundle's tables column-for-column, and all package sources now apply together (fresh-D.2 union) without collision.

  Shared enums: the codebase inlines copies of some enums to avoid cross-package schema imports (e.g. `service_type` in distribution + inventory, `entity_type` in relationships + quotes). Per-package generation would emit duplicate `CREATE TYPE`, colliding on a fresh D.2 database. All package migrations now wrap `CREATE TYPE … AS ENUM(…)` in an idempotent `DO`-block guard (subset-safe; whichever source applies first creates the type, the rest no-op). The db package additionally owns the shared Postgres extensions (pg_trgm / unaccent) that downstream trigram indexes need on a fresh D.2 database (the retired bundle injected them; per-package sources did not). The batch-1 packages (operator-settings, action-ledger, workflow-runs, trips) get the same guard for uniformity. No runtime change. See `docs/architecture/migration-collector-d2.md`.

- Updated dependencies [1841ce2]
- Updated dependencies [4893352]
  - @voyant-travel/db@0.108.4
  - @voyant-travel/commerce@0.8.1
  - @voyant-travel/catalog@0.124.1
  - @voyant-travel/action-ledger@0.105.3
  - @voyant-travel/operations@0.1.7

## 0.3.6

### Patch Changes

- @voyant-travel/commerce@0.8.0
- @voyant-travel/catalog@0.124.0
- @voyant-travel/operations@0.1.6

## 0.3.5

### Patch Changes

- @voyant-travel/db@0.108.3
- @voyant-travel/products-contracts@0.105.6
- @voyant-travel/commerce@0.7.0
- @voyant-travel/catalog@0.123.0
- @voyant-travel/operations@0.1.5
- @voyant-travel/hono@0.112.2

## 0.3.4

### Patch Changes

- @voyant-travel/hono@0.112.1
- @voyant-travel/catalog@0.122.0
- @voyant-travel/commerce@0.6.0
- @voyant-travel/operations@0.1.4

## 0.3.3

### Patch Changes

- Updated dependencies [98f4a40]
- Updated dependencies [a3bd51c]
- Updated dependencies [3b27dcc]
- Updated dependencies [39d48fe]
- Updated dependencies [d222e9f]
  - @voyant-travel/core@0.110.0
  - @voyant-travel/hono@0.112.0
  - @voyant-travel/commerce@0.5.0
  - @voyant-travel/action-ledger@0.105.1
  - @voyant-travel/catalog@0.121.0
  - @voyant-travel/db@0.108.2
  - @voyant-travel/operations@0.1.3

## 0.3.2

### Patch Changes

- a9dcf89: Fix catalog browse defaults so product projections expose supply models for scheduled/dynamic locks and embedded catalog admins resolve locale from the loaded operator market.
  - @voyant-travel/catalog@0.120.1

## 0.3.1

### Patch Changes

- @voyant-travel/commerce@0.4.0
- @voyant-travel/catalog@0.120.0
- @voyant-travel/operations@0.1.2

## 0.3.0

### Minor Changes

- 13fe70b: The inventory module now owns the product brochure route: new `@voyant-travel/inventory/routes-brochure` export (`createProductBrochureRoutes(options)`) with the object storage provider injected as an option.

### Patch Changes

- Updated dependencies [13fe70b]
- Updated dependencies [11095db]
- Updated dependencies [13fe70b]
- Updated dependencies [13fe70b]
- Updated dependencies [9ea7220]
- Updated dependencies [13fe70b]
  - @voyant-travel/action-ledger@0.105.0
  - @voyant-travel/catalog@0.119.0
  - @voyant-travel/commerce@0.3.0
  - @voyant-travel/hono@0.111.0
  - @voyant-travel/storage@0.105.0
  - @voyant-travel/operations@0.1.1

## 0.2.0

### Minor Changes

- 3cc83b6: Move extras runtime and React source behind Inventory and Bookings owner
  subpaths. The old runtime and React extras package names are removed from v1;
  first-party imports use the Inventory and Bookings owner paths.
- 7ea516a: Move product graph compose/duplicate authoring behind
  `@voyant-travel/inventory/authoring`. `@voyant-travel/catalog-authoring` now delegates to
  the Inventory owner path during the v1 restructure.
- 65b3782: Add optional Inventory package entrypoints for operated product authoring and
  Inventory React authoring UI surfaces.
- a101971: Move the main operated Product route/service/schema/runtime and React
  authoring source under Inventory owner paths. The old Products runtime package
  names are removed from the v1 workspace surface, while the operator keeps
  stable `/products` API URLs backed by Inventory.

### Patch Changes

- 3408b2a: Move availability, allocation UI, resources, ground logistics, and places source
  under Operations owner paths. The old operated-execution package names are
  removed from the v1 workspace surface while first-party runtime, React, and
  operator imports use `@voyant-travel/operations` and `@voyant-travel/operations-react`
  surfaces.
- 47fef18: Retarget first-party imports from the removed beta package names to their owner
  packages. Operated product UI now imports Inventory React, commercial UI imports
  Commerce React, supplier UI imports Distribution React, checkout UI imports
  Finance React, and operated place/availability schema references import
  Operations owner paths.
- Updated dependencies [c9ec9f8]
- Updated dependencies [e388bc9]
- Updated dependencies [6bff46f]
- Updated dependencies [a4e0909]
- Updated dependencies [eb17d3d]
- Updated dependencies [3cc83b6]
- Updated dependencies [3408b2a]
- Updated dependencies [47fef18]
- Updated dependencies [063f2b5]
  - @voyant-travel/catalog@0.118.0
  - @voyant-travel/commerce@0.2.0
  - @voyant-travel/hono@0.110.0
  - @voyant-travel/operations@0.1.0
  - @voyant-travel/extras-contracts@0.104.2
  - @voyant-travel/action-ledger@0.104.11

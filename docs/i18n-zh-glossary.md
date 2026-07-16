# 中文 UI 术语对照表(zh-CN UI Glossary)

状态:v1 定稿(2026-07)。本表是 zh-CN 本地化中所有 UI 显示文案的**唯一术语依据**,
基于 [`UBIQUITOUS_LANGUAGE.md`](../UBIQUITOUS_LANGUAGE.md) 起草。

**边界(铁律)**:本表只约束面向用户的界面文案译法。所有代码标识符、API 路由路径、
JSON 字段名、数据库表名/列名、TypeScript 类型名、事件名,以及 OCTO 等英文行业标准
接口词,一律保持英文原样,不受本表影响。

## 全局约定

| 约定 | 决定 | 理由 |
| --- | --- | --- |
| 语体 | 简体中文;界面用语不用"你/您"直呼,能省则省;必须出现时用"您" | B2B 内部后台惯例,减少人称噪音 |
| 标点 | 中文文案用全角标点 | 中文排版规范 |
| 英文保留 | OCTO、RFP、PII、MICE、FIT、APA、API 等行业/技术缩写保留英文,首次出现可加中文注 | 行业标准词,强译妨碍沟通 |
| 日期/货币 | 不在文案中硬编码格式,交给 `Intl`(zh-CN 自动输出"2026年7月16日"、"¥1,234.00") | 项目 i18n 机制原生支持 |

## 参与角色(Actors & people)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Person | 联系人 | CRM 主档记录;避开"客户"——原文明确把 customer/client 列为坏味道,中文同理留给口语 |
| Organization | 组织 | 覆盖买方、供应商、代理社等各种法人对手方,"公司/企业"会窄化 |
| Traveler | 出行人 | 国内 OTA 通用词;区别于"旅客"(泛称)和"乘客"(交通场景) |
| Participant | 参与人 | 订单/报价上的角色承担者(预订人、决策人、财务),比"联系人"宽 |
| User | 用户 | 登录身份,与联系人正交 |
| Supplier | 供应商 | 行业通用,无歧义 |
| Channel | 渠道 | 分销侧对手方,同业通用词 |
| Actor type | 操作者类型 | staff/customer/partner/supplier 的鉴权角色,避免与"用户角色"混淆 |

## 商业网络与采购(Commercial network & sourcing)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Operator | 运营方 | 承担商业控制/履行责任的主体;不译"旅行社"以免与代理社混淆 |
| Reseller | 转售方 | 卖别人履行的库存这一"角色";与"渠道"(实体)区分开 |
| Operating party | 实际运营方 | 强调"实际执行履行的一方",与运营方呼应 |
| Inventory Source | 库存源 | 技术性上游数据/预订通道 |
| Operator Link | 运营方连接 | 承载目录/可售/预订能力的合作关系,"链接"太网页化 |
| Distribution | 分销 | 子域名称,行业通用 |
| Catalog Item | 目录条目 | 归一化的可售发现记录,刻意不译"产品"以维持与 Product 的边界 |
| Operated Inventory | 自营库存 | 行业通用"自营",对应 owned/managed |
| Sourced Inventory | 外采库存 | 行业通用"外采",对应"卖但不运营" |
| Catalog Projection | 目录投影 | 派生只读模型,技术词直译(极少出现在一线 UI) |

## 销售管道(Sales pipeline)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Quote | 报价 | 销售追踪主体,国内销售口语一致 |
| Quote Version | 报价版本 | 不可变的方案修订,"版本"准确表达可多版并存 |
| Pipeline | 销售管道 | 国内 CRM 通用译法(阶段的有序集合) |
| Stage | 阶段 | 直译无歧义 |
| Activity | 跟进记录 | 译"活动"会与会奖议程冲突;CRM 语境"跟进"最贴切 |
| Segment | 客群 | 按条件分组的名单,营销通用词 |

## 会奖团组(Group travel & MICE)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| MICE | 会奖(MICE) | 行业固定缩写保留,中文加"会奖"注 |
| Program | 会奖项目 | 团组总括记录;单独译"项目"太泛,加"会奖"限定 |
| Program Requirement | 项目需求 | 房、场地、餐饮等需求行 |
| Program Session | 议程项 | 有时间的日程条目;避开"活动" |
| Delegate | 与会人 | 会议行业通用;区别于出行人(未必成行) |
| Program Room Block | 房量预留 | 酒店行业 room block 的通行说法 |
| Program Space Block | 场地预留 | 与房量预留对仗 |
| RFP | 招标(RFP) | 与投标/授标构成招投标体系:招标(RFP)→ 投标(Bid)→ 评标 → 授标(Award);会奖团队后续可复核 |
| Bid | 投标 | 供应商对招标的响应;对 Bid 的评估环节 UI 用"评标" |
| Award | 授标 | 评标后选定中标方的动作/状态,补全招投标闭环 |

## 产品目录(Catalog)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Product | 产品 | 行业通用 |
| Product Option | 产品选项 | OCTO 的 option 概念,"规格"电商味太重 |
| Option Unit | 计价单元 | 成人/儿童等价格维度,"票种"会窄化到门票 |
| Product Day | 行程日 | 多日产品的一天 |
| Product Day Service | 行程日服务 | 当日的接送/用餐/导览等服务项 |
| Accommodation Component | 住宿组件 | 产品/行程内的住宿构件,保持"组件"体系 |
| Room Option | 房型选项 | 酒店行业"房型"+ 体系词"选项" |
| Rate Plan | 价格计划 | 酒店分销标准译法 |
| Board Basis | 餐食标准 | 含餐等级(早餐/半膳/全膳/全包),行业通用 |
| Stay Component | 住宿段 | 日期区间的住宿行,"段"表达区间感 |
| Product Version | 产品版本 | 不可变快照 |
| Product Media | 产品素材 | 图片/视频/文档,运营口语"素材" |
| Operated Group Departure | 自营团期 | 固定班期+名额的团,"团期"是组团社核心行话;**"团期"专属本词,勿与"班期"混用** |
| Trip Envelope | 行程包 | 聚合多个组件订单的客户侧总行程;"包"表达聚合,避免与"订单"混 |
| Composed FIT Trip | 定制散客行程(FIT) | FIT=散客是行业固定用法,保留缩写 |
| Component Booking | 组件订单 | 行程包内可独立取消/确认的一段承诺,与 Booking=订单 呼应 |
| Trip Requirement | 行程需求 | 未解决的客户需求占位("开罗三晚") |
| Trip Candidate | 候选方案 | 需求下排序、限时的可选结果 |
| Extra | 附加项 | 依附主组件生命周期的加购,"加购"电商味重 |
| Cruise Extension | 邮轮延展 | 船前/船后酒店或陆地行程,行业称"前后延展" |
| Itinerary(泛指) | 行程 | 泛指行程安排时使用 |

## 库存与可售(Inventory & availability)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Availability Rule | 排期规则 | 生成班期的循环规则,"排期"表达生成语义 |
| Slot | 班期 | 具体日期+余位的库存单元;活动场景可显示"场次";**"团期"保留给自营团期,二者不同词** |
| Closeout | 停售日 | 显式关闭某天/区间,行业口语"关房/停售",取通用者 |
| Allotment | 切位 | 为渠道预留库存的精确行话(备选"配额"更书面,定稿取"切位");与占位/预留的区别见下方注释 |
| Capacity | 容量 | 永远是数值上限;"名额"在车辆场景不适用 |
| Pickup Point | 接驳点 | kind 含接/送/集合三类,"接驳"最全;上下文明确时可显示"上车点" |
| Pickup Group | 接驳点分组 | 直译 |
| Room Resource Hold | 房量占用 | 运营执行侧的占用,与"预留"(需求侧)区分 |
| Space Resource Hold | 场地占用 | 同上对仗 |
| AvailabilityCandidate | 可售候选 | 实时查询归一化结果 |
| Sellability | 可售性 | "现在这个日期/人数/市场能不能卖"的综合判定 |

> **切位 / 占位 / 预留 三词区分(必读)**
>
> - **切位(Allotment)**:面向**渠道**的库存预留块——"这 20 个位子切给某渠道去卖"。
>   属分销配置,先于任何订单存在。
> - **占位(Allocation)**:**订单行**对班期/接驳/资源的容量占用实体,随订单生命周期
>   流转(`held → confirmed → fulfilled`)。一个占位只属于一个订单项。
> - **预留(Hold)**:订单**确认前**的限时库存声明,会过期(`hold_expires_at`);
>   到期未确认自动释放。是时间状态,不是库存行实体。
>
> 界面 tooltip 落地安排在阶段 2;翻译时凡涉及这三词,以本注释为准,不得互换。

## 定价(Pricing)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Market | 市场 | 锚定货币与定价的地理经济区 |
| FX Rate Set | 汇率快照 | 带时间戳的汇率组,"快照"点出不可变 |
| Price Catalog | 价目表 | 版本化主价格清单,财务通用词 |
| Price Schedule | 价格档期 | 季节性生效窗口,旅游业"档期"贴切 |
| Cost | 成本 | 我们付给供应商的钱 |
| Rate | 协议价 | 供应商单位价目(按人/按晚),同业"协议价/结算价",取前者 |
| Price | 售价 | 客户看到的卖价;三者铁律:成本 ≠ 协议价 ≠ 售价 |
| Cancellation Policy | 取消政策 | 行业通用 |

## 承诺链(Commitment chain)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Booking | 订单 | 第一方持久承诺记录;**"预订"只作动词**(去预订) |
| Booking Origin | 订单来源 | 记录订单由报价/行程/外部单号等何处而来 |
| Booking Item | 订单项 | 订单上的行项目 |
| Allocation | 占位 | 见上方三词区分注释 |
| Hold | 预留 | 见上方三词区分注释 |
| Provider Order Ref | 上游订单号 | 外部系统的 order 标识,"上游"点明方向 |
| Legacy Offer | 旧版报价(Legacy) | 兼容期概念,加"旧版"隔离,避免与报价版本混淆 |
| Legacy Order | 旧版交易单(Legacy) | 刻意不用"订单"正名,防止与 Booking 相撞 |

## 履约与运营(Fulfillment & operations)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Fulfillment | 履约 | 签发可交付凭证这件事及其记录 |
| Service Voucher | 服务凭证 | 出行人凭以消费的凭证,不含储值;避开"代金券" |
| Redemption | 核销 | 国内行业对"凭证被消费"的标准词 |
| Dispatch | 派车单 | 地面调度指令(A→B、司机、车辆),行业口语 |
| Vehicle | 车辆 | 直译 |
| Driver | 司机 | 直译 |
| Resource | 资源 | 导游/设备/车辆等可指派资产 |
| Resource Pool | 资源池 | 直译 |
| Place | 地点 | 共享物理位置(集合点/机场/景点/场馆) |
| Rooming List | 分房表 | 组团社标准行话,勿直译"房间清单" |
| Accommodation Location | 住宿地点 | 定位住宿的地点引用,非酒店运营记录 |
| Legacy Facility | 旧版场所(Facility) | 兼容期表名,加"旧版"隔离 |

## 财务(Money)

> 本组译法待凯撒财务侧最终过目;阶段 1 先按下表推进。
> 已记录的替代建议:Invoice 用"收据"(待财务定夺)。

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Invoice | 账单 | 中文"发票"强指税务发票(fapiao),Voyant 的 Invoice 是应收账务单据,译"账单"避免重大误解;备选"收据"待财务确认 |
| Invoice Number Series | 账单号段 | 按主体/年度/类型的取号序列 |
| Credit Note | 贷记单 | 会计标准译法;界面可注"(红冲)"贴近国内口语 |
| Payment | 收款 | 此处特指入账(客户付给我们),译"支付"会方向不明 |
| Supplier Payment | 供应商付款 | 出账方向,与"收款"对仗 |
| Travel Credit | 旅行储值金 | 币种计价的储值,经不可变台账核销;避开"积分/代金券" |
| Promotion Code | 优惠码 | 激活促销、不含余额,电商通用词 |
| Payment Schedule | 付款计划 | 订单上的分期安排(定金/尾款),客户视角 |
| Collection Plan | 收款预览 | "将于何时收到什么"的预览,与付款计划刻意用词区分 |
| Guarantee | 担保 | 押金/预授权/挂账函等,财务通用 |
| Payment Session | 支付会话 | 一次支付尝试的技术会话 |

## 分销(Distribution)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Channel Contract | 渠道合同 | 直译 |
| Commission Rule | 佣金规则 | 直译,行业通用 |
| Settlement | 结算 | 与渠道的应收应付核算 |
| Reconciliation | 对账 | 预期与实际比对,财务通用 |
| Reconciliation Issue | 对账差异 | 比"问题"更财务化 |

## 法务合规(Legal & compliance)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Contract | 合同 | 直译 |
| Contract Template | 合同模板 | 直译 |
| Signature | 签署记录 | 强调是"记录"(签署人/方式/IP/时间) |
| Policy | 政策 | 取消/付款/条款等规则集;"条款"留给 Terms 场景 |
| Policy Version | 政策版本 | 不可变快照 |
| Policy Acceptance | 政策确认 | 客户对具体版本的确认记录 |
| PII | 个人信息(PII) | 缩写保留,合规语境国内叫"个人信息" |

## 身份与外部引用(Identity & external references)

| 英文术语 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Contact Point | 联系方式 | 邮箱/电话/网站 |
| Address | 地址 | 直译 |
| Named Contact | 指定联系人 | 组织内带头衔的对接角色 |
| External Ref | 外部映射 | Voyant 实体 ↔ 三方系统 ID 的映射关系 |

## 生命周期动词(按钮/状态用词,须全局一致)

| 英文动词 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Hold | 预留 | 与名词 Hold 一致 |
| Confirm | 确认 | 直译 |
| Start | 开始 | 订单进入行中 |
| Complete | 完成 | 服务交付完毕 |
| Issue | 签发 | 产出凭证/账单/合同,公文感准确 |
| Fulfill | 履约 | 与名词一致 |
| Deliver | 送达 | 把已签发凭证推送给收件人(邮件/下载/钱包) |
| Accept | 接受 | 客户选定报价版本/接受条款 |
| Redeem | 核销 | 与名词一致 |
| Cancel | 取消 | 业务性撤销(订单/占位);**与"作废"严格区分** |
| Void | 作废 | 财务性冲销(账单/收款);对应原文 Cancel ≠ Void 铁律 |
| Close | 结案 | 报价以赢单/输单收尾;避开"关闭"(太像关窗口) |
| Convert | 转化 | 承诺链上的晋级动作 |
| Reconcile | 对账 | 与名词一致 |
| Settle | 结算 | 与名词一致 |
| Override | 强制变更 | 管理员绕过状态机改状态,必留痕;"覆盖"太软 |

## 应用外壳与垂直模块常用词(补充)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Admin / Workspace | 管理后台 / 工作台 | 国内 SaaS 通用 |
| Storefront | 在线商城 | 面向客户的售卖前台 |
| Dashboard | 概览 | 比"仪表盘"更本土 |
| Cruise | 邮轮 | 直译 |
| Charter | 包船 | 模块含 APA 等游艇术语;APA 保留英文缩写 |
| Flight | 机票 / 航班 | 售卖语境用"机票",航段语境用"航班" |
| Trip | 行程 | 与 Itinerary 共用"行程",UI 上下文足以区分 |
| Notification | 通知 | 直译 |
| Quote(动词 to quote) | 出报价 | 与名词呼应 |

## 裁决记录(备查)

1. **Invoice = 账单**:定稿采用"账单";另有"收据"建议,待凯撒财务同事过目后再定,阶段 1 按"账单"推进。
2. **Allotment = 切位**:确认;与占位(Allocation)、预留(Hold)的区分见库存章节注释。
3. **Booking = 订单** 连带体系确认:Booking Item=订单项、Component Booking=组件订单,"预订"仅作动词。
4. **Slot = 班期**:确认;"团期"专属 Operated Group Departure(自营团期),两词严禁混用。
5. **招投标体系**:招标(RFP)→ 投标(Bid)→ 评标 → 授标(Award);会奖团队后续可复核,阶段 1 按此执行。

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

## 阶段 2 新增词条(翻译过程中自拟,待人工复核)

以下词条为全量翻译时遇到、原表未覆盖的术语,按本表风格自拟;复核后可上移至正式分组。

### 操作台账与技术词(action ledger / 平台)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Action Ledger | 操作台账 | 操作审计日志;"台账"与财务"账单"区分 |
| Reversal / Reversed | 冲正 | 台账/财务冲销语境标准词;区别于取消(Cancel)与作废(Void) |
| Compensated | 已补偿 | saga 补偿事务通行译法 |
| Superseded | 已被取代 | 记录被新记录替代 |
| Relay Outbox | 中继发件箱 | outbox 模式直译 |
| Principal | 主体 | 鉴权语境标准译法,与操作者(Actor)区分 |
| Agent(principal 类型) | 智能体 | AI 执行主体,区别于员工用户/系统 |
| Payload / Redaction / Retention / Idempotency / Fingerprint | 载荷 / 脱敏 / 保留期 / 幂等性 / 指纹 | 技术通行译法 |

### 销售与目录(CRM / products / trips)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Deal | 商机 | 国内 CRM 通用词;与报价(Quote)明确区分 |
| Pipeline value | 销售管道金额 | 统计卡片语境取"金额" |
| Order(垂直/上游交易) | 交易单 | Booking=订单 已占用;类推"旧版交易单"先例 |
| Itinerary(产品的多方案变体) | 行程方案 | 表达可切换的多套方案;泛指仍用"行程" |
| Compose trip | 编排行程 | 组装行程包的动作 |
| Not committed | 未成单 | 组件尚无已承诺订单 |
| Packages(机+酒) | 度假打包 | 与 Product=产品、Trip Envelope=行程包区分 |
| Excursions / Tours | 一日游 / 多日游 | 行业口径 |
| Departure(产品的固定日期班次) | 班期 | 机械对应排期规则→班期;"团期"专属自营团期 |
| Cutoff | 截售(语境亦作"截止") | 提前 N 分钟停止售卖 |
| Override pricing(按班期覆盖价格) | 覆盖定价 / 覆盖价 | 区别于状态机的强制变更(Override) |
| Brochure | 宣传册 | 直译 |
| Lead(traveler) | 主出行人 | 与出行人体系一致 |
| Pricing Category | 计价类别 | 与计价单元(Option Unit)同族 |
| Master / Dependent category | 主类别 / 从属类别 | 类别依赖关系 |
| Requires / Excludes / Limits per master / Limits sum | 必须搭配 / 互斥 / 按主类别限量 / 限制总量 | 类别依赖规则 |
| Seat occupancy | 占座 | 车位/座位占用 |
| Listing(政策层级) | 上架条目 | 订单与类别之间的政策层级 |

### 排期与运营(availability / resources)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Availability(模块名) | 排期与库存 | 页面管理规则/班期/停售/接驳容量;"可售性"专属 Sellability 判定 |
| Start Time | 出发时间 | 产品可订出发时刻 |
| Sharing group | 同住组 | 分房共享分组 |
| Activity(事件流) | 动态 | "跟进记录"专属 CRM Activity;此处为审计动态流 |
| In Progress(订单状态) | 行中 | 沿用词表 Start=开始(进入行中) |
| Resource Closeout | 停用时段 | 资源维护/黑窗;"停售日"专属销售库存 |
| Resource Allocation(资源池→产品配置) | 资源分配 | 保护切位/占位/预留三词;此处非订单占位 |
| Assignment | 指派 | 与 Resource=可指派资产呼应 |
| Transfer(服务类型) | 接送 | "接驳"专属 Pickup Point 体系 |
| Pax | 人数 | 界面标签译出更易读 |
| On file(证件状态) | 已存档 | 直译 |

### 财务与结算(finance / settings)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Proforma | 形式账单 | 沿用 Invoice=账单 体系,避开"形式发票"的税票联想 |
| Payments(收支混合页) | 收付款 | 页面同含收款与供应商付款 |
| Party | 往来方 | 财务对手方,覆盖客户与供应商 |
| Balance Due | 未结余额 | 方向中性的应收余额 |
| Direct Bill | 挂账 | 行业标准;与担保词条的挂账函呼应 |
| Applied(贷记单状态) | 已抵扣 | 贷记单冲抵账单 |
| pending_external_allocation | 待分配 | 收款分配语义,刻意避开"占位" |
| Payment link | 收款链接 | 运营侧入账方向 |
| Number Series(泛化) | 号段 | 类推账单号段 |
| Pad Length / Reset Strategy | 补零位数 / 重置策略 | 取号配置 |
| Tax Regime / Tax Class | 税制 / 税类 | 标准财税词对 |
| Tax Policy Profile | 税务政策档案 | 直译 |
| Fact(规则条件输入) | 判断项 | 规则引擎语境 |
| Operator(比较运算) | 运算符 | 刻意区别于运营方 |
| Marketplace / Affiliate(渠道类型) | 平台市场 / 联盟 | 分销行业口径 |
| Trading name / pricing posture / rate card | 经营名称 / 定价口径 / 价格卡 | 商务条款用词 |
| Policy Assignment | 政策分配 | 政策与范围的绑定 |
| Scope | 适用范围 | 合同/模板/号段/政策统一用词 |
| Outstanding / Active Bookings | 未结 / 活跃订单 | 统计卡片用词 |

### 销售链路补充(quotes / relationships / bookings)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Client(关系类型标签) | 客户 | 本表仅禁止用"客户"译 Person 实体;作为对手方关系标签是自然用词 |
| Proposal(分享给客户的展示) | 方案 | 与报价版本(Quote Version)同页并存,需区分 |
| Open / Reopen(报价状态) | 进行中 / 重新开启 | 与结案(Close)配对;"打开"有窗口歧义 |
| Owner | 负责人 | CRM 通行;"拥有者"生硬 |
| Active / Inactive(记录开关) | 启用 / 停用 | "活跃"保留给活跃订单等统计语境 |
| Relationships(人与人) | 人际关系 | 与关系类型(关系)区分 |
| Document(护照/证件) | 证件 | "文档/文件"会误读为附件 |
| Travel profile / Travel companion | 出行档案 / 同行人 | 与出行人体系一致 |
| Payment Method(客户支付工具) | 支付方式 | 方向中性,避开收款(入账)语义 |
| Communication | 沟通记录 | 与联系方式、跟进记录三分 |
| Channel(沟通渠道字段) | 方式 | "渠道"专属分销对手方 |
| Line item | 行项目 | 通用商务词;"订单项"专属 Booking Item |
| Discard | 放弃更改 | 未保存变更的标准动词 |
| Booker | 预订人 | "预订仅作动词"的派生名词,指下单角色 |
| Party size | 出行人数 | 出行人体系 |
| Senior(出行人类别) | 长者 | 类别体系:成人/儿童/婴儿/长者 |
| Occupant | 入住人 | 分房语境 |
| Card on file / Agency letter / Deposit(担保类型) | 留存卡 / 挂账函 / 押金 | 押金区别于付款计划中的定金 |
| Reconciled / Drift / Needs review | 已对平 / 差异 / 需复核 | 财务对账口语 |
| Unit sell / Unit cost | 售价单价 / 成本单价 | 遵守成本≠售价铁律 |
| Payment intent | 付款意向 | 支付编排语境 |
| Ticket on credit | 挂账出票 | 沿用 Direct Bill=挂账 |
| Extras manifest | 附加项清单 | 运营清单 |
| Room sharing / Shared room | 同住拼房 / 同住房间 | 扩展同住组词族 |

### 目录与库存补充(catalog / inventory)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Availability(余位列) | 余位 | "可售性"专属 Sellability 判定;剩余名额列自然读作余位 |
| Offer(日历上的可售计数) | 可售项 | 与可售候选同族;"报价"专属 Quote |
| from(价格前缀)/ From(列头) | 低至 / 起价 | 中文无法用"…起"后缀直译 |
| At sea | 海上巡航 | 邮轮行业标准 |
| Room only / B&B | 不含餐 / 含早餐 | 补全餐食标准系列 |
| Property | 物业 | 酒店行业住宿物业 |
| Product Category / Parent category | 产品类目 / 上级类目 | 电商后台通用;避开"类别"家族占用 |
| What's included / not included | 费用包含 / 费用不含 | 旅游行业标准栏目 |
| Margin | 毛利(库存)/ 利润率(财务分析) | 语境分工 |
| Reservation Timeout | 预留超时 | 沿用 Hold=预留 |
| Overview(区块标题) | 概况 | "概览"专属 Dashboard |
| Version snapshot | 版本快照 | 快照体系 |
| Free sale | 自由销售 | 容量模式 |
| City Break / Circuit | 城市短途 / 环线游 | 产品类型行业口径 |
| Waive / Waived | 免收 / 已免收 | 费用处理 |
| Manual(来源) | 手动录入 | 数据来源徽标 |
| stale | 已过时 | 数据新鲜度徽标 |

### 财务补充(finance-react)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Record(动词,登记款项/账单) | 登记 | 财务录入既有事实,区别于"创建" |
| Profitability | 盈利分析 | 页面为分析视图 |
| Variance / Unattributed cost | 偏差 / 未归属成本 | 利润词族 |
| Cost allocation | 成本分摊 | 避开受保护的占位/切位/资源分配 |
| Payment(方向混合记录) | 款项 | 单方向词会误导 |
| Payment link(客户侧) | 支付链接 | 运营侧仍用收款链接;视角分工 |
| Travel agent(客户文案) | 旅行顾问 | 面向客户口吻 |
| Bank reference | 汇款附言 | 银行转账通行说法 |
| Sell/Buy side(税务) | 销项 / 进项 | 国内财税标准词对 |
| Deposit window / Grace floor | 定金窗口 / 宽限下限 | 字段直译对仗 |
| Charge(收款项目选择) | 收款项目 | 定金/尾款/全款选择项 |
| Installment | 分期 | 通用 |
| Disputed / Received / Approved | 有争议 / 已接收 / 已审批 | 供应商账单状态 |

### 法务补充(legal-react)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Executed(合同状态) | 已生效 | "已履行"会误指服务履约 |
| Retire / Retired(政策版本) | 下线 / 已下线 | 避开"停用"(记录开关) |
| Partner(合同范围) | 合作伙伴 | 通用商务词,区别于供应商/渠道 |
| Record Signature | 登记签署记录 | 人工录入签署事实 |
| Manual(签署方式) | 手工 | 与电子签署对仗 |
| Window / Date Range(规则类型) | 时间窗口 / 日期区间 | 取消规则时段类型 |
| Refund Percent(基点) | 退款比例(基点) | 财务直译,10000=100% |
| Checksum / Storage Reference | 校验和 / 存储引用 | 技术通行译法 |

### 分销与运营补充(distribution / operations)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Booking Link | 订单链接 | 与外部渠道订单的同步关联;"映射"留给产品映射/外部映射词系 |
| Product Mapping | 产品映射 | 与外部映射同族 |
| Delivery(渠道推送) | 投递 | "送达"专属凭证生命周期动词;Push=推送 |
| Connector | 连接器 | 技术通行译法 |
| Throttled / Rate-limited | 已限流 / 被限流 | 技术通行译法 |
| Payment Owner / Cancellation Owner | 收款方 / 取消责任方 | 合同条款归属;Split=分账 |
| Expire(批量动作) | 设为到期 | 与状态"已到期"呼应 |
| Availability(供应商日历/同步流) | 可用情况 / 可售数据 | "可售性"专属 Sellability |
| Contract active / pending | 生效中 / 待生效 | 与 Executed=已生效 词族一致 |
| Flat / Per person/group/night/vehicle | 固定价 / 按人/按团/按晚/按车 | 价率单位 |
| Assignment Gaps / Ownership Gaps | 指派缺口 / 归属缺口 | 概览指标卡 |
| Released / Release | 释放时间 / 释放 | 占用释放 |
| Provisioned | 已配置 | 资源容量芯片 |
| Unallocated(travelers) | 未占位 | 占位词族的否定态 |

### 机票与包船补充(flights / charters)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Offer(航班搜索结果) | 航班方案 | "报价"专属 Quote;方案词族(候选方案/方案) |
| Passenger | 乘客 | 本表将"乘客"划归交通场景,机票正是该场景;出行人保留给 Traveler |
| Validating carrier | 出票航司 | 航空分销标准词 |
| Billing / Billed to | 账单信息 / 账单抬头 | 账单词族;"抬头"为国内标准 |
| Codeshare / Interline | 代码共享 / 联运 | 民航标准 |
| Layover / Nonstop | 中转(停留)/ 直飞 | 民航标准 |
| Exit row / Bulkhead / Extra legroom | 安全出口排 / 隔板座 / 加宽腿部空间 | 客舱标准 |
| Special assistance / Priority boarding / Lounge access | 特殊协助 / 优先登机 / 贵宾休息室 | 航空服务标准 |
| Charterer | 承租方 | MYBA 包船合同标准;避开"客户" |
| Charter fee | 包船费 | 由包船直推 |
| Whole-yacht | 整船 | 游艇行业标准 |
| Suite(游艇) | 套房 | 舱房留给邮轮 cabins |
| Owners / Penthouse / Signature(套房级) | 船东套房 / 顶层套房 / 尊享 | 行业/品牌层级惯例 |
| All-in | 一价全含 | 旅游零售标准 |
| Price on request | 价格另询 | 与需询位同族 |
| Top-up required | 需补款 | APA 追缴 |
| Embarkation | 登船 | 直译 |

### 身份补充(identity)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Identity(页面题) | 身份信息 | 沿用 settings zh 先例 |
| Entity | 实体 | 选择器跨联系人/组织/供应商,无领域词可覆盖 |
| Value(联系方式内容) | 内容 | "值"过于程序员化 |
| Emergency / General(指定联系人角色) | 紧急联络 / 常规 | 名录角色标准说法 |
| Social(联系方式类型) | 社交账号 | 存储的是账号句柄 |
| legal 分工 | 法定(地址标签)/ 法务(部门角色) | 语境分工 |

### 通知与工作流补充(notifications / workflows)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Channel(通知的邮件/短信) | 发送方式 | "渠道"专属分销;沿用"沟通渠道=方式"先例并消歧 |
| Provider(发送服务商) | 服务商 | "上游"专属订单来源 |
| Quiet hours | 免打扰时段 | 移动端通行 |
| Blackout dates | 停发日期 | "停售日"专属销售库存 |
| Escalation bucket / Cadence | 递进档位 / 频次 | 提醒节奏语义 |
| Suppression window / Rate limit | 抑制窗口 / 频率限制 | 技术通行译法 |
| primary/cc/bcc | 主送 / 抄送 / 密送 | 邮件标准 |
| Rerun / Resume | 重新运行 / 恢复运行 | "重试"专属步骤级 Retry |
| Workflow schedule | 计划任务 | "排期"专属库存域;cron 任务标准词 |
| Correlation ID | 关联标识 | 技术通行译法 |

### 商务定价补充(commerce)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Net / Gross(目录类型) | 净价 / 含佣价 | 旅游同业标准词对 |
| Reporting currency | 报表货币 | 与结算货币对仗 |
| Tax context | 税务上下文 | 技术字段直译 |
| Unit tier | 单元阶梯 | 阶梯价行业标准 |
| Dropoff | 下车点 | 与"上车点"(接驳点显示形)配对 |
| Pricing mode | 计价方式 | 计价词族 |
| Auto-applied / Code-redeemed | 自动生效 / 凭码激活 | 优惠码为"激活促销",避开核销(凭证专属) |
| Activate(促销) | 激活 | 区别于启用/停用记录开关 |
| Scheduled(促销状态) | 待生效 | 沿用生效中/待生效词族 |
| Audience | 受众 | 营销标准 |
| Fare code / Cabin grade | 票价代码 / 舱房等级 | 机票/邮轮词族 |
| Availability window(政策类型) | 可售窗口 | 可售词族+窗口先例 |
| Capability(OCTO) | 能力 | 直译 |

### 初始化与令牌补充(setup / auth)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Setup(首跑流程) | 初始设置 | 区别于 Settings=设置 |
| Navigation preferences | 导航偏好 | 偏好词族 |
| Invitation/Verification token | 邀请令牌 / 验证令牌 | 类推重置令牌 |
| Token secret / Rotate | 令牌密钥 / 轮换 | 技术通行译法 |
| Roster | 成员名单 | 团队名录语境 |
| Last activity | 最近动态 | 沿用 Activity(事件流)=动态 |
| Enabled/Disabled(令牌) | 已启用 / 已禁用 | 与成员启用/停用刻意分开 |
| Host app / Locale(字段) | 宿主应用 / 语言区域 | 技术通行译法 |
| Complete your profile | 完善个人资料 | 国内 SaaS 惯用 |

### 抽取批次补充(storefront / admin 壳 / mice)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| off(折扣徽标) | 立减 | 电商通行 |
| Aboard | 所属邮轮 | 邮轮上下文 |
| Travel specialist | 旅行顾问(客户侧沿用)/ 旅行专员(账户页) | 视角分工 |
| Upcoming(账户统计) | 即将出行 | 出行词族 |
| Favicon / Brand mark | 网站图标 / 品牌标识 | 建站通行 |
| Toggle sidebar | 切换侧边栏 | 直译 |
| Page not found / Go to dashboard | 页面未找到 / 前往概览 | 概览词族 |
| Soon / Beta(导航徽标) | 即将推出 / Beta | Beta 业界不译 |
| operating(会奖项目状态) | 执行中 | 与行中(订单)区分 |
| Cost sheet | 成本表 | 会奖行业词 |
| picked-up(房量) | 已提用库存 | 呼应房量预留的 pickup 语义 |
| Track(议程) | 分会场 | 会议行业标准 |
| Networking | 社交联谊 | 会议行业标准 |
| RFP issued / closed / under review | 已发标 / 已截标 / 评标中 | 招投标词族 |
| Bid accepted / rejected | 已中标 / 未中标 | 招投标词族 |
| Rooming / Primary occupant / Bed label | 分房 / 主入住人 / 床位标签 | 分房表词族 |
| Delegate roles(attendee/speaker/exhibitor/organizer) | 普通与会 / 演讲嘉宾 / 参展商 / 主办方 | 会议行业标准 |

### 通用后台词(auth / team)

| 英文 | 中文译法 | 取舍理由 |
| --- | --- | --- |
| Redeemed(邀请) | 已接受 | "核销"专属服务凭证语义,邀请被接受不可混用 |
| Voyant Cloud dashboard | Voyant Cloud 控制台 | "概览"专属应用内 Dashboard;此处为外部管理台 |
| Super-admin | 超级管理员 | 标准词 |
| Reset token | 重置令牌 | 标准技术译法 |

## 裁决记录(备查)

1. **Invoice = 账单**:定稿采用"账单";另有"收据"建议,待凯撒财务同事过目后再定,阶段 1 按"账单"推进。
2. **Allotment = 切位**:确认;与占位(Allocation)、预留(Hold)的区分见库存章节注释。
3. **Booking = 订单** 连带体系确认:Booking Item=订单项、Component Booking=组件订单,"预订"仅作动词。
4. **Slot = 班期**:确认;"团期"专属 Operated Group Departure(自营团期),两词严禁混用。
5. **招投标体系**:招标(RFP)→ 投标(Bid)→ 评标 → 授标(Award);会奖团队后续可复核,阶段 1 按此执行。

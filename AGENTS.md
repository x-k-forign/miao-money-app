# miao~记账 下一阶段实施交接说明

本文件是后续工程师实施本阶段功能的项目级说明。以本文为准，不再沿用旧版 MVP 需求描述。当前阶段只做本地版功能升级，不实现登录、云同步、云端 AI、小票识别。

## 一、实现需求

### 1. 阶段目标

本阶段目标是完成以下升级：

- 支持微信、支付宝账单文件导入；银行卡账单导入本阶段暂停开放。
- 新增预算分配作为底部主功能。
- 将汇率计算从底部导航移入右上角菜单。
- 实现订阅提醒，默认提前 3 天中午 12:00 提醒。
- 修复底部导航遮挡、安卓经典三键导航遮挡、平板/横屏拉伸问题。
- 修复收支趋势图 tooltip 遮挡点击的问题。
- 建立本地分类知识库，用于导入账单时自动识别分类。
- 建立重复账单识别机制，避免导入时重复入账。

### 2. 明确不做

本阶段不实现：

- 小票识别。
- 登录账号。
- 云同步。
- 云端 AI 分类。
- 导出 Excel。
- 主题换肤。

这些功能可以保留后续扩展空间，但不要在本阶段新增入口、路由或依赖。

### 3. 底部导航调整

底部导航调整为：

1. 我的账单
2. 收支分析
3. 预算分配
4. 订阅管理

中间继续保留悬浮加号按钮，用于进入添加收支页面。

当前底部导航中的 `汇率计算` 需要移入右上角菜单，不删除汇率功能。

### 4. 右上角菜单

四个主页面都需要有统一的右上角菜单入口。

要求：

- 保留当前截图中右上角入口的大致位置。
- 不沿用当前 2x2 小宫格样式，当前样式只是占位，太粗糙。
- 后续用户会提供菜单入口样式模板，工程师需要预留可替换结构。
- 第一版菜单内容只放 `汇率计算`。
- 菜单组件需要做成通用组件，四个主页面复用。

建议组件：

- `components/common/QuickMenuButton.tsx`
- `app/menu/index.tsx`
- `app/menu/exchange.tsx` 或复用现有 exchange 页面迁移后的路由

### 5. 账单导入

入口位置：

- 放在添加收支页面。
- 位于收入/支出切换的上方。
- 点击后进入导入流程。

导入流程：

1. 用户选择导入来源：微信、支付宝。
2. 用户上传 CSV、XLS 或 XLSX 文件。
3. 系统解析文件。
4. 系统自动识别收入/支出、金额、日期、商户/对方、备注、分类。
5. 系统检查重复账单风险。
6. 系统展示预览列表。
7. 用户修正无法识别或低置信度项目。
8. 用户确认导入。
9. 写入本地数据库。

导入来源：

- 微信
- 支付宝
- 银行卡：本阶段暂停开放入口，历史解析代码暂存，不继续作为验收范围。

注意：

- 微信、支付宝的完整字段识别依赖用户后续提供真实样例文件；银行卡样例解析历史代码暂存但入口下线。
- 在没有样例文件前，先实现可插拔解析框架、通用字段识别和预览确认流程。
- 样例文件到位后，再补齐具体字段映射、编码处理、交易状态过滤和特殊格式适配。

### 6. 本地分类知识库

导入账单时，系统需要通过本地知识库判断账单分类。

示例：

- `蜜雪冰城` -> 餐饮
- `地铁` -> 交通
- `公交` -> 交通

识别依据：

- 商户名称
- 交易对方
- 商品说明
- 交易类型
- 备注
- 收入/支出方向
- 金额符号
- 本地分类知识库命中结果

如果系统无法判断分类：

1. 弹窗询问用户这笔账单属于什么分类。
2. 用户可以选择分类。
3. 用户也可以跳过。
4. 跳过时默认归为 `其他`。
5. 如果用户选择了分类，需要把该关键词和分类关系写入本地知识库。
6. 下次出现同类账单时，系统应自动识别。

本地知识库要求：

- 系统默认内置较大规模关键词库，尽量覆盖大多数常见消费场景。
- 用户学习规则和系统内置规则分开标记。
- 用户规则优先级高于系统规则。
- 每条规则记录命中次数和最后命中时间。

### 7. 重复账单识别

导入时需要识别重复账单。

确定重复：

- 同一个导入来源下，交易号完全相同。
- 已存在相同 `dedupe_hash`。

疑似重复：

- 同日期 + 同金额。
- 日期接近 + 金额相同 + 商户或备注相似。
- 同一文件重复导入。
- 支付平台和银行卡可能同时记录同一笔交易，存在相同金额和相近日期。

处理方式：

- 确定重复：默认不导入，并在预览中标记。
- 疑似重复：弹窗让用户确认是不是同一笔账单。
- 用户确认重复：跳过导入。
- 用户确认不是重复：正常导入。

### 8. 预算分配

新增 `预算分配` 页面作为底部主功能，替换原来的汇率计算 tab。

用户输入：

- 每月预计收入。
- 可选：储蓄预留比例或储蓄目标。
- 可选：用户手动调整分类预算。

系统计算：

- 根据上个月支出项目比例生成预算。
- 根据固定订阅扣除固定支出。
- 根据当前月份剩余天数生成每日预算。
- 判断必需消费和弹性消费。
- 找出高消费分类并给出压缩建议。

预算优先级：

1. 固定支出：房租、订阅、话费等。
2. 必需消费：餐饮、住房、医疗、孩子、学习、通讯。
3. 交通预算：地铁、公交、打车、汽车相关。
4. 弹性消费：购物、娱乐、旅行、电影、化妆品。
5. 其他消费：其他、礼金、维修、快递等。
6. 高消费提醒：上月占比过高或金额异常的分类。

用户可以：

- 查看本月总预算。
- 查看每日可用预算。
- 查看每个分类的月预算和已用金额。
- 手动调整分类预算。
- 保存预算方案。

### 9. 订阅提醒

订阅提醒使用本地通知。

默认规则：

- 新增订阅时默认开启提醒。
- 默认提前 3 天提醒。
- 默认中午 12:00 提醒。

用户可对每个订阅单独调整：

- 是否开启提醒。
- 提前几天提醒。
- 提醒时间。

保存订阅后：

- 需要重新调度通知。
- 关闭订阅时取消通知。
- 删除订阅时取消通知。

当前数据库中已存在提醒字段，但需要补齐 DTO、查询、表单、列表展示和通知调度。

### 10. 适配与 Bug 修复

需要修复：

- 手机设置为安卓经典三键导航时，底部栏遮挡内容。
- 平板/横屏时页面被拉得过宽，卡片过长。
- 底部导航和悬浮加号遮挡账单列表内容。
- 收支趋势图 tooltip 有时挡住折线点，导致无法继续点击。

适配要求：

- 使用 `SafeAreaProvider` 和 `useSafeAreaInsets()`。
- tabBar 高度和 paddingBottom 动态计算。
- 页面滚动内容底部留白必须大于 tabBar + safe area。
- 平板/横屏下主内容加最大宽度或做分栏。
- 趋势图 tooltip 设置不拦截触摸，并根据点位避让。

## 二、使用技术

### 1. 当前基础栈

当前项目已经使用：

- React Native
- Expo
- TypeScript
- Expo Router
- SQLite
- Drizzle ORM
- Zustand
- NativeWind
- react-native-gifted-charts
- react-native-safe-area-context
- lucide-react-native

### 2. 本阶段新增依赖

需要新增：

- `expo-document-picker`：选择 CSV、XLS、XLSX 文件。
- `expo-file-system`：读取上传文件内容。
- `expo-notifications`：本地订阅提醒。
- `xlsx`：解析 XLS/XLSX。
- `papaparse`：解析 CSV。

不要新增：

- `expo-image-picker`
- `expo-camera`

因为小票识别本阶段取消。

### 3. 路由建议

需要调整或新增：

```text
app/
  (tabs)/
    bills.tsx
    analysis.tsx
    budget.tsx
    subscriptions.tsx
    _layout.tsx
  record/
    new.tsx
    [id]/edit.tsx
  import/
    index.tsx
    preview.tsx
  menu/
    index.tsx
    exchange.tsx
```

当前 `app/(tabs)/exchange.tsx` 的功能不要删除，迁移到菜单路由或封装成可复用页面组件。

### 4. 新增组件

建议新增：

```text
components/common/QuickMenuButton.tsx
components/import/ImportSourceSelector.tsx
components/import/ImportPreviewList.tsx
components/import/DuplicateRecordDialog.tsx
components/import/CategoryLearningDialog.tsx
components/budget/BudgetSummaryCard.tsx
components/budget/BudgetAllocationList.tsx
components/subscriptions/SubscriptionReminderFields.tsx
```

### 5. 新增服务

建议新增：

```text
services/importService.ts
services/importClassifierService.ts
services/classificationKnowledgeService.ts
services/duplicateRecordService.ts
services/budgetService.ts
services/notificationService.ts
```

服务职责：

- `importService`：文件选择、文件读取、导入流程编排。
- `importClassifierService`：导入账单分类识别。
- `classificationKnowledgeService`：系统规则种子数据、用户学习规则、规则命中。
- `duplicateRecordService`：确定重复和疑似重复判断。
- `budgetService`：预算生成、预算保存、预算进度计算。
- `notificationService`：通知权限、通知调度、通知取消。

### 6. 数据库新增表

需要新增：

```text
import_batches
import_rows
classification_rules
monthly_budgets
budget_allocations
```

`classification_rules` 字段建议：

- `id`
- `keyword`
- `match_type`
- `category_id`
- `source`: `system | user`
- `priority`
- `hit_count`
- `last_hit_at`
- `created_at`
- `updated_at`

`import_batches` 字段建议：

- `id`
- `provider`: `wechat | alipay | bank`
- `file_name`
- `file_type`: `csv | xls | xlsx`
- `total_rows`
- `ready_rows`
- `error_rows`
- `duplicate_rows`
- `imported_rows`
- `created_at`
- `updated_at`

`import_rows` 字段建议：

- `id`
- `batch_id`
- `raw_json`
- `status`: `pending | ready | error | duplicate | skipped | imported`
- `type`: `income | expense`
- `amount_cents`
- `record_date`
- `merchant_name`
- `external_trade_no`
- `note`
- `category_id`
- `confidence`
- `duplicate_record_id`
- `error_message`
- `created_at`
- `updated_at`

`monthly_budgets` 字段建议：

- `id`
- `month`
- `expected_income_cents`
- `saving_rate`
- `saving_target_cents`
- `available_budget_cents`
- `created_at`
- `updated_at`

`budget_allocations` 字段建议：

- `id`
- `budget_id`
- `category_id`
- `priority`: `fixed | essential | transport | flexible | high_spend | other`
- `monthly_budget_cents`
- `daily_budget_cents`
- `spent_cents`
- `suggestion`
- `created_at`
- `updated_at`

### 7. records 表扩展

`records.source` 需要支持：

- `manual`
- `subscription`
- `import`

建议新增字段：

- `import_batch_id`
- `import_provider`
- `external_trade_no`
- `merchant_name`
- `dedupe_hash`

去重优先级：

1. `import_provider + external_trade_no`
2. `dedupe_hash`
3. 日期、金额、商户、备注相似度

### 8. 类型约定

建议新增类型：

```ts
type ImportProvider = "wechat" | "alipay" | "bank";
type ImportFileType = "csv" | "xls" | "xlsx";
type ImportRowStatus = "pending" | "ready" | "error" | "duplicate" | "skipped" | "imported";
type ClassificationRuleSource = "system" | "user";
type BudgetPriority = "fixed" | "essential" | "transport" | "flexible" | "high_spend" | "other";
```

## 三、工程师实施记录精简与任务说明

### 1. 当前项目状态

- 项目已经是 Expo + React Native + TypeScript 项目。
- 已有底部导航已调整为：我的账单、收支分析、预算分配、订阅管理；中间保留悬浮加号按钮。
- 已有 SQLite + Drizzle 基础表：`records`、`categories`、`subscriptions`、`exchange_rates`、`app_settings`。
- 已有账单、分析、汇率、订阅相关 service 和 query。
- `subscriptions` 表已有提醒相关字段；当前已接到 DTO、查询层、订阅新增/编辑表单、订阅列表展示和 `subscriptionService` 通知调度入口。
- `AGENTS.md` 之前是旧版 MVP 说明，现在已经替换为本阶段实施交接说明。
- 2026-06-07 框架依赖技术负责人已完成基础依赖更新：`expo-document-picker`、`expo-file-system`、`expo-notifications`、`xlsx`、`papaparse`、`@types/papaparse`。
- 2026-06-07 已确认 React 版本仍固定为 `react@19.2.3` / `react-dom@19.2.3`，继续匹配 `react-native@0.85.3`。
- 2026-06-07 已新增基础服务入口：`services/importService.ts`、`services/importParserService.ts`、`services/importClassifierService.ts`、`services/duplicateRecordService.ts`、`services/budgetService.ts`、`services/notificationService.ts`。
- 2026-06-07 前端负责人已完成底部导航、预算分配页、导入账单页、银行选择页、右上角菜单汇率入口、订阅提醒 UI、安全区和横屏/平板宽度基础适配。
- 2026-06-07 汇率功能未删除，仍保留在 `app/(tabs)/exchange.tsx`；底部 tab 入口隐藏，右上角菜单跳转隐藏 tab 路由 `/exchange`，以保留底部导航。
- 2026-06-07 新增导入前端路由：`app/import/index.tsx`、`app/import/banks.tsx`、`app/import/preview.tsx`。银行卡导入先进入银行选择页，当前预设为中国农业银行、招商银行。
- 2026-06-07 新增导入前端组件：`components/import/ImportSourceSelector.tsx`、`ImportPreviewList.tsx`、`DuplicateRecordDialog.tsx`、`CategoryLearningDialog.tsx`、`BankLogo.tsx`。
- 2026-06-07 新增预算前端组件：`components/budget/BudgetSummaryCard.tsx`、`BudgetAllocationList.tsx`；新增预算 tab 页面 `app/(tabs)/budget.tsx`。
- 2026-06-07 新增订阅提醒表单组件：`components/subscriptions/SubscriptionReminderFields.tsx`。
- 2026-06-07 导入确认目前是前端状态闭环：能选择来源、选择文件、解析、预览、分类修正、疑似重复确认、跳过和标记已确认；尚未写入本地数据库，需后端/数据库补齐 query 后接入。
- 2026-06-07 预算页面目前能基于上月账单、当前订阅和本月已用金额生成预算并手动调整；保存按钮当前只保存页面状态，尚未持久化到 `monthly_budgets` / `budget_allocations`。
- 2026-06-07 `importClassifierService.ts` 目前是内置关键词规则占位实现，后续需要改为读取 `classification_rules`，并实现用户学习规则优先级。
- 2026-06-07 `duplicateRecordService.ts` 目前只做同月同日期同金额的疑似重复占位判断；后续需要接入交易号、`dedupe_hash` 和相似度逻辑。
- 2026-06-07 已运行 `npm.cmd run typecheck` 并通过。
- 2026-06-07 未安装 `expo-image-picker` / `expo-camera`，继续遵守本阶段不做小票识别的约束。
- 2026-06-07 `npm audit --omit=dev` 显示 `xlsx` 存在 high 级别漏洞且暂无官方修复版本；当前因本阶段方案指定 `xlsx` 暂时保留，导入实现时必须限制文件大小、只解析用户主动选择的本地文件，并在正式发布前评估替代库或隔离解析策略。
- 2026-06-07 后端已根据用户提供样例补齐导入格式限制：微信只允许 `xlsx`，支付宝只允许 `csv`，银行卡只允许 `pdf`；银行选择页提示已同步改为 PDF 流水模板。
- 2026-06-07 已确认样例字段：微信 XLSX 表头从账单说明后开始，支付宝 CSV 为 GB18030 编码且带账单说明头部，农行 PDF 和招行 PDF 均为可抽取文本流水；解析器已加入对应模板识别逻辑。
- 2026-06-07 已新增 `import_batches`、`import_rows`、`classification_rules`、`monthly_budgets`、`budget_allocations` 表结构和 query，并扩展 `records` 支持 `source = import`、交易号、商户、导入批次和 `dedupe_hash`。
- 2026-06-07 已接入导入确认入库：预览确认后写入导入批次、导入行和 `records`，确定重复默认跳过，疑似重复仍交给前端弹窗确认。
- 2026-06-07 已接入本地分类知识库：系统规则和用户学习规则分开，用户选择分类后写入用户规则，规则命中会维护命中次数和最后命中时间。
- 2026-06-07 已接入预算持久化：预算页保存会写入 `monthly_budgets` / `budget_allocations`，再次进入优先读取已保存方案。
- 2026-06-07 银行 PDF 当前已经支持文本模板解析；移动端直接从 PDF 二进制抽取文本仍需框架负责人补充 PDF 文本抽取依赖或隔离解析层，否则银行卡 PDF 会在文件选择后被正确识别格式但无法完成二进制文本提取。
- 2026-06-07 已重新运行 `F:\software\node.js\npm.cmd run typecheck` 并通过，本地 `http://localhost:8081/subscriptions` 返回 200。
- 2026-06-07 导入系统修复：Web 端 `expo-document-picker` 选择文件后优先读取 `asset.file.arrayBuffer()`，避免网页选择 XLSX/CSV 后无法把内容送入解析器。
- 2026-06-07 导入来源已在文件选择器层限制格式：微信仅可选 XLSX，支付宝仅可选 CSV，银行卡仅可选 PDF；页面仍保留二次格式校验。
- 2026-06-07 已安装 `pdfjs-dist` 并接入 Web/Node 可用的 PDF 文本抽取，银行卡 PDF 会先按坐标重组文本行，再进入农行/招商银行模板解析。
- 2026-06-07 修复支付宝 CSV 表头识别过宽问题，避免账单说明行被误判为交易表头。
- 2026-06-07 修复银行 PDF 旧账单排在前面导致前 200 行截断当前月份的问题：导入预览会先按账单日期倒序，再保留最近 1000 行。
- 2026-06-07 Web 端重复识别已补齐交易号和 `dedupe_hash` 的确定重复判断；确认导入时也会二次检查确定重复。
- 2026-06-07 账单列表来源文案已补齐 `source = import`，导入账单显示为“导入账单”，不再误显示为“订阅生成”。
- 2026-06-07 已用用户真实样例做解析验证：微信 XLSX 60 行、支付宝 CSV 45 行、农行 PDF 593 行、招商银行 PDF 311 行；`F:\software\node.js\npm.cmd run typecheck` 通过，`http://localhost:8081/import` 返回 200。
- 2026-06-07 导入归一化规则已按来源拆分，不再用通用“金额为正就是收入”判断微信/支付宝：微信和支付宝优先读取 `收/支`，银行优先读取 `交易金额` 正负号。
- 2026-06-07 微信 XLSX 规则：先取 `交易时间` 和 `收/支` 判断收支；`收/支` 为空或 `/` 时再看 `交易类型`，如 `零钱通转入` 归收入、`零钱通转出` 归支出；分类识别参考 `交易对方`、`商品`、`交易类型`、备注和原始行。
- 2026-06-07 支付宝 CSV 规则：先取 `收/支` 判断收支；分类优先参考 `交易分类`，再结合 `交易对方`、`商品说明` 和原始行；`不计收支` 或交易关闭默认跳过。
- 2026-06-07 招商银行 PDF 规则：`交易金额` 带负号为支出，否则为收入；分类识别参考 `对手信息` 与 `交易摘要`；账单名称优先取 `对手信息`。
- 2026-06-07 农业银行 PDF 规则：`交易金额` 带负号为支出，否则为收入；分类识别参考 `对手信息`、`交易摘要`、`交易附言`；账单名称优先取 `交易附言`。
- 2026-06-07 导入交互已调整：分类高置信度且非重复的 `ready` 行会自动确认入账；只有分类低置信度、疑似重复、错误或跳过的行留在预览页让用户处理。
- 2026-06-07 导入预览页已允许用户手动修改单条账单的收入/支出类型；切换类型后分类候选会同步切换到对应收入/支出分类，并默认回到对应类型的“其他”分类供用户继续修正。
- 2026-06-07 支付宝导入修正：`不计收支` 不再一刀切跳过，退款、退货、退费、返还以及可明确判断为消费/日用百货/购物/餐饮/交通的记录会继续进入自动导入；交易关闭或无法判断的中性流水仍保留为跳过。
- 2026-06-07 导入预览 UI 已修正 `skipped` 状态文案：跳过行显示“已跳过”，不再显示“可导入”，避免误判自动导入未生效。
- 2026-06-07 支付宝花呗规则补充：`信用借还`、`花呗主动还款`、`主动还款`、`还款` 明确按支出处理，即使 `收/支` 为 `不计收支` 也不自动跳过。
- 2026-06-07 导入自动导入仅发生在文件解析完成后的初始分流：高置信度 `ready` 行直接入账；预览页中用户手动恢复、修改收入/支出或修改分类后，需要用户点击确认导入，避免手动操作后发生意外自动入账。
- 2026-06-07 已按新归一化规则重新验证样例：微信 60 行不再全收入；支付宝 45 行可区分支出、收入和跳过；农行 593 行、招商 311 行可按金额符号分收支；`F:\software\node.js\npm.cmd run typecheck` 通过。
- 2026-06-08 银行 PDF 解析性能修复：导入预览构建前会通过 `createImportClassifier()` 一次性加载收入/支出分类和本地分类规则，避免农行 593 行、招商 311 行逐行重复拉取规则导致 Web 页面看起来无响应。
- 2026-06-08 银行 PDF 空结果处理已补齐：PDF 抽取后如果没有识别到交易流水，会明确提示“未识别到交易流水”；如果读取到行但金额/日期无法归一化，会提示“未生成可导入账单”。
- 2026-06-08 银行 PDF 自动导入完成且没有待确认项时，会提供“返回添加收支”操作入口跳回 `/record/new`；如仍有低置信度、重复或跳过项目，则继续留在导入预览页供用户处理。
- 2026-06-08 导入流程已增加 0-100 可视化进度条，阶段包括打开文件选择器、校验格式、读取文件、解析模板/PDF、识别分类与重复、自动导入和完成；PDF 抽取会按页更新进度。
- 2026-06-08 Web 端 `expo-document-picker` 已显式设置 `base64: false`，避免浏览器先把 PDF 转 base64 导致选择文件后长时间无反馈；后续使用 `asset.file.arrayBuffer()` / Blob 读取。
- 2026-06-08 PDF 解析已加 45 秒超时保护，超时会提示用户确认 PDF 是否为可复制文本流水，避免静默卡住。
- 2026-06-08 银行 PDF Web 解析修复：`pdfjs-dist` v6 不再支持原先的 `disableWorker` 方式，已将 `pdf.worker.mjs` 复制到 `public/pdf.worker.mjs` 并设置 `GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs"`；已确认 `http://localhost:8081/pdf.worker.mjs` 返回 200。
- 2026-06-08 银行导入分类规则已按银行模板做字段优先级：农行按 `交易摘要` -> 清理流水号后的 `交易附言` -> `对手信息` 逐段命中；招商按 `交易摘要` -> `对手信息` 逐段命中，不再把全部字段混合后一次性判断。
- 2026-06-08 农行导入名称已清理 `交易附言` 前面的字母数字流水号，优先输出真实附言内容；招商导入名称继续直接使用 `对手信息`。
- 2026-06-08 银行收支判断继续严格按金额符号：农行 `+` 为收入、`-` 为支出；招商 `-` 为支出，无符号为收入；农行 `20251207` 紧凑日期也已支持归一化为 `2025-12-07`。
- 2026-06-08 导入页新增月份范围选择，支持 `1个月`、`2个月`、`3个月`、`4个月`、`5个月`、`6个月`；范围以今天为结束边界并包含今天，例如 `1个月` 表示从今天往前 1 个月到今天。
- 2026-06-08 农行分类待确认过多的根因是摘要字段大量为泛化银行动作词，例如 `代付`、`微信支付`、`支付宝`、`快捷支付`、`转支`、`银联入账`，这些不能作为有效分类优先命中；已在银行分类文本中跳过这类泛化摘要，继续用清理后的交易附言和对手信息识别真实商户。
- 2026-06-08 银行导入新增泛化动作词兜底：如果农行/招商仍只命中银行动作词，收入类如 `代付`、`银联入账`、`提现`、`结息` 会高置信归入收入“其他”；支出类如 `微信支付`、`支付宝`、`快捷支付`、`银联无卡自助消费`、`转支`、`网上支付` 会高置信归入支出“其他/购物”，减少无意义的用户确认。

### 2. 前端设计师

已完成：

- 底部导航已用 `预算分配` 替换 `汇率计算`，并修复底部文字挤压、安卓安全区和悬浮加号位置问题。
- 汇率计算已从右上角菜单进入；注意菜单跳转目标应保持为 `/exchange`，不要跳到 `/menu/exchange`，否则会丢失底部导航。
- 添加收支页面已增加“导入账单”入口，入口位于收入/支出切换上方。
- 导入来源已做成竖向列表：微信、支付宝、银行卡；点击银行卡进入 `app/import/banks.tsx` 银行选择页。
- 银行选择页已有两个预设：中国农业银行、招商银行；当前使用 `components/import/BankLogo.tsx` 内置绘制 logo。
- 导入预览、分类修正弹窗、疑似重复确认弹窗、跳过/恢复导入等前端交互已完成。
- 预算分配页面已完成预计收入输入、储蓄比例/目标、预算结果、每日预算、分类预算、用户手动调整与保存入口。
- 订阅新增和编辑页面已增加提醒设置 UI，默认提前 3 天、12:00、默认开启；订阅列表已展示提醒状态。
- `AppScreen` 已限制主内容最大宽度，改善平板/横屏页面过宽问题。

注意：

- 不要删除汇率功能，只迁移入口。
- 不要实现小票识别入口。
- 右上角菜单入口先做可替换结构，等用户提供样式模板后再精修。
- 所有新增界面继续保持浅蓝、清爽、可爱、轻量风格。
- 导入 rows 和预算方案已接入后端 service 持久化；后续重点验证真机 SQLite 迁移、导入重复跳过和预算保存回读。
- Expo Router 56 对 `Link asChild` 子组件传数组 style 较严格；悬浮加号、菜单入口、导入入口已改为 `router.push`，后续新增按钮时注意不要重复引入该问题。

### 3. 后端设计师

已完成：

- 实现导入流程编排：文件读取、解析、分类识别、重复检测、预览修正、确认入库。
- 实现微信、支付宝、银行卡的可插拔解析器框架。
- 实现分类识别逻辑和置信度计算。
- 实现用户分类学习逻辑：用户选择分类后写入本地知识库。
- 实现重复账单识别逻辑：交易号、去重 hash、同日期同金额、相近日期相似内容。
- 实现预算计算逻辑：上月比例、固定订阅、必需消费、交通预算、弹性消费、高消费识别。
- 实现订阅提醒业务逻辑：默认提醒、动态提醒时间、保存后重新调度、关闭/删除后取消。
- 与数据库设计师对齐 query 接口，避免页面直接访问数据库。

前端对接提示：

- 导入页当前入口在 `app/import/index.tsx`，格式限制已接入 `assertImportFileMatchesProvider()`：微信 `xlsx`、支付宝 `csv`、银行卡 `pdf`。
- Web 端文件读取已接入浏览器 `File` 对象；原生端仍走 `expo-file-system`。
- 银行 PDF 文本抽取使用 `pdfjs-dist/legacy/build/pdf.mjs`，抽取后按坐标重组成交易行，再区分农行/招商模板。
- `ImportProvider` 仍是 `wechat | alipay | bank`；银行具体模板通过页面 query 参数 `bankPreset=abc | cmb` 表示，并落到 `import_batches.provider_detail`。
- 导入确认已接入 `confirmImportBatch()`，会完成 `import_batches`、`import_rows`、`records` 写入和确定重复跳过。
- 分类修正弹窗选择分类时已调用 `learnClassificationRule()` 写入 `classification_rules` 用户规则，并维护命中次数和最后命中时间。
- 疑似重复弹窗仍由前端负责用户确认；后端 `checkImportedRecordDuplicate()` 已区分确定重复和疑似重复。
- 预算页已接入 `saveMonthlyBudgetPlan()`、`getSavedMonthlyBudget()`，保存后可从本地预算表回读。
- 订阅提醒 UI 已将 `reminderEnabled`、`reminderDaysBefore`、`reminderTime` 传给 `addSubscription` / `updateSubscriptionById`；通知调度入口在 `subscriptionService.ts` 的 `syncSubscriptionReminder()`。
- Web 端通知调度是 no-op；Android/iOS 需要重点验证权限弹窗、Android channel、关闭/删除订阅取消通知。

注意：

- 微信、支付宝、农行、招商银行样例字段已做第一版适配；后续新增银行模板时继续扩展 `parseBankPdfTextRows()`。
- 导入时确定重复默认跳过，疑似重复必须交给用户确认。
- 分类无法识别时允许用户跳过，跳过默认 `其他`。
- 预算第一版只用本地规则，不接 AI。
- `xlsx` 存在已知 high audit 风险，后端导入实现必须继续限制文件大小、只解析用户主动选择的本地文件，并在发布前评估替代解析方案。

### 4. 数据库设计师

已完成：

- 新增导入、分类知识库、预算相关表。
- 扩展 `records` 表支持 `source = import`。
- 为 `records` 增加导入追溯和去重字段。
- 补齐订阅提醒字段到 DTO、查询层和持久化接口。
- 编写 import、classification、duplicate、budget、notification 需要的 query。
- 准备系统内置分类关键词种子数据。
- 设计必要索引和唯一约束，保证导入和重复识别效率。

前端当前依赖的字段/接口提示：

- `ImportRecordDraftDTO` 已在 `types/models.ts` 中定义，页面预览依赖字段包括：`provider`、`type`、`amountCents`、`recordDate`、`merchantName`、`externalTradeNo`、`note`、`categoryId`、`confidence`、`status`、`raw`。
- `MonthlyBudgetDTO` 和 `BudgetAllocationDTO` 已在 `types/models.ts` 中定义，预算页依赖 `allocations`、`availableBudgetCents`、`expectedIncomeCents`、`savingRate`、`savingTargetCents`。
- `RecordSource` 已扩展为包含 `import`，账单 DTO 已带导入追溯字段。
- 银行模板已落到 `import_batches.provider_detail`，当前前端用 `abc` 表示中国农业银行，`cmb` 表示招商银行。
- 预算保存已补齐 `monthly_budgets`、`budget_allocations` 的 upsert/query，前端保存按钮已调用持久化 service。

重点表：

- `import_batches`
- `import_rows`
- `classification_rules`
- `monthly_budgets`
- `budget_allocations`
- `records` 扩展字段
- `subscriptions` 提醒字段链路补齐

注意：

- 用户学习规则和系统规则需要能区分。
- 用户规则优先级应高于系统规则。
- 去重优先级为交易号、dedupe hash、相似度判断。

### 5. 项目框架依赖技术和项目落地负责人

准备实施：

- 安装并验证本阶段新增依赖：`expo-document-picker`、`expo-file-system`、`expo-notifications`、`xlsx`、`papaparse`。
- 不安装小票识别相关依赖，例如 `expo-image-picker`、`expo-camera`。
- 负责路由迁移：新增预算 tab、菜单路由、导入路由，迁移汇率入口。
- 负责 `SafeAreaProvider`、tabBar 动态高度、页面底部留白、平板/横屏适配的基础框架。
- 负责通知权限、Android 通知 channel、通知调度基础封装。
- 负责整体集成顺序、冲突处理、类型检查和回归验证。
- 负责把四类工程师的实现合并成可运行版本。

注意：

- 依赖安装如遇 PowerShell 执行策略问题，可改用 `npm.cmd` 或调整命令执行方式。
- 依赖安装如遇网络沙箱限制，需要按项目审批流程申请。
- 最终交付前需要验证手机竖屏、安卓经典三键导航、平板/横屏。

### 6. 统一验收标准

所有工程师完成后需要共同验证：

- 手机竖屏、平板/横屏、安卓经典三键导航下不遮挡。
- 底部导航为：我的账单、收支分析、预算分配、订阅管理。
- 右上角菜单能进入汇率计算。
- 手动记账、账单列表、收支分析、订阅管理不能回归。
- 导入流程能完成选择文件、预览、分类、去重、确认导入。
- 本地知识库能学习用户选择。
- 预算能生成、调整、保存。
- 订阅提醒默认和自定义设置都能工作。

## 四、数据库设计师本次版本更新记录

2026-06-07 数据库设计师已完成本阶段数据库版本更新与验证：

- 已补齐 Drizzle 迁移链：新增 `drizzle/0002_closed_siren.sql` 与 `drizzle/meta/0002_snapshot.json`，覆盖 `import_batches`、`import_rows`、`classification_rules`、`monthly_budgets`、`budget_allocations` 五张新表，以及 `records` 导入追溯字段。
- 已将 `0002` 迁移从 Drizzle 默认的 `records` 表重建 SQL 改为保守迁移：只执行 `ALTER TABLE records ADD COLUMN` 和新增索引，不包含 `DROP TABLE`、`__new_records` 或关闭外键的重建段。
- 已优化 `db/init.ts` 的老库升级逻辑：优先逐列补齐 `records.import_batch_id`、`import_provider`、`external_trade_no`、`merchant_name`、`dedupe_hash`；只有遇到带旧版 `records_source_check` 且不支持 `source = import` 的历史表时，才把旧表重命名为 `records_backup_before_import_*` 后复制数据，保留旧表作为备份，不直接删除旧数据表。
- 已验证导入去重约束：`records_import_trade_unique_idx` 能拦截同一来源下相同交易号，`records_dedupe_hash_unique_idx` 能拦截相同 `dedupe_hash`。
- 已验证预算和分类知识库表可写入：`monthly_budgets`、`budget_allocations`、`classification_rules` 在迁移链执行后能正常插入测试数据。
- 已扩充本地分类知识库系统种子：`classificationKnowledgeService.ts` 当前包含 27 个规则组、去重后 1580 个关键词，覆盖餐饮、购物、交通、运动、娱乐、通讯、住房、孩子、旅行、汽车、医疗、学习、宠物、礼金、维修、快递、电影、日用品、化妆品，以及工资、兼职、奖金、红包、投资、退款等收入场景；用户学习规则仍以更高优先级覆盖系统规则。
- 已按用户提供的微信 XLSX、支付宝 CSV、农业银行 PDF、招商银行 PDF 样例补充真实摘要关键词：微信零钱提现、零钱通转入/转出、余额宝自动转入/转出到余额、提现、花呗/白条/月付还款、已全额退款/退款成功，以及样例商户和摘要如淘宝平台商户、数智云助学、龙岩学院校车、哈啰骑行、美团月付还款、京东白条等。
- 已继续按样例和合理推断补充银行流水兜底规则：快捷支付、银联快捷支付、银联无卡自助消费、转账汇款、汇入汇款、支付宝/微信支付个人付款、CRS 存款等；对样例文本做粗测时 936 行命中 935 行，未命中项为招商 PDF 日期范围标题，不是交易行。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过。
- 已用 SQLite 内存库执行 `0000 -> 0001 -> 0002` 完整迁移链，结果通过，最终表数量为 10，`records` 表包含 16 个字段。
- 已启动 Expo Web 受控验证：`http://localhost:8096` 根页面返回 200，入口 bundle 返回 200，验证后已关闭测试进程且端口无残留监听。

## 五、2026-06-08 后端导入分类修复记录

- 已修复农业银行 PDF 导入大量进入用户确认的问题：银行流水在规则和泛化动作词仍未命中时，会按已识别出的收支方向自动归入对应的“其他”分类，置信度为 `0.68`，高于自动导入阈值 `0.65`；真实关键词和用户学习规则仍保持更高优先级。
- 已保留银行动作词泛化兜底：收入类如 `代付`、`银联入账`、`转存`、`提现`、`结息` 会归入收入“其他”；支出类如 `微信支付`、`支付宝`、`快捷支付`、`银联`、`转支`、`消费` 会归入支出“其他/购物”。
- 已用农业银行 PDF 样例跑命中率测试：PDF 共解析 593 条交易；按 `2026-06-08` 为结束日统计，1/2/3/4/5/6 个月范围内分别为 10、39、78、197、366、587 条，分类低置信待确认均为 0，自动分类命中率均为 100%。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过。
- 已修复农业银行导入日期优先级问题：农行解析行同时带有 `交易日期` 和 `交易时间`，此前通用归一化优先读取 `交易时间`，导致 `123221` 这类时分秒无法解析成日期并回退到当天 `2026-06-08`，旧流水因此绕过月份过滤且以 `error` 状态显示为“待处理”；现银行导入优先读取 `交易日期` / `记账日期`，再兜底读取 `交易时间`。
- 已补齐导入预览错误状态文案：`error` 行显示“字段错误”，不再显示为“待处理”。复测农行 PDF：总解析 593 条，1 个月范围 10 条，`2025-12` 流水进入 1 个月范围数量为 0，1 个月范围收支拆分为收入 4 条、支出 6 条。
- 已按用户反馈放宽导入月份范围：仍以今天为结束边界，但起始日期回到起始月份 1 日，避免银行“半年/6个月”流水边界日期被过滤造成丢账。
- 已验证用户新提供样例：农行 `26060819463957986049.pdf` 解析 587 条，其中 `2026-05-01` 解析 2 条；招商银行 PDF 解析 311 条，其中 `2026-05-01` 解析 3 条，说明 `2026-05-01` 未在 PDF 解析阶段丢失。
- 已按用户要求撤回 Web 端账单 `localStorage` 持久化：浏览器测试账单继续只保存在当前运行内存中，方便用户通过刷新/重启进行干净导入验证；不要把导入账单自动长期存入浏览器本地存储。
- 已修复导入去重误杀：不再仅凭“同日期 + 同金额”就判为疑似重复；现在需要同收支方向且商户或备注相似，才进入疑似重复让用户判断。确定重复仍按同来源交易号和 `dedupe_hash` 直接拦截。
- 已用四类真实样例做 6 个月导入核对：微信 XLSX 解析 60 行、可入账 60 行、错误 0；支付宝 CSV 解析 45 行、可入账 33 行、按“不计收支/关闭/中性流水”跳过 12 行、错误 0；农行 PDF 解析 587 行、可入账 587 行、错误 0；招行 PDF 解析 311 行、可入账 311 行、错误 0。农行 `2026-05-01` 为 2 行，招行 `2026-05-01` 为 3 行。
- 已按用户要求暂停银行卡导入入口：导入来源 UI 只保留微信和支付宝；添加收支页提示改为“微信 XLSX、支付宝 CSV”；`app/import/banks.tsx` 银行选择路由已移除。银行 PDF 解析相关服务代码暂存，不作为当前版本用户入口和验收范围。
- 已修复微信/支付宝导入月份范围默认值：导入页默认选中 `6个月`，避免用户未手动切换时只导入约 30 天记录；仍保留 `1个月` 到 `6个月` 六个按钮供用户缩小范围。
- 已修复月份范围起始日计算：不再用 `setMonth()` 后再 `setDate(1)` 的可溢出写法，改为直接构造 `new Date(year, month - range, 1)`，确保 1-6 月按钮都从对应起始月份 1 日开始并包含今天。用微信 XLSX、支付宝 CSV 样例逐档验证：两个样例本身均只覆盖最近约一个月，因此 1-6 档包含数量相同；微信 60 行全部可入账，支付宝 45 行中 33 行可入账、12 行按中性流水跳过、错误 0。

## 六、2026-06-08 数据库设计师微信/支付宝知识库扩展记录

- 当前版本按用户要求仅保留微信和支付宝导入入口，银行卡 PDF 解析代码继续暂存，不作为当前入口与验收范围。
- 已基于用户提供的 `微信支付账单流水文件(20251201-20260608)_20260608203605(1).xlsx` 和 `支付宝交易明细(20251201-20260608).csv` 扩展本地分类知识库。
- 已同步前端分类与原生 SQLite 系统分类：支出新增 `软件订阅`、`信用还款`、`数码电子`、`保险税费`、`生活服务`；收入新增 `二手转卖`、`收款`。Web 端 mock 分类和原生端 `defaultCategories` 均已同步。
- 已将分类种子改为稳定 ID，不再因新增分类改变旧分类 ID；`seedDefaultCategories()` 改为 upsert，同步系统分类名称、图标、颜色和排序，避免老库缺少新增分类。
- 已补充微信专用关键词：个人微信转账、转账备注、群收款付款、单发红包、发给亲友、砍车费、车贷、零钱通相关转入转出等，减少微信社交流水进入不明收支。
- 已补充支付宝专用关键词：余额宝转入转出、花呗/白条/月付/借呗还款、信用借还、退款/退货/退费、软件订阅、数码电子、保险税费、生活服务、二手转卖、收款等真实样例关键词。
- `classificationKnowledgeService.ts` 当前系统规则规模为 34 个分类组、去重后 1783 个关键词；用户学习规则仍以更高优先级覆盖系统规则。
- 已用新微信样例做命中验证：共解析 1091 行，其中 1022 行可判断收支、69 行按中性流水跳过；1022/1022 命中分类，命中率 100%。
- 已用新支付宝样例做命中验证：共解析 268 行，其中 226 行可判断收支、42 行按交易关闭或中性流水跳过；226/226 命中分类，命中率 100%。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过。
- 已修复支付宝退款被误识别为支出的问题：`inferType()` 对微信/支付宝先判断 `退款`、`退货`、`退费`、`返还`、`退回`、`冲正`、`售后`、`退款成功`、`原交易退回` 等明确退款文本，再判断 `收/支`、花呗、信用借还和还款字段。用户样例 `退款-莱仕达 PD HM GEN2 霍尔磁传感踏板阻尼胶踏板。` 修复后判为收入并归入 `退款`。
- 已按新增前端分类继续扩充本地知识库：为 `水电燃气`、`外卖`、`零食饮料`、`服饰鞋包`、`家居家装`、`家政保洁`、`酒店住宿`、`美容美发`、`社交聚会`、`办公`、`理财支出`、`转账支出`、`公益捐赠`、`停车过路` 新增高优先级系统规则，优先于旧的餐饮、购物、交通、旅行、其他等大类命中。
- 本轮扩容后 `classificationKnowledgeService.ts` 系统规则规模为 48 个分类组、去重后 2382 个关键词。新增组示例：`零食饮料` 50 个、`服饰鞋包` 53 个、`家居家装` 51 个、`办公` 47 个、`停车过路` 45 个、`酒店住宿` 44 个、`水电燃气` 40 个关键词。
- 已用新微信样例回归：1091 行中 1022 行可判断收支、69 行跳过；1022/1022 命中分类，命中率 100%。命中结果已细分到 `转账支出`、`零食饮料`、`办公`、`社交聚会`、`停车过路`、`服饰鞋包`、`外卖` 等新增分类。
- 已用新支付宝样例回归：268 行中 226 行可判断收支、42 行跳过；226/226 命中分类，命中率 100%。命中结果已细分到 `零食饮料`、`外卖`、`酒店住宿`、`家居家装` 等新增分类。
- 已按用户要求将支出分类从 39 个精简为 16 个：`餐饮`、`购物`、`交通`、`汽车`、`居家`、`通讯订阅`、`医疗`、`学习办公`、`娱乐`、`旅行`、`家庭宠物`、`社交`、`金融`、`生活服务`、`公益`、`其他`。收入分类保持原结构。
- 分类合并关系已同步到知识库：`外卖/零食饮料 -> 餐饮`，`服饰鞋包/化妆品/数码电子/日用品 -> 购物`，`停车过路 -> 汽车`，`住房/水电燃气/家居家装 -> 居家`，`通讯/软件订阅 -> 通讯订阅`，`学习/办公 -> 学习办公`，`电影/运动 -> 娱乐`，`酒店住宿 -> 旅行`，`孩子/宠物 -> 家庭宠物`，`礼金/社交聚会 -> 社交`，`信用还款/理财支出/转账支出/保险税费 -> 金融`，`家政保洁/维修/快递/美容美发 -> 生活服务`，`公益捐赠 -> 公益`。
- 已同步前端分类：`constants/categories.ts` 原生系统分类和 `constants/mockData.ts` Web/mock 分类均只展示 16 个支出分类；`db/queries/categories.ts` 只返回当前默认分类 ID，避免老库旧系统分类继续出现在选择面板。
- 已同步导入分类器与预算服务：`importClassifierService.ts` 的兜底分类改为新分类名；`budgetService.ts` 的预算优先级、收入档位默认权重、分类启用规则均改为 16 类体系。
- 合并后回归验证通过：微信样例 1022/1022 命中，支付宝样例 226/226 命中，命中率均为 100%；分类结果已落到精简后的新分类。`F:\software\node.js\npm.cmd run typecheck` 通过。

## 七、2026-06-08 后端微信/支付宝内部划转跳过记录

- 已补充余额宝和零钱通内部资金划转识别：只有明确属于自有账户内部互转时才跳过，例如支付宝 `余额转入余额宝`、`支付宝余额转入余额宝`、`余额宝转出到余额`、`余额宝转入支付宝余额`，以及微信 `零钱转入零钱通`、`微信零钱转入零钱通`、`零钱通转出到零钱`、`零钱通转入微信零钱`。
- 上述内部划转在导入归一化阶段标记为 `skipped`，并在原始行写入 `_importSkipReason = transfer`；导入预览分流会静默移除这类行，不写入账单、不计入收支统计，也不再交给用户手动检查。单边 `转入余额宝` / `转入零钱通` 不再跳过，按外部资金进入识别为收入；`余额宝转出` / `零钱通转出` 如不是转回支付宝余额或微信零钱，则按支出处理。
- 已加固支付宝 CSV 表头识别：优先识别包含 `交易时间`、`交易分类`、`商品说明`、`收/支`、`金额` 的真实表头，避免导出说明或分隔行被误当成交易表头。
- 已用微信 6 个月 XLSX 样例验证：共解析 1091 行，其中 967 行进入可分类导入流程且低置信待确认为 0；124 行被跳过，其中 55 行识别为零钱通 `transfer` 静默跳过。
- 当前支付宝 6 个月 CSV 样例未包含余额宝内部划转；已用合成规则样例验证 `余额转入余额宝`、`余额宝转出到余额`、`零钱转入零钱通`、`零钱通转出到零钱` 命中 `transfer` 静默跳过，`转入余额宝`、`朋友转账存入余额宝`、`转入零钱通`、`别人转账存入零钱通` 不会被误跳过。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过；`http://localhost:8081/import` 返回 200。

## 八、2026-06-08 APK 落地负责人构建记录

- 已按 `android-apk-build` 流程完成 Android release APK 构建，产物已复制到 `dist/miao-money-release.apk`。
- 构建环境使用：JDK `F:\software\jdk-17\jdk-17.0.10+7`、Gradle `F:\software\gradle\gradle-9.3.1`、Android SDK `F:\software\android-sdk`、NDK `27.3.13750724`。
- 已确认 `react@19.2.3`、`react-dom@19.2.3`、`react-native@0.85.3` 版本对齐，避免此前真机启动出现 `Incompatible React versions`。
- 已运行原项目和短路径构建副本的 `npm run typecheck`，均通过。
- 已运行 Android Hermes bundle 预检：`expo export --platform android` 通过，确认 release bundle 可生成。
- 已修复 Android 打包阻断点：`pdfjs-dist` 会被 Metro 打进 Android bundle，导致 Hermes 编译时报 `Invalid expression encountered`；当前银行卡导入入口已暂停，因此 Android 版本不再加载 PDF 二进制抽取逻辑，保留 PDF 文本模板解析函数作为后续扩展代码。
- 已移除根路由中不存在的 `import/banks` 注册，避免 Expo Router 继续保留缺失路由。
- 已补齐 Android 13+ 通知权限：`android.permission.POST_NOTIFICATIONS`，并将 `expo-notifications` 加入 `app.json` plugins，避免后续 prebuild 丢失通知配置。
- 已用全新短路径 `F:\miao_apk_clean` 构建，复制时排除了 `node_modules`、`.tools`、`.expo-android-export-check`、`android/.gradle`、`android/app/.cxx`、`android/app/build` 和 `android/build`，避免旧 CMake/Gradle 产物混入。
- `gradle assembleRelease --no-daemon --console=plain` 已通过；构建日志只有 Java deprecation / unchecked 警告。
- `apksigner verify --print-certs dist/miao-money-release.apk` 已通过；当前 release APK 仍使用 Android debug keystore 签名，只适合本地测试和阶段验收。
- APK 基本信息：包名 `com.miaomoney.app`，版本 `0.1.0`，`versionCode=1`，`minSdk=24`，`targetSdk=36`，原生 ABI 包含 `arm64-v8a`、`armeabi-v7a`、`x86`、`x86_64`。
- 当前 ADB 检查结果为无设备连接：`adb devices -l` 只返回空设备列表，因此本轮未完成真机安装、启动、进入退出和 SQLite 持久化回归。
- iOS 本轮未构建；当前开发机为 Windows 环境，不做本地 iOS 构建。如需 iOS，需要后续使用 macOS + Xcode 或云端 EAS Build。

### 下一步重点

1. 插入 Android 手机后安装 `dist/miao-money-release.apk`，重点验证启动、退出重进、手动记账、微信/支付宝导入、预算保存回读、订阅提醒权限弹窗和通知调度。
2. 用真机执行数据持久化回归：新增一笔手动账单、保存预算方案、导入一小批微信/支付宝账单，退出 App 后重新进入，确认数据仍存在且不重复生成。
3. 若继续开放银行卡 PDF 导入，需要为 Android 单独接入可用的 PDF 文本抽取方案；不要再把 Web 版 `pdfjs-dist` 直接打入 Android Hermes bundle。
4. 正式发布前创建独立 release keystore，并切换 `android/app/build.gradle` 的 release 签名配置，当前 debug keystore 不能用于正式分发。
5. 继续处理 `xlsx` 的 high audit 风险：发布前评估替代库或隔离解析策略，并保留文件大小限制和用户主动选择文件限制。

## 九、2026-06-09 后端预算智能分配记录

- 已将预算分配从单纯“上月消费比例 + 固定订阅”升级为“收入档位权重 + 上月消费习惯微调 + 固定支出优先”。
- 收入档位按月预计收入自动分为三档：`< 6000 元` 为贫困档，优先保障衣食住行、通勤、通讯、水电燃气、医疗和必要还款；`6000-20000 元` 为小康档，在基础生活稳定后给娱乐、学习、社交、旅行和偶尔高消费留出空间；`>= 20000 元` 为富裕档，提高品质生活、高频高消费、旅行、数码、社交和服务类预算上限。
- 上月消费习惯不再主导全部预算，只作为微调：贫困档只采用 15% 上月习惯权重，小康档 25%，富裕档 35%；收入越低越偏向系统基础生活权重，收入越高越尊重用户既有消费结构。
- 贫困档对旅行、酒店、数码、化妆品、美容美发、娱乐、电影、社交聚会等弹性/高消费分类设置权重上限，避免低收入下自动分配过多非必要预算。
- `BudgetSummaryCard` 已显示当前收入档位和策略说明；预算页标题说明已改为“按收入档位、固定支出和上月消费结构生成本月预算”。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过；`http://localhost:8081/budget` 返回 200。
- 已接入前端分类开关：`BudgetAllocationDTO` 增加可选 `enabled` 字段，用户填写预计收入后传给 `generateMonthlyBudgetPlan()`，后端按收入档位返回每个分类默认开关；预算页会用 `enabled=false` 初始化隐藏分类，隐藏分类预算为 0 且保存时从方案中排除。
- 分类开关策略：固定订阅、有上月消费记录、衣食住行和必要项默认开启；贫困档默认关闭旅行、酒店、数码、化妆品、美容美发、娱乐、社交等非必要分类；小康档逐步开启娱乐、购物、旅行、数码、社交等分类；富裕档默认全开。
- 已重点修正衣食住行体系：餐饮从贫困档权重 `22` 提高到 `30`，小康档从 `17` 提高到 `22`，富裕档从 `16` 提高到 `20`；外卖权重下调，避免把基础吃饭预算错分到外卖；`服饰鞋包` 纳入必需消费并在三档中保留基础衣物预算。
- 2026-06-09 二次精修：适配数据库工程师将 39 个分类精简为 16 个支出分类后的预算权重，当前权重只使用 `餐饮`、`购物`、`交通`、`汽车`、`居家`、`通讯订阅`、`医疗`、`学习办公`、`娱乐`、`旅行`、`家庭宠物`、`社交`、`金融`、`生活服务`、`公益`、`其他`。贫困档进一步提高餐饮权重到 `34`、交通到 `12`，降低汽车、娱乐、公益等非必要项；小康档餐饮提高到 `25`；富裕档餐饮提高到 `24`，同时保留旅行、购物、社交等高消费空间。
- 预算页已新增“智能优化自定义预算”：用户先选择分类开关并手动填写月预算后，可触发 `optimizeCustomBudgetPlan()` 按收入档位重新平衡当前开启分类；算法会保留部分用户自定义比例，但优先补足餐饮、居家、交通、通讯订阅、医疗、金融等基础/必要支出，再分配购物、娱乐、旅行、社交等弹性消费。
- 分类月预算输入已改为草稿输入模式：输入期间不再每个字符强制 `centsToYuan()` 格式化，用户可以清空、插入、小数编辑；失焦或提交时再解析为金额并格式化，避免必须从头删到尾重填。
- 已检查导入分类适配：导入 fallback 已使用 `通讯订阅`、`金融`、`社交`、`购物`、`其他` 等新分类；本地知识库已将旧细分类关键词归并到 `餐饮`、`购物`、`居家`、`生活服务`、`学习办公`、`金融` 等精简分类，旧分类名缺失时系统规则会跳过而不会报错。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过；`http://localhost:8081/budget`、`http://localhost:8081/import`、`http://localhost:8081/bills` 均返回 200。

## 十、2026-06-09 Web 测试端清空账单记录

- 已补齐 Web 测试端“清空所有账单”交互：账单页在 `Platform.OS === "web"` 时不再依赖 React Native `Alert.alert`，改用浏览器 `window.confirm` 确认后调用同一个 `deleteAllRecordRows()` 服务。
- Web 端 `deleteAllRecordRows()` 会清空当前运行内存中的 `webRecords`，不会清空分类、订阅、预算设置，也不会写入 `localStorage`；刷新或重启仍按当前 Web 内存测试策略处理。
- 手机端仍保留原生 `Alert.alert` 确认弹窗，并继续走 SQLite `deleteAllRecords()`。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过；`http://localhost:8081/bills` 返回 200。

## 十、2026-06-09 APK 再落地检查记录

- 本轮按 `android-apk-build` skill 重新执行落地检查，用户要求不插手机验证，因此只做本地构建、签名和包信息校验。
- 已确认 `react@19.2.3`、`react-dom@19.2.3`、`react-native@0.85.3` 版本仍然对齐。
- 已运行原项目 `F:\software\node.js\npm.cmd run typecheck`，通过；已运行原项目 `expo export --platform android`，通过。
- 已检查导入页性能修复：`app/import/index.tsx` 使用 `IMPORT_PREVIEW_PAGE_SIZE = 20`，预览列表通过 `visiblePreviewItems` 分页渲染，并接入 `PageStepper`；导入预览最多保留 `MAX_IMPORT_PREVIEW_ROWS = 1000`，避免手机一次性渲染过多账单。
- 已检查数据库保护：`db/init.ts` 继续保留旧库升级逻辑，先补齐 `records` 导入追溯字段，再创建导入索引；旧 `records` 表如需重建会重命名为 `records_backup_before_import_*` 后复制数据，不直接删除旧表，避免丢失数据库。
- 已兜底修复 Android 原生趋势图 tooltip：Web 端已按点位跟随；原生端本轮改为使用选中点坐标计算 `left/top`，并移除旧的固定 `right/top`，同时保持 `pointerEvents="none"`，避免 tooltip 挡住继续点击折线点。
- 已同步源码到短路径构建目录 `F:\miao_apk_clean`，并复制当前已安装依赖到该目录；短路径目录 `npm run typecheck` 通过，`expo export --platform android` 通过。
- 已使用 JDK `F:\software\jdk-17\jdk-17.0.10+7`、Gradle `F:\software\gradle\gradle-9.3.1`、Android SDK `F:\software\android-sdk`、NDK `27.3.13750724` 执行 `gradle assembleRelease --no-daemon --console=plain`，通过。
- 已更新 APK：`dist/miao-money-release.apk`，大小 `115449428` 字节，SHA256 `0ABBE383A3C100A3D89F7785D808EB9ACEA345CAE39A7DB67208A8D4730644EA`。
- 已执行 `apksigner verify --print-certs dist/miao-money-release.apk`，签名校验通过；当前仍使用 debug keystore 签名，仅用于本地测试和阶段验收。
- APK 包信息：包名 `com.miaomoney.app`，版本 `0.1.0`，`versionCode=1`，`minSdk=24`，`targetSdk=36`，原生 ABI 包含 `arm64-v8a`、`armeabi-v7a`、`x86`、`x86_64`。
- 本轮 ADB 设备列表为空，未安装到手机；手机端导入微信/支付宝、趋势图 tooltip 和退出重进数据保存由用户自行下载 APK 后验证。

## 十一、2026-06-09 分类开关与清空账单修复记录

- 用户反馈手机端预算分配的分类开关数量明显少于 Web 端 39 个分类。根因是手机优先读取已保存预算方案，而保存方案只包含当时开启的分类；重新进入页面时没有再用最新分类模型补齐缺失分类。
- 已新增 `mergeSavedBudgetWithGenerated()`：读取已保存预算时，会先根据当前 39 个支出分类重新生成完整预算模型，再把已保存分类的金额、优先级和建议合并回去；缺失分类会按最新收入档位规则补回开关列表，避免旧保存方案导致手机少分类。
- 已调整预算页加载逻辑：加载旧保存方案时同步恢复预计收入、储蓄比例/目标输入，并将合并后的完整预算用于分类开关和预算列表。
- 已在“我的账单”页面新增“清空所有账单”按钮，按钮带二次确认弹窗；确认后删除本机所有 `records` 账单记录，包括手动、订阅生成和导入账单，但不删除分类、订阅、预算设置和分类知识库。
- 已新增 `deleteAllRecords()` / `deleteAllRecordRows()`，Web 端清空内存账单，Android/iOS 端清空 SQLite `records` 表。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，通过；已运行 Android Hermes bundle 预检，`expo export --platform android` 通过。
- 已重新构建 APK：`dist/miao-money-release.apk`，大小 `115453332` 字节，SHA256 `65AFAA6280F684A8ACF3D991235AA33E36A407288A500AB4EA7012E63AC78343`。
- 已执行 `apksigner verify --print-certs`，签名校验通过；APK 包名仍为 `com.miaomoney.app`，`minSdk=24`，`targetSdk=36`。

## 十二、2026-06-09 预算已用金额刷新记录

- 已修复预算分配页 `已用` 金额不会随账单变化消失的问题：新增 `refreshBudgetSpent()`，每次基于当前月份真实 `records` 重新按分类汇总支出金额，并刷新每个预算分类的 `spentCents` 与超支提示。
- 预算页已监听 `useRecordStore().refreshKey`。删除单笔账单、清空账单、关闭订阅、删除订阅、导入账单或订阅生成账单触发 `requestRecordRefresh()` 后，预算页会自动刷新当前预算的已用金额，不覆盖用户自定义的月预算、分类开关或储蓄设置。
- 已确认订阅管理页关闭/删除订阅会调用 `requestRecordRefresh()`；对应订阅生成账单被删除后，预算页已用金额会跟随归零或下降。
- 已运行 `F:\software\node.js\npm.cmd run typecheck`，TypeScript 类型检查通过；`http://localhost:8081/budget`、`http://localhost:8081/subscriptions`、`http://localhost:8081/bills` 均返回 200。

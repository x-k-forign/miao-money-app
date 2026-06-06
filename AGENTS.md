# miao~记账 项目实施说明

本项目是一个二次元浅蓝主题的手机记账 App，名称为 `miao~记账`，使用 React Native + Expo + TypeScript 开发。第一版以本地可用 MVP 为目标，不包含登录、云同步和云端识别能力，但需要在架构上为后续扩展保留空间。

## 一、实现需求

### 1. 产品目标

- 做一个清爽、可爱、轻量的手机记账 App。
- 用户可以快速记录收入和支出。
- 用户可以查看本月收入、本月支出、本月结余。
- 用户可以分析支出分类占比和支出趋势。
- 用户可以管理每月固定收入和固定支出。
- 用户可以进行常见币种汇率换算。
- 第一版只做本地版，不做登录和云同步。

### 2. 视觉风格

- 整体风格：二次元化、可爱风、轻量。
- 默认主题：浅蓝色。
- UI 元素：圆角卡片、柔和阴影、可爱图标、浅色背景。
- 页面需要保持清爽，不做复杂沉重的金融后台风格。
- 底部导航中间需要有醒目的悬浮加号按钮。
- 后续支持主题换肤，包括浅蓝、樱花粉、薄荷绿、奶油黄、夜间蓝等主题。

### 3. 底部导航

底部导航包含四个主要模块：

1. 我的账单
2. 收支分析
3. 汇率计算
4. 订阅管理

底部导航中间设置一个悬浮加号按钮，用于进入手动添加收支页面。

### 4. 我的账单

需要实现：

- 展示用户收入记录和支出记录。
- 支持按日期或月份查看账单。
- 展示本月收入、本月支出、本月结余。
- 支持删除账单记录。
- 支持编辑账单记录。
- 账单来源分为：
  - 手动添加
  - 订阅自动生成
- 账单列表建议按日期分组展示。
- 每条账单需要展示分类图标、分类名称、备注、金额、日期、来源标签。

### 5. 收支分析

需要实现：

- 统计本月收入。
- 统计本月支出。
- 统计本月结余。
- 展示支出分类占比。
- 展示最近 7 天或最近 30 天支出趋势。
- 支持按照分类查看消费情况。
- 图表颜色和组件样式需要符合浅蓝二次元主题。

### 6. 汇率计算

需要实现：

- 支持常见币种换算：
  - CNY
  - USD
  - EUR
  - JPY
  - HKD
  - GBP
  - KRW
- 用户可以输入金额。
- 用户可以选择原币种和目标币种。
- 用户可以交换原币种和目标币种。
- 调用公开汇率 API 获取汇率。
- 汇率数据按天缓存，避免每次打开都请求。
- 如果当天缓存存在，优先使用缓存。
- 如果请求失败，优先使用最近一次历史缓存。

### 7. 订阅管理

订阅用于每月固定收入或固定支出。

需要实现：

- 添加订阅。
- 编辑订阅。
- 删除订阅。
- 启用或关闭订阅。
- App 每次启动时检查是否需要生成当月固定账单。
- 同一个订阅每个月只能自动生成一次。
- 支持固定支出，例如手机话费、App 会员、房租。
- 支持固定收入，例如工资、补贴。

每条订阅包含：

- 名称
- 类型：收入或支出
- 金额
- 分类
- 每月几号生成
- 是否启用
- 备注

后续扩展需要支持订阅提醒：

- 是否开启提醒
- 提前几天提醒
- 提醒时间
- 同月只提醒一次

### 8. 手动添加收支

需要实现：

- 点击底部悬浮加号进入添加页面。
- 用户可以选择收入或支出。
- 用户可以输入金额。
- 用户可以选择分类。
- 用户可以选择日期。
- 用户可以填写备注。
- 保存后写入本地 SQLite 数据库。
- 保存成功后返回“我的账单”页面并刷新数据。

### 9. 分类

支出分类：

- 餐饮
- 购物
- 交通
- 运动
- 娱乐
- 通讯
- 住房
- 孩子
- 旅行
- 汽车
- 医疗
- 学习
- 宠物
- 礼金
- 维修
- 快递
- 电影
- 日用品
- 化妆品
- 其他

收入分类：

- 工资
- 兼职
- 奖金
- 红包
- 投资
- 退款
- 其他收入

### 10. 数据库需求

第一版至少需要以下数据表：

- `records`：账单表
- `categories`：分类表
- `subscriptions`：订阅表
- `exchange_rates`：汇率缓存表
- `app_settings`：应用设置表，后续用于主题换肤等设置

金额字段建议统一使用整数保存，单位为分，避免浮点误差。

日期建议统一使用 ISO 字符串：

- 日期：`YYYY-MM-DD`
- 月份：`YYYY-MM`
- 时间：ISO datetime string

### 11. 后续扩展功能

后续扩展包括：

- 主题换肤
- 订阅提醒
- 导出 Excel
- 小票识别
- 登录账号进行同步
- 预算提醒
- 多设备同步
- AI 自动分类
- 账单搜索
- 消费日历

扩展优先级建议：

1. 主题换肤
2. 订阅提醒
3. 导出 Excel
4. 登录账号进行同步
5. 小票识别

## 二、使用技术

### 1. 基础技术栈

- React Native：移动端 UI 开发。
- Expo：项目脚手架、调试、构建和原生能力接入。
- TypeScript：类型约束，提升账单、订阅、分类和汇率数据的可靠性。
- Expo Router：文件式路由和页面导航。
- SQLite：本地数据存储。
- Drizzle ORM 或 expo-sqlite：数据库访问。
- Zustand 或 React Context：全局状态管理。
- NativeWind：Tailwind 风格样式。
- react-native-gifted-charts 或 victory-native：图表展示。

### 2. 推荐技术选择

本项目优先使用以下组合：

- Expo + React Native + TypeScript
- Expo Router
- expo-sqlite
- Drizzle ORM
- Zustand
- NativeWind
- react-native-gifted-charts
- Expo Notifications
- expo-file-system
- expo-sharing

选择原因：

- Expo 适合快速构建跨平台 App。
- Expo Router 适合当前四 Tab + 添加页 + 编辑页的页面结构。
- SQLite 适合第一版本地记账数据。
- Drizzle ORM 能提供更清晰的 schema 和类型推导。
- Zustand 简洁，适合管理当前月份、筛选条件、主题和刷新状态。
- NativeWind 能快速统一浅蓝可爱主题。
- react-native-gifted-charts 足够覆盖折线图、柱状图、饼图或环形图。

### 3. 路由结构建议

使用 Expo Router 文件路由：

```text
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    bills.tsx
    analysis.tsx
    exchange.tsx
    subscriptions.tsx
  record/
    new.tsx
    [id]/
      edit.tsx
  subscription/
    new.tsx
    [id]/
      edit.tsx
```

### 4. 项目目录结构建议

```text
app/
components/
  common/
  records/
  analysis/
  exchange/
  subscriptions/
db/
  migrations/
  queries/
services/
stores/
constants/
types/
utils/
hooks/
assets/
  images/
  icons/
drizzle/
```

目录职责：

- `app`：页面和路由。
- `components`：可复用 UI 组件。
- `db`：数据库连接、schema、迁移、查询、分类初始化。
- `services`：业务逻辑，例如账单统计、订阅生成、汇率请求、导出。
- `stores`：Zustand 状态。
- `constants`：分类、币种、主题、图标映射。
- `types`：TypeScript 类型。
- `utils`：日期、金额、校验、ID、订阅日期计算。
- `hooks`：页面数据 hooks。
- `assets`：图片、图标、可爱装饰资源。
- `drizzle`：Drizzle migration 输出。

### 5. 数据库技术约定

优先使用 Drizzle ORM 定义 schema。

如果 Drizzle 接入阻塞，可以先使用 `expo-sqlite` 原生 SQL 完成 MVP，但需要保持：

- 表字段命名稳定。
- 查询封装在 `db/queries`。
- 不要在页面组件里直接写 SQL。
- 金额继续使用整数分。
- 日期继续使用统一字符串格式。

### 6. 状态管理约定

优先使用 Zustand。

建议 store：

- `useRecordStore`：账单列表、当前月份、刷新状态。
- `useAnalysisStore`：分析时间范围、分类筛选。
- `useExchangeStore`：币种、金额、换算结果、汇率缓存状态。
- `useSubscriptionStore`：订阅列表、启用状态。
- `useThemeStore`：当前主题。

数据库中的持久化数据不应只保存在 store 中，store 只负责页面状态和数据刷新。

### 7. 图表技术约定

优先使用 `react-native-gifted-charts`。

图表需要符合主题：

- 使用浅蓝作为主色。
- 分类图表使用柔和多色。
- 避免高饱和、强对比的厚重颜色。
- 图表卡片使用圆角、浅背景、柔和阴影。

### 8. 汇率 API 约定

第一版可以优先使用公开免 key API。

候选：

- ExchangeRate-API open access
- Frankfurter

约定：

- 所有汇率请求封装在 `services/exchangeRateService.ts`。
- 页面组件不能直接调用远程 API。
- 汇率按天缓存到 `exchange_rates`。
- 请求失败时使用最近一次历史缓存。
- 没有缓存且请求失败时，页面展示错误提示。

### 9. 导出 Excel 技术约定

后续导出 Excel 建议使用：

- `xlsx`
- `expo-file-system`
- `expo-sharing`

导出逻辑放在：

```text
services/exportService.ts
utils/excel.ts
```

导出内容至少包括：

- 账单明细
- 月度汇总
- 分类统计
- 订阅账单

### 10. 小票识别技术约定

小票识别属于后期功能。

建议使用：

- `expo-camera`
- `expo-image-picker`
- OCR API 或云端识别服务

识别结果不要直接写入正式账单，应先生成草稿，让用户确认后再保存。

### 11. 登录同步技术约定

登录账号进行同步属于后期功能。

推荐方案：

- Supabase Auth
- Supabase Postgres
- Supabase Storage

后续需要给本地表增加同步字段：

- `user_id`
- `remote_id`
- `sync_status`
- `synced_at`
- `deleted_at`

同步原则：

- 未登录时仍可本地使用。
- 登录后上传本地待同步数据。
- 云端数据拉取后合并到本地 SQLite。
- 网络失败时保留本地数据并稍后重试。

### 12. 开发阶段

按 MVP 顺序实施：

1. 基础 UI 和底部导航
2. 数据库和分类初始化
3. 手动记账
4. 我的账单页面
5. 收支分析
6. 订阅管理
7. 汇率计算
8. UI 美化和测试
9. 主题换肤
10. 订阅提醒
11. 导出 Excel
12. 登录同步
13. 小票识别

### 13. 实施约束

- 不要在第一版引入登录和云同步。
- 不要把业务逻辑直接写在页面组件里。
- 不要在页面中直接写 SQL。
- 不要用浮点数直接保存金额。
- 不要让订阅同月重复生成账单。
- 不要让汇率计算每次打开页面都请求 API。
- UI 需要始终保持浅蓝、可爱、轻量。
- 添加新功能时优先复用现有组件和服务层。

## 三、前端已落地流程与后端对接参考

本阶段前端已经基于 mock 数据完成主要页面体验，后端设计时应优先保持当前前端的数据口径、字段语义和交互流程稳定。后端接口接入时不要迫使页面重做交互结构，应让 mock 数据可以平滑替换为真实服务数据。

### 1. 前端页面工作流

前端实现顺序采用：

1. 先确认页面核心用户任务。
2. 用 mock 数据补齐可交互界面。
3. 统一分类、金额、日期、来源等基础字段。
4. 完成加载态、按钮反馈、页面切换动画和图表交互。
5. 再将 mock 数据替换为服务层请求。

页面组件只负责展示和轻量状态，后续真实数据请求应放入 `services`、`stores` 或 `db/queries`，不要在页面里直接写 SQL 或散落接口调用。

### 2. 后端需要优先保证的数据约定

所有金额继续使用整数分，例如 `amountCents: 12900` 表示 129.00 元。前端展示时再格式化为元，避免浮点误差。

日期字段继续使用稳定字符串：

- 日期：`YYYY-MM-DD`
- 月份：`YYYY-MM`
- 时间：ISO datetime string

账单记录建议返回字段：

```ts
interface RecordDTO {
  id: string;
  type: "income" | "expense";
  amountCents: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  note: string;
  recordDate: string;
  source: "manual" | "subscription";
}
```

订阅记录建议返回字段：

```ts
interface SubscriptionDTO {
  id: string;
  name: string;
  type: "income" | "expense";
  amountCents: number;
  categoryId?: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  dayOfMonth: number;
  enabled: boolean;
  note: string;
  lastGeneratedMonth?: string;
}
```

### 3. 分类与统计口径

支出分类必须包含：

餐饮、购物、交通、运动、娱乐、通讯、住房、孩子、旅行、汽车、医疗、学习、宠物、礼金、维修、快递、电影、日用品、化妆品、其他。

收入分类必须包含：

工资、兼职、奖金、红包、投资、退款、其他。

分类统计按前端当前逻辑：

- 分类占比卡片默认展示 5 行。
- 前 4 行是金额最高的 4 个分类。
- 第 5 行是其余分类汇总为“其他”。
- 下方筛选按钮默认展示前 4 类，第 5 个入口为“更多”选择栏。
- 环形图点击或悬浮某个分段时，需要能显示该分类金额和占比。

后端如提供统计接口，应返回完整分类明细，前端可以继续负责 top4 + 其他的展示聚合；也可以后端额外返回聚合字段，但不能丢失完整分类明细。

### 4. 账单页筛选口径

账单页当前有两种筛选：

- 按月份：范围为最近 12 个月。
- 按日期：范围为当前所选月份内的日期。

后端接口建议支持：

```text
GET /api/records?month=YYYY-MM
GET /api/records?date=YYYY-MM-DD
```

返回结果由前端按 `recordDate` 分组展示。后端默认排序建议为 `recordDate desc, createdAt desc`。

### 5. 分析页统计口径

分析页需要：

- 本月收入
- 本月支出
- 本月结余
- 支出分类占比
- 收入分类占比
- 支出趋势
- 收入趋势

趋势图当前口径：

- 7 天：最近 7 天，按自然日汇总。
- 6 月：最近 6 个月，按自然月汇总。
- 纵坐标为金额，横坐标为日期或月份。

后端接口建议支持：

```text
GET /api/analysis/summary?month=YYYY-MM
GET /api/analysis/category-share?type=income|expense&month=YYYY-MM
GET /api/analysis/trend?type=income|expense&range=7d|6m
```

趋势接口返回建议：

```ts
interface TrendPointDTO {
  label: string;
  date?: string;
  month?: string;
  amountCents: number;
}
```

### 6. 订阅生成规则

订阅自动生成账单时，后端或本地服务层必须保证：

- 同一订阅同一个月份只生成一次账单。
- `dayOfMonth` 范围为 1 到 28。
- 关闭订阅后不再自动生成账单。
- 自动生成账单的 `source` 必须为 `subscription`。
- 建议通过 `lastGeneratedMonth: YYYY-MM` 或生成记录表防止重复。

### 7. 前端交互与服务接入边界

前端已实现的交互应继续保留：

- 按钮按下有缩放反馈。
- 页面进入和切换有轻量动画。
- 加载状态使用统一加载动画。
- 分类、日期、月份等复杂选择使用表单项 + 底部弹窗，不使用让用户困惑的裸横向滑动。
- 图表在 Web 端优先使用原生 SVG，避免 `react-native-svg` 在 Web 下透传非法 DOM 属性。
- 不做声音交互。

服务接入时：

- 页面不要直接拼接 SQL。
- 页面不要直接处理订阅重复生成等核心业务规则。
- 页面可以保留展示聚合逻辑，但持久化、查询、生成账单、汇率缓存应进入服务层。
- mock 数据替换真实接口时，字段名优先兼容当前 `constants/mockData.ts` 的结构。

### 8. 当前 mock 到真实接口的替换建议

第一步先替换只读数据：

1. `GET /api/records` 或本地 `db/queries/records` 替换 `mockRecords`。
2. `GET /api/subscriptions` 替换 `mockSubscriptions`。
3. `GET /api/analysis/*` 替换分析页本地统计。
4. 汇率页接入 `services/exchangeRateService.ts` 的缓存逻辑。

第二步再接入写操作：

1. 新增账单。
2. 编辑账单。
3. 删除账单。
4. 新增订阅。
5. 编辑订阅。
6. 删除订阅。
7. 启用或关闭订阅。

写操作成功后，页面应刷新对应 store 或 query，不依赖手动刷新。

## 四、后端本地服务层实施记录

本阶段已开始正式接入本地后端能力，目标是让前端 mock 页面平滑切换到 `services` + `db/queries` + SQLite 的本地数据链路。当前仍然保持第一版本地 MVP，不引入登录、云同步和云端识别。

### 1. 当前后端分层

- `db/schema.ts`：使用 Drizzle 定义 `categories`、`records`、`subscriptions`、`exchange_rates`、`app_settings` 表。
- `db/init.ts`：App 原生端启动时创建表和索引，并开启 `PRAGMA foreign_keys = ON`。
- `db/seedCategories.ts`：写入系统默认分类，重复启动通过 `onConflictDoNothing` 避免重复插入。
- `db/queries/*`：只放数据库查询和写入，不放页面展示逻辑。
- `services/*`：放业务规则、DTO 转换、统计、订阅生成、汇率缓存等逻辑。
- `stores/*`：只负责页面状态和刷新信号，不保存数据库持久数据。

### 2. 已落地服务入口

- `services/categoryService.ts`
  - `getCategories(kind?)`：返回分类 DTO，供表单和统计使用。
- `services/recordService.ts`
  - `addManualRecord(input)`：新增手动账单，自动写入 `source: "manual"` 和 `recordMonth`。
  - `updateManualRecord(id, input)`：编辑账单。
  - `deleteRecordById(id)`：删除单笔账单。
  - `getMonthlyRecords(month)`：按 `YYYY-MM` 查询账单 DTO。
  - `getRecordsByDate(date)`：按 `YYYY-MM-DD` 查询账单 DTO。
  - `getRecordById(id)`：编辑页读取单笔账单。
- `services/analysisService.ts`
  - `getMonthlySummary(month?)`：返回本月收入、支出、结余。
  - `getCategoryShare(type, month?)`：返回完整分类明细，前端继续负责 top4 + 其他聚合展示。
  - `getTrend(type, "7d" | "6m")`：返回最近 7 天或最近 6 个月趋势点。
- `services/subscriptionService.ts`
  - `addSubscription(input)`、`updateSubscriptionById(id, input)`、`deleteSubscriptionById(id)`。
  - `toggleSubscriptionEnabled(id, enabled)`：启用或关闭订阅。
  - `getSubscriptions()`、`getSubscriptionById(id)`。
  - `generateDueSubscriptionRecords(month?)`：App 启动时生成到期订阅账单。
- `services/exchangeRateService.ts`
  - `getExchangeRate(base, target)`。
  - `getExchangeRateDetail(base, target)`：返回汇率、汇率日期和来源。

### 3. DTO 字段约定

服务层对页面返回 DTO，不直接暴露数据库字段命名。

- 账单继续返回 `RecordDTO`：`id`、`type`、`amountCents`、`categoryId`、`categoryName`、`categoryIcon`、`categoryColor`、`note`、`recordDate`、`source`。
- 订阅继续返回 `SubscriptionDTO`：`id`、`name`、`type`、`amountCents`、`categoryId`、`categoryName`、`categoryIcon`、`categoryColor`、`dayOfMonth`、`enabled`、`note`、`lastGeneratedMonth`。
- 统计继续返回完整分类明细，不能为了前端 top4 展示丢失原始分类。
- 金额字段一律使用整数分 `amountCents`。
- 日期继续使用本地日期字符串：日期 `YYYY-MM-DD`，月份 `YYYY-MM`，时间 ISO datetime string。

### 4. 订阅生成规则

`generateDueSubscriptionRecords()` 必须由服务层执行，页面不能自行生成订阅账单。

- 只处理 `enabled: true` 的订阅。
- `dayOfMonth` 必须保持 1 到 28。
- 当订阅生成日小于或等于当前日期，并且订阅处于开启状态时，必须同步生成或更新“我的账单”中的当前月自动账单。
- 当订阅生成日大于当前日期时，不提前生成账单；等 App 启动或服务层同步时发现日期已到，再生成账单。
- 当订阅关闭、删除，或编辑后生成日变为大于当前日期时，必须同步撤销当前月由该订阅生成的自动账单。
- 删除订阅时，当前月自动账单需要撤销；历史自动账单保留，但需要解除 `subscriptionId` 外键引用，避免 SQLite 阻止订阅删除。
- 生成账单时 `source` 必须为 `subscription`，并写入 `subscriptionId`。
- 同步生成成功后更新 `lastGeneratedMonth`；同步撤销当前月自动账单后清空当前月的 `lastGeneratedMonth` 标记。
- 原生 SQLite 端还会检查同一 `subscriptionId` + `recordMonth` + `source: "subscription"` 是否已存在，避免重复生成。
- 订阅新增、编辑、启用、关闭、删除后都必须刷新订阅列表和账单列表，不依赖用户手动刷新。

### 5. 汇率缓存规则

汇率请求只允许通过 `services/exchangeRateService.ts`。

- 原生端先查当天 `exchange_rates` 缓存。
- 当天缓存不存在时请求 Frankfurter。
- 请求成功后写入 `exchange_rates`，唯一键为 `base_currency + target_currency + rate_date`。
- 请求失败时使用最近一次历史缓存。
- 没有缓存且请求失败时抛出错误，由页面展示或记录错误。
- Web 调试端使用 mock 汇率 fallback，避免 Expo Web 下 SQLite 初始化差异影响页面调试。

### 6. 前端接入状态

当前这些页面已经从直接 mock 切换到服务层：

- `app/(tabs)/bills.tsx`：读取、删除账单走 `recordService`。
- `app/record/new.tsx`：新增账单走 `recordService`。
- `app/record/[id]/edit.tsx`：读取和编辑账单走 `recordService`。
- `app/(tabs)/analysis.tsx`：摘要、分类占比、趋势走 `analysisService`。
- `app/(tabs)/subscriptions.tsx`：读取、启停、删除订阅走 `subscriptionService`。
- `app/subscription/new.tsx`：新增订阅走 `subscriptionService`。
- `app/subscription/[id]/edit.tsx`：读取和编辑订阅走 `subscriptionService`。
- `app/(tabs)/exchange.tsx`：汇率换算和常见币种表走 `exchangeRateService`。

### 7. Web fallback 约定

Expo Web 主要用于页面调试。由于当前第一版真实持久化目标是移动端 SQLite，服务层在 `Platform.OS === "web"` 时保留内存 fallback：

- 页面代码仍然只调用 `services/*`。
- Web fallback 只能用于调试交互，不作为真实持久化依据。
- 后续如果要做 Web 持久化，应新增明确的 Web 存储适配器，不要把页面改回 mock。

### 8. 验证记录

本阶段已执行：

- `npm.cmd run typecheck`：通过。
- `npm.cmd run web`：Metro 能启动到 `http://localhost:8081`。
- 请求 Expo Router 入口 bundle：HTTP 200，bundle 可生成。

已知非业务警告：

- Expo 启动时可能出现 React Native DevTools 最新版本安装失败并回退到 fallback 的提示，原因是本机 dotslash 缓存目录创建冲突；不影响应用打包和运行。

## 五、数据库设计分支实施记录

本阶段由数据库设计分支完成本地 SQLite 设计加固，目标是在不改变前后端 DTO、页面交互和服务层入口的前提下，为 MVP 的账单、订阅、分类、汇率缓存和设置表补齐数据库级兜底。

### 1. Schema 加固

- `db/schema.ts` 继续作为 Drizzle schema 的唯一结构定义来源。
- `categories` 增加 `kind + name` 唯一索引，避免同类型分类重名；增加 `kind + sort_order` 索引用于分类列表排序。
- `records` 增加月份、日期、分类月份、订阅月份等查询索引，覆盖账单页、分析页和订阅自动账单同步路径。
- `records` 增加部分唯一索引 `records_subscription_month_unique_idx`，仅约束 `source = 'subscription'` 且 `subscription_id IS NOT NULL` 的记录，保证同一订阅同一月份只能生成一条自动账单，不影响手动账单。
- `records.subscription_id` 在新建数据库中使用 `ON DELETE SET NULL`，删除订阅时历史自动账单可保留并解除外键引用。
- `subscriptions` 增加 `enabled + day_of_month` 和 `category_id` 索引，支撑启动时订阅检查和分类关联查询。
- `exchange_rates` 保留 `base_currency + target_currency + rate_date` 唯一索引，并增加同字段普通索引用于最近历史缓存查询。
- `app_settings` 保留 key-value 结构，为主题换肤等后续设置继续留扩展空间。

### 2. 数据合法性约束

新建 SQLite 数据库时，`db/init.ts` 会按以下规则创建 `CHECK` 约束：

- 类型字段只允许 `income` 或 `expense`。
- 账单来源只允许 `manual` 或 `subscription`。
- 金额字段必须大于 0，继续使用整数分。
- 订阅生成日限制在 1 到 28。
- 布尔字段限制在 0 或 1。
- 账单 `record_month` 必须等于 `record_date` 的前 7 位。
- 自动订阅账单必须带 `subscription_id`。
- 汇率币种限制为 MVP 支持的 CNY、USD、EUR、JPY、HKD、GBP、KRW，汇率必须大于 0，且不缓存相同币种兑换。

### 3. 初始化与迁移约定

- `db/init.ts` 已同步 schema 的建表约束和索引，原生端首次启动创建的 `miao_money.db` 会直接具备完整结构。
- `drizzle/0001_perpetual_christian_walker.sql` 只保留安全的追加索引语句，不做 SQLite 搬表、`DROP TABLE` 或批量重建，避免破坏已有本地数据。
- Drizzle 生成的 snapshot 保留完整目标结构；如果后续需要把已有本地库升级到完整 `CHECK` 约束，应新增显式、可备份的数据迁移流程，不在普通启动流程里自动搬表。

### 4. 查询层调整

- `db/queries/records.ts` 增加 `upsertSubscriptionRecord(input)`，基于 `records_subscription_month_unique_idx` 执行订阅自动账单 upsert。
- `services/recordService.ts` 的订阅账单同步改为调用数据库 upsert，不再依赖“先查再插入”的非原子流程。
- Web fallback 的页面交互逻辑保持不变，仍然不把持久化数据保存在 store 中。

### 5. Web 调试适配

- 新增 `db/client.web.ts`，Web bundle 解析到 `db/queries/*` 时不再引入 `expo-sqlite` 的 Web worker 和 wasm 路径。
- Web 端数据库查询如果被误调用会抛出明确错误，正常页面调试仍应走 `services/*` 中的内存 fallback。
- 该适配修复了 Expo Web bundle 中 `Unable to resolve "./wa-sqlite/wa-sqlite.wasm"` 的问题。

### 6. 验证记录

本阶段已执行：

- `npm.cmd run drizzle:generate`：成功生成 `0001` 迁移文件；随后将迁移 SQL 收敛为非破坏性的索引迁移。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run web -- --localhost --port 8090`：Metro 能启动到 `http://localhost:8090`。
- 受控启动 `http://localhost:8092` 后请求 Web 入口：HTTP 200。
- 请求 Expo Router entry bundle：HTTP 200，bundle 长度约 10 MB。

已知非业务提示：

- Expo 启动时仍可能出现 React Native DevTools dotslash fallback 提示，和本次数据库设计无关，不影响 Metro 编译和页面运行。

## 六、APK 落地阶段实施记录

本阶段目标是把当前 MVP 项目推进到 Android 手机可安装运行的 APK 形态，并整理后续真机测试重点。iOS 构建本阶段已取消；当前开发机为 Windows 环境，不做本地 iOS 构建。

### 1. 已完成事项

- 已生成手机桌面图标素材：
  - `assets/images/app-icon.png`
  - `assets/images/adaptive-icon.png`
- `app.json` 已配置应用图标、Android adaptive icon 和正式包名：
  - Android package：`com.miaomoney.app`
- 已生成 Android 原生工程：
  - `android/`
- 已配置本地 Android SDK：
  - SDK：`F:/software/android-sdk`
  - Gradle：`F:/software/gradle/gradle-9.3.1`
  - JDK：`F:/software/jdk-17/jdk-17.0.10+7`
  - NDK：使用已安装的 `27.3.13750724`
- 已在短路径项目副本 `F:/miao_apk_build` 下完成构建，避免 Windows CMake 路径超过 260 字符。
- 已产出 APK 并复制回当前项目：
  - `dist/miao-money-debug.apk`
  - `dist/miao-money-release.apk`
- `dist/miao-money-release.apk` 已通过 `apksigner verify --print-certs` 签名校验。

### 2. 当前 APK 说明

- 推荐安装测试文件：`dist/miao-money-release.apk`。
- 当前 release APK 使用 Android debug keystore 签名，仅适合本地测试和阶段验收。
- 后续正式发布前必须创建独立 release keystore，并切换 `android/app/build.gradle` 的 release 签名配置。
- `dist/miao-money-debug.apk` 主要用于开发调试，不建议作为普通手机安装验收包。

### 3. 已完成验证

- `F:/miao_apk_build` 下执行 `npm run typecheck`：通过。
- `gradle assembleDebug --no-daemon`：通过，生成 debug APK。
- `gradle assembleRelease --no-daemon`：通过，生成 release APK。
- `apksigner verify --print-certs dist/miao-money-release.apk`：通过。
- 2026-06-06 华为 HBN-AL80 / 鸿蒙 4.2 真机通过 ADB 识别为 Android 12 / API 31，ABI 为 `arm64-v8a`。
- 修复真机启动闪退：`react-native@0.85.3` 内置 renderer 为 `19.2.3`，项目原先使用 `react@19.2.7` / `react-dom@19.2.7`，导致 release APK 启动时报 `Incompatible React versions`。已将 `react` 和 `react-dom` 固定为 `19.2.3`，重新构建并覆盖安装。
- 新版 `dist/miao-money-release.apk` 已在真机安装成功，ADB 启动后未再出现 `FATAL EXCEPTION`、`Incompatible React versions` 或 `Cannot read property 'default' of undefined`，前台 Activity 为 `com.miaomoney.app/.MainActivity`。

### 4. 尚未完成的真机验证

当前已完成真机安装与启动验证，以下需要继续在手机上进行数据持久化回归：

- 新增一条支出和一条收入。
- 退出 App 后重新进入，检查账单记录是否仍存在。
- 删除账单后重新进入，检查删除状态是否持久化。
- 新增订阅并重启 App，检查当月订阅账单是否只生成一次。

下一阶段必须优先完成以上真机数据回归测试。

### 5. 下一阶段重点

1. 真机安装与持久化回归：验证进入、退出、重启后的账单、订阅和汇率缓存数据。
2. 正式签名配置：新增 release keystore，替换 debug 签名，生成可长期分发的 APK。
3. UI 文案编码巡检：确认所有中文在真机端显示正常，避免终端乱码影响实际文件内容判断。
4. 订阅管理回归：重点验证启用、关闭、删除订阅时自动账单同步和撤销逻辑。
5. 汇率计算回归：验证当天缓存、历史 fallback 和无缓存失败提示。
6. 导出 Excel 前置设计：在本地数据稳定后进入下一扩展功能。

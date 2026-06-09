import type { CurrencyCode, RecordSource, RecordType } from "@/types/models";

export interface MockCategory {
  id: string;
  name: string;
  kind: RecordType;
  icon: string;
  color: string;
}

export interface MockRecord {
  id: string;
  type: RecordType;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  note: string;
  recordDate: string;
  source: RecordSource;
}

export interface MockSubscription {
  id: string;
  name: string;
  type: RecordType;
  amountCents: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  dayOfMonth: number;
  enabled: boolean;
  note: string;
}

export const mockExpenseCategories: MockCategory[] = [
  { id: "food", name: "餐饮", kind: "expense", icon: "utensils", color: "#72C8F3" },
  { id: "shopping", name: "购物", kind: "expense", icon: "bag", color: "#FFB8D2" },
  { id: "traffic", name: "交通", kind: "expense", icon: "bus", color: "#BDEDD8" },
  { id: "car", name: "汽车", kind: "expense", icon: "car", color: "#72C8F3" },
  { id: "home", name: "居家", kind: "expense", icon: "home", color: "#FFE8A9" },
  { id: "communication-subscription", name: "通讯订阅", kind: "expense", icon: "phone", color: "#9ED9FF" },
  { id: "medical", name: "医疗", kind: "expense", icon: "heart", color: "#FFB8D2" },
  { id: "study-office", name: "学习办公", kind: "expense", icon: "book", color: "#C9B7FF" },
  { id: "entertainment", name: "娱乐", kind: "expense", icon: "ticket", color: "#C9B7FF" },
  { id: "travel", name: "旅行", kind: "expense", icon: "plane", color: "#BDEDD8" },
  { id: "family-pet", name: "家庭宠物", kind: "expense", icon: "baby", color: "#FFC7A8" },
  { id: "social", name: "社交", kind: "expense", icon: "gift", color: "#FFE8A9" },
  { id: "finance", name: "金融", kind: "expense", icon: "refresh", color: "#9ED9FF" },
  { id: "lifestyle", name: "生活服务", kind: "expense", icon: "sparkles", color: "#BDEDD8" },
  { id: "donation", name: "公益", kind: "expense", icon: "heart", color: "#BDEDD8" },
  { id: "other", name: "其他", kind: "expense", icon: "more", color: "#FFC7A8" }
];

export const mockIncomeCategories: MockCategory[] = [
  { id: "salary", name: "工资", kind: "income", icon: "wallet", color: "#72C8F3" },
  { id: "parttime", name: "兼职", kind: "income", icon: "briefcase", color: "#BDEDD8" },
  { id: "bonus", name: "奖金", kind: "income", icon: "sparkles", color: "#FFB8D2" },
  { id: "redpacket", name: "红包", kind: "income", icon: "gift", color: "#FFE8A9" },
  { id: "investment", name: "投资", kind: "income", icon: "trending", color: "#C9B7FF" },
  { id: "refund", name: "退款", kind: "income", icon: "refresh", color: "#9ED9FF" },
  { id: "resale", name: "二手转卖", kind: "income", icon: "bag", color: "#BDEDD8" },
  { id: "collection", name: "收款", kind: "income", icon: "wallet", color: "#72C8F3" },
  { id: "other-income", name: "其他", kind: "income", icon: "more", color: "#FFC7A8" }
];

export const mockRecords: MockRecord[] = [
  {
    id: "r-001",
    type: "expense",
    amountCents: 3680,
    categoryId: "food",
    categoryName: "餐饮",
    categoryIcon: "utensils",
    categoryColor: "#72C8F3",
    note: "午餐便当",
    recordDate: "2026-06-06",
    source: "manual"
  },
  {
    id: "r-002",
    type: "expense",
    amountCents: 12900,
    categoryId: "shopping",
    categoryName: "购物",
    categoryIcon: "bag",
    categoryColor: "#FFB8D2",
    note: "夏日小裙子",
    recordDate: "2026-06-06",
    source: "manual"
  },
  {
    id: "r-003",
    type: "income",
    amountCents: 1280000,
    categoryId: "salary",
    categoryName: "工资",
    categoryIcon: "wallet",
    categoryColor: "#72C8F3",
    note: "六月工资",
    recordDate: "2026-06-05",
    source: "subscription"
  },
  {
    id: "r-006",
    type: "income",
    amountCents: 86000,
    categoryId: "bonus",
    categoryName: "奖金",
    categoryIcon: "sparkles",
    categoryColor: "#FFB8D2",
    note: "项目奖金",
    recordDate: "2026-06-03",
    source: "manual"
  },
  {
    id: "r-007",
    type: "income",
    amountCents: 120000,
    categoryId: "parttime",
    categoryName: "兼职",
    categoryIcon: "briefcase",
    categoryColor: "#BDEDD8",
    note: "周末兼职",
    recordDate: "2026-06-02",
    source: "manual"
  },
  {
    id: "r-004",
    type: "expense",
    amountCents: 8600,
    categoryId: "traffic",
    categoryName: "交通",
    categoryIcon: "bus",
    categoryColor: "#BDEDD8",
    note: "地铁充值",
    recordDate: "2026-06-04",
    source: "manual"
  },
  {
    id: "r-005",
    type: "expense",
    amountCents: 360000,
    categoryId: "home",
    categoryName: "居家",
    categoryIcon: "home",
    categoryColor: "#FFE8A9",
    note: "房租",
    recordDate: "2026-06-01",
    source: "subscription"
  }
];

export const mockSubscriptions: MockSubscription[] = [
  {
    id: "s-001",
    name: "工资入账",
    type: "income",
    amountCents: 1280000,
    categoryName: "工资",
    categoryIcon: "wallet",
    categoryColor: "#72C8F3",
    dayOfMonth: 5,
    enabled: true,
    note: "每月 5 日自动记入"
  },
  {
    id: "s-002",
    name: "房租",
    type: "expense",
    amountCents: 360000,
    categoryName: "居家",
    categoryIcon: "home",
    categoryColor: "#FFE8A9",
    dayOfMonth: 1,
    enabled: true,
    note: "同月只生成一次"
  },
  {
    id: "s-003",
    name: "视频会员",
    type: "expense",
    amountCents: 1900,
    categoryName: "娱乐",
    categoryIcon: "ticket",
    categoryColor: "#C9B7FF",
    dayOfMonth: 18,
    enabled: false,
    note: "暂停后不会生成账单"
  }
];

export const mockTrend = [
  { label: "05/31", value: 76 },
  { label: "06/01", value: 214 },
  { label: "06/02", value: 52 },
  { label: "06/03", value: 188 },
  { label: "06/04", value: 86 },
  { label: "06/05", value: 46 },
  { label: "06/06", value: 166 }
];

export const mockIncomeTrend = [
  { label: "05/31", value: 0 },
  { label: "06/01", value: 0 },
  { label: "06/02", value: 1200 },
  { label: "06/03", value: 860 },
  { label: "06/04", value: 0 },
  { label: "06/05", value: 12800 },
  { label: "06/06", value: 0 }
];

export const mockExchangeRates: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 7.24,
  EUR: 7.88,
  JPY: 0.046,
  HKD: 0.93,
  GBP: 9.29,
  KRW: 0.0053
};

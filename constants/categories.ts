import type { CategorySeed } from "@/types/models";

const expenseNames = [
  "餐饮",
  "购物",
  "交通",
  "运动",
  "娱乐",
  "通讯",
  "住房",
  "孩子",
  "旅行",
  "汽车",
  "医疗",
  "学习",
  "宠物",
  "礼金",
  "维修",
  "快递",
  "电影",
  "日用品",
  "化妆品",
  "其他"
];

const incomeNames = ["工资", "兼职", "奖金", "红包", "投资", "退款", "其他收入"];

const palette = [
  "#72C8F3",
  "#FFB8D2",
  "#BDEDD8",
  "#FFE8A9",
  "#C9B7FF",
  "#9ED9FF",
  "#FFC7A8"
];

const expenseIcons = [
  "utensils",
  "bag",
  "bus",
  "dumbbell",
  "ticket",
  "phone",
  "home",
  "baby",
  "plane",
  "car",
  "heart",
  "book",
  "paw",
  "gift",
  "wrench",
  "package",
  "film",
  "sparkles",
  "palette",
  "more"
];

export const defaultCategories: CategorySeed[] = [
  ...expenseNames.map((name, index) => ({
    id: `expense-${index + 1}`,
    name,
    kind: "expense" as const,
    icon: expenseIcons[index] ?? "sparkles",
    color: palette[index % palette.length],
    sortOrder: index + 1
  })),
  ...incomeNames.map((name, index) => ({
    id: `income-${index + 1}`,
    name,
    kind: "income" as const,
    icon: index === 0 ? "wallet" : "sparkles",
    color: palette[index % palette.length],
    sortOrder: index + 1
  }))
];

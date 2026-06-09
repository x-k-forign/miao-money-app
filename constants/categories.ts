import type { CategorySeed } from "@/types/models";

export const defaultCategories: CategorySeed[] = [
  { id: "expense-1", name: "餐饮", kind: "expense", icon: "utensils", color: "#72C8F3", sortOrder: 1 },
  { id: "expense-2", name: "购物", kind: "expense", icon: "bag", color: "#FFB8D2", sortOrder: 2 },
  { id: "expense-3", name: "交通", kind: "expense", icon: "bus", color: "#BDEDD8", sortOrder: 3 },
  { id: "expense-10", name: "汽车", kind: "expense", icon: "car", color: "#72C8F3", sortOrder: 4 },
  { id: "expense-7", name: "居家", kind: "expense", icon: "home", color: "#FFE8A9", sortOrder: 5 },
  { id: "expense-6", name: "通讯订阅", kind: "expense", icon: "phone", color: "#9ED9FF", sortOrder: 6 },
  { id: "expense-11", name: "医疗", kind: "expense", icon: "heart", color: "#FFB8D2", sortOrder: 7 },
  { id: "expense-12", name: "学习办公", kind: "expense", icon: "book", color: "#C9B7FF", sortOrder: 8 },
  { id: "expense-5", name: "娱乐", kind: "expense", icon: "ticket", color: "#C9B7FF", sortOrder: 9 },
  { id: "expense-9", name: "旅行", kind: "expense", icon: "plane", color: "#BDEDD8", sortOrder: 10 },
  { id: "expense-8", name: "家庭宠物", kind: "expense", icon: "baby", color: "#FFC7A8", sortOrder: 11 },
  { id: "expense-14", name: "社交", kind: "expense", icon: "gift", color: "#FFE8A9", sortOrder: 12 },
  { id: "expense-credit", name: "金融", kind: "expense", icon: "refresh", color: "#9ED9FF", sortOrder: 13 },
  { id: "expense-lifestyle", name: "生活服务", kind: "expense", icon: "sparkles", color: "#BDEDD8", sortOrder: 14 },
  { id: "expense-donation", name: "公益", kind: "expense", icon: "heart", color: "#BDEDD8", sortOrder: 15 },
  { id: "expense-20", name: "其他", kind: "expense", icon: "more", color: "#FFC7A8", sortOrder: 16 },
  { id: "income-1", name: "工资", kind: "income", icon: "wallet", color: "#72C8F3", sortOrder: 1 },
  { id: "income-2", name: "兼职", kind: "income", icon: "briefcase", color: "#BDEDD8", sortOrder: 2 },
  { id: "income-3", name: "奖金", kind: "income", icon: "sparkles", color: "#FFB8D2", sortOrder: 3 },
  { id: "income-4", name: "红包", kind: "income", icon: "gift", color: "#FFE8A9", sortOrder: 4 },
  { id: "income-5", name: "投资", kind: "income", icon: "trending", color: "#C9B7FF", sortOrder: 5 },
  { id: "income-6", name: "退款", kind: "income", icon: "refresh", color: "#9ED9FF", sortOrder: 6 },
  { id: "income-resale", name: "二手转卖", kind: "income", icon: "bag", color: "#BDEDD8", sortOrder: 7 },
  { id: "income-collection", name: "收款", kind: "income", icon: "wallet", color: "#72C8F3", sortOrder: 8 },
  { id: "income-7", name: "其他", kind: "income", icon: "more", color: "#FFC7A8", sortOrder: 9 }
];

export const activeDefaultCategoryIds = defaultCategories.map((category) => category.id);

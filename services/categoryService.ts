import { Platform } from "react-native";
import { mockExpenseCategories, mockIncomeCategories } from "@/constants/mockData";
import type { CategoryDTO, CategoryKind } from "@/types/models";

const webCategories: CategoryDTO[] = [...mockExpenseCategories, ...mockIncomeCategories].map((category, index) => ({
  ...category,
  kind: category.kind,
  sortOrder: index + 1
}));

export async function getCategories(kind?: CategoryKind): Promise<CategoryDTO[]> {
  if (Platform.OS === "web") {
    return webCategories.filter((category) => !kind || category.kind === kind);
  }

  await ensureNativeDatabaseReady();
  const { listCategories } = await import("@/db/queries/categories");
  const categories = await listCategories(kind);

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind,
    icon: category.icon,
    color: category.color,
    sortOrder: category.sortOrder
  }));
}

async function ensureNativeDatabaseReady(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const { initializeDatabase } = await import("@/db/init");
  await initializeDatabase();
}

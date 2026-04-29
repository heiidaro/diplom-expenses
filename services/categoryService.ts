import {
  CATEGORIES_COL_ID,
  DB_ID,
  ID,
  Query,
  databases,
} from "../lib/appwrite";
import { Category } from "../types/models";

const DEFAULT_CATEGORIES = [
  {
    name: "Продукты",
    color: "#FF6B35",
  },
  {
    name: "Транспорт",
    color: "#3B82F6",
  },
  {
    name: "Здоровье",
    color: "#22C55E",
  },
  {
    name: "Развлечения",
    color: "#A855F7",
  },
  {
    name: "Другое",
    color: "#9CA3AF",
  },
];

export async function createDefaultCategories(userId: string): Promise<Category[]> {
  const createdCategories: Category[] = [];

  for (const category of DEFAULT_CATEGORIES) {
    const created = await databases.createDocument(
      DB_ID,
      CATEGORIES_COL_ID,
      ID.unique(),
      {
        userId,
        name: category.name,
        color: category.color,
        isDefault: true,
      }
    );

    createdCategories.push(created as unknown as Category);
  }

  return createdCategories;
}

export async function getUserCategories(userId: string): Promise<Category[]> {
  const response = await databases.listDocuments(DB_ID, CATEGORIES_COL_ID, [
    Query.equal("userId", userId),
    Query.limit(100),
  ]);

  let categories = response.documents as unknown as Category[];

  if (categories.length === 0) {
    categories = await createDefaultCategories(userId);
  }

  return categories;
}

export async function createCategory(data: {
  userId: string;
  name: string;
  color: string;
}): Promise<Category> {
  const created = await databases.createDocument(
    DB_ID,
    CATEGORIES_COL_ID,
    ID.unique(),
    {
      userId: data.userId,
      name: data.name,
      color: data.color,
      isDefault: false,
    }
  );

  return created as unknown as Category;
}

export async function updateCategory(data: {
  categoryId: string;
  name: string;
  color: string;
}): Promise<Category> {
  const updated = await databases.updateDocument(
    DB_ID,
    CATEGORIES_COL_ID,
    data.categoryId,
    {
      name: data.name,
      color: data.color,
    }
  );

  return updated as unknown as Category;
}

export async function deleteCategory(categoryId: string) {
  return databases.deleteDocument(DB_ID, CATEGORIES_COL_ID, categoryId);
}

export function getCategoryName(
  categories: Category[],
  categoryId?: string
): string {
  if (!categoryId) {
    return "Без категории";
  }

  const category = categories.find((item) => item.$id === categoryId);

  return category?.name || "Без категории";
}

export function getCategoryColor(
  categories: Category[],
  categoryId?: string
): string {
  if (!categoryId) {
    return "#9CA3AF";
  }

  const category = categories.find((item) => item.$id === categoryId);

  return category?.color || "#9CA3AF";
}
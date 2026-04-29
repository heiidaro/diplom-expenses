import {
  CATEGORY_RULES_COL_ID,
  DB_ID,
  ID,
  Query,
  databases,
} from "../lib/appwrite";
import { CategoryRule } from "../types/models";

function normalizeText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function extractKeyword(value: string): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  const words = normalized
    .split(" ")
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length >= 3);

  if (words.length === 0) {
    return normalized.slice(0, 40);
  }

  return words[0].slice(0, 40);
}

export async function getUserCategoryRules(
  userId: string
): Promise<CategoryRule[]> {
  const response = await databases.listDocuments(DB_ID, CATEGORY_RULES_COL_ID, [
    Query.equal("userId", userId),
    Query.limit(200),
  ]);

  return response.documents as unknown as CategoryRule[];
}

export async function findCategoryByText(data: {
  userId: string;
  text: string;
}): Promise<string | null> {
  const normalizedText = normalizeText(data.text);

  if (!normalizedText) {
    return null;
  }

  const rules = await getUserCategoryRules(data.userId);

  const matchedRule = rules.find((rule) => {
    const keyword = normalizeText(rule.keyword);

    if (!keyword) {
      return false;
    }

    return normalizedText.includes(keyword);
  });

  if (!matchedRule) {
    return null;
  }

  await databases.updateDocument(
    DB_ID,
    CATEGORY_RULES_COL_ID,
    matchedRule.$id,
    {
      usageCount: Number(matchedRule.usageCount || 0) + 1,
      lastUsedAt: new Date().toISOString(),
    }
  );

  return matchedRule.categoryId;
}

export async function saveCategoryRuleFromText(data: {
  userId: string;
  text: string;
  categoryId: string;
}) {
  const keyword = extractKeyword(data.text);

  if (!keyword || !data.categoryId) {
    return null;
  }

  const response = await databases.listDocuments(DB_ID, CATEGORY_RULES_COL_ID, [
    Query.equal("userId", data.userId),
    Query.equal("keyword", keyword),
    Query.limit(1),
  ]);

  const existingRule = response.documents[0] as unknown as
    | CategoryRule
    | undefined;

  if (existingRule) {
    return databases.updateDocument(
      DB_ID,
      CATEGORY_RULES_COL_ID,
      existingRule.$id,
      {
        categoryId: data.categoryId,
        source: "user_correction",
        usageCount: Number(existingRule.usageCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
      }
    );
  }

  return databases.createDocument(DB_ID, CATEGORY_RULES_COL_ID, ID.unique(), {
    userId: data.userId,
    keyword,
    categoryId: data.categoryId,
    source: "user_correction",
    usageCount: 1,
    lastUsedAt: new Date().toISOString(),
  });
}

export async function deleteCategoryRule(ruleId: string) {
  return databases.deleteDocument(DB_ID, CATEGORY_RULES_COL_ID, ruleId);
}
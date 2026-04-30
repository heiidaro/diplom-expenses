import {
  DB_ID,
  ID,
  Query,
  SPENDING_GOALS_COL_ID,
  databases,
} from "../lib/appwrite";
import { SpendingGoal } from "../types/models";

type CreateSpendingGoalData = {
  userId: string;
  title: string;
  limitAmount: number;
  periodType: "month" | "year" | "custom";
  startDate: string;
  endDate: string;
  isActive?: boolean;
  notifyAtPercent?: number;
};

type UpdateSpendingGoalData = Partial<CreateSpendingGoalData>;

export async function createSpendingGoal(
  data: CreateSpendingGoalData
): Promise<SpendingGoal> {
  const created = await databases.createDocument(
    DB_ID,
    SPENDING_GOALS_COL_ID,
    ID.unique(),
    {
      userId: data.userId,
      title: data.title,
      limitAmount: data.limitAmount,
      periodType: data.periodType,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive ?? true,
      notifyAtPercent: data.notifyAtPercent ?? 80,
    }
  );

  return created as unknown as SpendingGoal;
}

export async function getUserSpendingGoals(
  userId: string
): Promise<SpendingGoal[]> {
  const response = await databases.listDocuments(
    DB_ID,
    SPENDING_GOALS_COL_ID,
    [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]
  );

  return response.documents as unknown as SpendingGoal[];
}

export async function updateSpendingGoal(
  goalId: string,
  data: UpdateSpendingGoalData
): Promise<SpendingGoal> {
  const updated = await databases.updateDocument(
    DB_ID,
    SPENDING_GOALS_COL_ID,
    goalId,
    data
  );

  return updated as unknown as SpendingGoal;
}

export async function deleteSpendingGoal(goalId: string) {
  return databases.deleteDocument(DB_ID, SPENDING_GOALS_COL_ID, goalId);
}
import {
  DB_ID,
  EXPENSES_COL_ID,
  ID,
  Query,
  RECURRING_EXPENSES_COL_ID,
  databases,
} from "../lib/appwrite";
import { RecurringExpense } from "../types/models";

interface CreateRecurringExpenseData {
  userId: string;
  title: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
}

interface UpdateRecurringExpenseData {
  recurringId: string;
  title: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
  isActive: boolean;
}

function getNextMonthlyDate(dayOfMonth: number, fromDate = new Date()): string {
  const safeDay = Math.min(Math.max(dayOfMonth, 1), 28);

  const currentYear = fromDate.getFullYear();
  const currentMonth = fromDate.getMonth();

  let nextDate = new Date(currentYear, currentMonth, safeDay, 12, 0, 0, 0);

  if (nextDate <= fromDate) {
    nextDate = new Date(currentYear, currentMonth + 1, safeDay, 12, 0, 0, 0);
  }

  return nextDate.toISOString();
}

function getFollowingMonthlyDate(dayOfMonth: number, fromDate: Date): string {
  const safeDay = Math.min(Math.max(dayOfMonth, 1), 28);
  const nextDate = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    safeDay,
    12,
    0,
    0,
    0
  );

  return nextDate.toISOString();
}

export async function createRecurringExpense(
  data: CreateRecurringExpenseData
): Promise<RecurringExpense> {
  const created = await databases.createDocument(
    DB_ID,
    RECURRING_EXPENSES_COL_ID,
    ID.unique(),
    {
      userId: data.userId,
      title: data.title,
      amount: data.amount,
      categoryId: data.categoryId,
      periodType: "monthly",
      dayOfMonth: data.dayOfMonth,
      nextRunAt: getNextMonthlyDate(data.dayOfMonth),
      isActive: true,
    }
  );

  return created as unknown as RecurringExpense;
}

export async function updateRecurringExpense(
  data: UpdateRecurringExpenseData
): Promise<RecurringExpense> {
  const updated = await databases.updateDocument(
    DB_ID,
    RECURRING_EXPENSES_COL_ID,
    data.recurringId,
    {
      title: data.title,
      amount: data.amount,
      categoryId: data.categoryId,
      periodType: "monthly",
      dayOfMonth: data.dayOfMonth,
      nextRunAt: getNextMonthlyDate(data.dayOfMonth),
      isActive: data.isActive,
    }
  );

  return updated as unknown as RecurringExpense;
}

export async function getUserRecurringExpenses(
  userId: string
): Promise<RecurringExpense[]> {
  const response = await databases.listDocuments(
    DB_ID,
    RECURRING_EXPENSES_COL_ID,
    [
      Query.equal("userId", userId),
      Query.orderAsc("nextRunAt"),
      Query.limit(100),
    ]
  );

  return response.documents as unknown as RecurringExpense[];
}

export async function deleteRecurringExpense(recurringId: string) {
  return databases.deleteDocument(DB_ID, RECURRING_EXPENSES_COL_ID, recurringId);
}

export async function processDueRecurringExpenses(userId: string): Promise<number> {
  const recurringExpenses = await getUserRecurringExpenses(userId);
  const now = new Date();

  const dueItems = recurringExpenses.filter((item) => {
    if (!item.isActive) {
      return false;
    }

    return new Date(item.nextRunAt) <= now;
  });

  let createdCount = 0;

  for (const item of dueItems) {
    const expenseDate = new Date(item.nextRunAt);

    await databases.createDocument(DB_ID, EXPENSES_COL_ID, ID.unique(), {
      userId: item.userId,
      amount: item.amount,
      categoryId: item.categoryId,
      note: item.title,
      date: expenseDate.toISOString(),

      sourceType: "recurring",
      sourceId: item.$id,
      status: "auto_created",
      merchantName: item.title,
      createdAutomatically: true,
    });

    const dayOfMonth = item.dayOfMonth || expenseDate.getDate();

    await databases.updateDocument(
      DB_ID,
      RECURRING_EXPENSES_COL_ID,
      item.$id,
      {
        nextRunAt: getFollowingMonthlyDate(dayOfMonth, expenseDate),
      }
    );

    createdCount += 1;
  }

  return createdCount;
}
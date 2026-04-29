import {
  DB_ID,
  EXPENSES_COL_ID,
  ID,
  Query,
  RECEIPT_SCANS_COL_ID,
  databases,
} from "../lib/appwrite";
import { Expense } from "../types/models";

interface CreateManualExpenseData {
  userId: string;
  amount: number;
  categoryId: string;
  note: string;
  date: string;
}

interface UpdateExpenseData {
  expenseId: string;
  amount: number;
  categoryId: string;
  note: string;
}

export async function createManualExpense(data: CreateManualExpenseData) {
  return databases.createDocument(DB_ID, EXPENSES_COL_ID, ID.unique(), {
    userId: data.userId,
    amount: data.amount,
    categoryId: data.categoryId,
    note: data.note,
    date: data.date,

    sourceType: "manual",
    sourceId: "",
    status: "confirmed",
    merchantName: data.note,
    createdAutomatically: false,
  });
}

export async function updateExpense(data: UpdateExpenseData) {
  return databases.updateDocument(DB_ID, EXPENSES_COL_ID, data.expenseId, {
    amount: data.amount,
    categoryId: data.categoryId,
    note: data.note,
    merchantName: data.note,
  });
}

export async function getUserExpenses(userId: string): Promise<Expense[]> {
  const response = await databases.listDocuments(DB_ID, EXPENSES_COL_ID, [
    Query.equal("userId", userId),
    Query.orderDesc("date"),
    Query.limit(100),
  ]);

  return response.documents as unknown as Expense[];
}

export async function deleteExpense(expenseId: string) {
  const expense = await databases.getDocument(
    DB_ID,
    EXPENSES_COL_ID,
    expenseId
  );

  await databases.deleteDocument(DB_ID, EXPENSES_COL_ID, expenseId);

  if (expense.sourceType === "receipt_qr" && expense.sourceId) {
    try {
      await databases.deleteDocument(
        DB_ID,
        RECEIPT_SCANS_COL_ID,
        expense.sourceId
      );
    } catch (error) {
      console.warn("Не удалось удалить связанную запись QR-чека:", error);
    }
  }

  return true;
}

export function getCurrentMonthExpenses(expenses: Expense[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);

    return (
      expenseDate.getMonth() === currentMonth &&
      expenseDate.getFullYear() === currentYear
    );
  });
}

export function getTotalAmount(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}
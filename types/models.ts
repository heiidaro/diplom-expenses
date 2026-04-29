export type UserProfileRole = "user" | "admin" | "super_admin";

export type SourceType =
  | "manual"
  | "receipt_qr"
  | "receipt_ocr"
  | "bank_import"
  | "recurring";

export type ExpenseStatus = "confirmed" | "needs_review" | "auto_created";

export interface Category {
  $id: string;
  userId?: string;
  name: string;
  color?: string;
  iconId?: string;
  isDefault?: boolean;
  isSystem?: boolean;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface Expense {
  $id: string;
  userId: string;
  amount: number;
  categoryId: string;
  date: string;
  note?: string;

  sourceType?: SourceType;
  sourceId?: string;
  status?: ExpenseStatus;
  merchantName?: string;
  createdAutomatically?: boolean;

  $createdAt?: string;
  $updatedAt?: string;
}

export interface CategoryRule {
  $id: string;
  userId: string;
  keyword: string;
  categoryId: string;
  source?: string;
  usageCount?: number;
  lastUsedAt?: string;
  createdAt?: string;
}

export interface RecurringExpense {
  $id: string;
  userId: string;
  title: string;
  amount: number;
  categoryId: string;
  periodType: "daily" | "weekly" | "monthly" | "yearly";
  dayOfMonth?: number;
  nextRunAt: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
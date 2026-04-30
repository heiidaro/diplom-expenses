export type UserProfileRole = "user" | "admin" | "super_admin";

export type SourceType =
  | "manual"
  | "receipt_qr"
  | "receipt_ocr"
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
  $createdAt?: string;
  $updatedAt?: string;

  userId: string;
  keyword: string;
  categoryId: string;
  source?: string;
  usageCount?: number;
  lastUsedAt?: string;
}

export interface RecurringExpense {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  userId: string;
  title: string;
  amount: number;
  categoryId: string;
  periodType: "daily" | "weekly" | "monthly" | "yearly";
  dayOfMonth?: number;
  nextRunAt: string;
  isActive: boolean;
}

export interface ReceiptScan {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  userId: string;
  qrRawData?: string;
  qrHash?: string;
  totalAmount?: number;
  purchaseDate?: string;
  storeName?: string;
  status?: string;
}

export interface ParsedReceiptQr {
  raw: string;
  totalAmount: number;
  purchaseDate: string;
  fiscalNumber?: string;
  fiscalDocument?: string;
  fiscalSign?: string;
}

export interface SupportTicket {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  userId: string;
  title: string;
  message: string;
  status?: "open" | "in_progress" | "closed" | string;

  adminReply?: string;
  adminReplyAt?: string;
  isReplyRead?: boolean;
}

export interface SpendingGoal {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  userId: string;
  title: string;
  limitAmount: number;
  periodType: "month" | "year" | "custom";
  startDate: string;
  endDate: string;
  isActive: boolean;
  notifyAtPercent?: number;
}

export interface AppNotification {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  userId: string;
  title: string;
  message: string;
  type: "news" | "support" | "goal" | "system" | "recurring" | string;
  isRead?: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
}
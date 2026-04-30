import {
  Account,
  Client,
  Databases,
  ExecutionMethod,
  Functions,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";
import "react-native-url-polyfill/auto";

export const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID = "6985d1ef00232e29e0ed";
export const APPWRITE_PLATFORM = "com.fynux.diplom";

export const DB_ID = "698de61e0013a584b7bb";

export const PROFILES_COL_ID = "profiles";
export const CATEGORIES_COL_ID = "categories";
export const ICONS_COL_ID = "category_icons";
export const EXPENSES_COL_ID = "expenses";
export const RECEIPTS_COL_ID = "receipts";
export const SUPPORT_TICKETS_COL_ID = "support_tickets";
export const EXPORT_REQUESTS_COL_ID = "export_requests";

export const CATEGORY_RULES_COL_ID = "category_rules";
export const RECURRING_EXPENSES_COL_ID = "recurring_expenses";
export const RECEIPT_SCANS_COL_ID = "receipt_scans";
export const SPENDING_GOALS_COL_ID = "spending_goals";
export const NOTIFICATIONS_COL_ID = "notifications";
export const PARSE_PDF_RECEIPT_FUNCTION_ID = "69f30c5f0014da059d4d";
export const RECEIPT_FILES_BUCKET_ID = "698ded11003046f79899";

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


const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform(APPWRITE_PLATFORM);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { ExecutionMethod, ID, Query };
import {
  DB_ID,
  PROFILES_COL_ID,
  Query,
  account,
  databases,
} from "../lib/appwrite";
import { deleteCurrentSessionSafely } from "./sessionGuardService";

export function isAdminAccount(user: any) {
  const labels = Array.isArray(user?.labels) ? user.labels : [];

  return labels.includes("admin");
}

export async function logoutCurrentSessionSafely() {
  return deleteCurrentSessionSafely();
}

export async function getUserProfileByUserId(userId: string) {
  const response = await databases.listDocuments(DB_ID, PROFILES_COL_ID, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);

  return response.documents[0] || null;
}

export async function isUserBlockedByProfile(userId: string) {
  const profile = await getUserProfileByUserId(userId);

  if (!profile) {
    return false;
  }

  return profile.isBlocked === true || profile.isBlocked === "true";
}

export async function checkCurrentUserBlocked() {
  const user = await account.get();

  if (isAdminAccount(user)) {
    return false;
  }

  return isUserBlockedByProfile(user.$id);
}

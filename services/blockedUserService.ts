import {
  DB_ID,
  PROFILES_COL_ID,
  Query,
  account,
  databases,
} from "../lib/appwrite";

function isAlreadyGuestError(error: any) {
  const message = String(error?.message || "");

  return (
    message.includes("role: guests") ||
    message.includes("missing scopes") ||
    message.includes("account")
  );
}

export function isAdminAccount(user: any) {
  const labels = Array.isArray(user?.labels) ? user.labels : [];

  return labels.includes("admin");
}

export async function logoutCurrentSessionSafely() {
  try {
    await account.deleteSession({
      sessionId: "current",
    } as any);

    return;
  } catch (firstError: any) {
    if (isAlreadyGuestError(firstError)) {
      return;
    }

    try {
      await account.deleteSession("current" as any);
    } catch (secondError: any) {
      if (isAlreadyGuestError(secondError)) {
        return;
      }

      throw secondError;
    }
  }
}

export async function getUserProfileByUserId(userId: string) {
  const response = await databases.listDocuments(
    DB_ID,
    PROFILES_COL_ID,
    [Query.equal("userId", userId), Query.limit(1)]
  );

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
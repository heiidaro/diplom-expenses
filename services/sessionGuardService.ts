import { account } from "../lib/appwrite";

let logoutInProgress = false;

export function beginLogout() {
  logoutInProgress = true;
}

export function finishLogoutLater(delayMs = 2500) {
  setTimeout(() => {
    logoutInProgress = false;
  }, delayMs);
}

export function isLogoutInProgress() {
  return logoutInProgress;
}

export function isGuestOrSessionError(error: any) {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("role: guests") ||
    message.includes("missing scopes") ||
    message.includes("missing scope") ||
    message.includes("no active session") ||
    message.includes("session not found") ||
    (message.includes("user") && message.includes("guest")) ||
    (message.includes("user") && message.includes("guests")) ||
    message.includes("account")
  );
}

export async function deleteCurrentSessionSafely() {
  try {
    await account.deleteSession({
      sessionId: "current",
    } as any);

    return;
  } catch (firstError: any) {
    if (isGuestOrSessionError(firstError)) {
      return;
    }

    try {
      await account.deleteSession("current" as any);
    } catch (secondError: any) {
      if (isGuestOrSessionError(secondError)) {
        return;
      }

      throw secondError;
    }
  }
}

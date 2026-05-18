import { useEffect, useState } from "react";
import { account } from "../lib/appwrite";
import {
  beginLogout,
  deleteCurrentSessionSafely,
  finishLogoutLater,
  isGuestOrSessionError,
} from "../services/sessionGuardService";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const currentUser = await account.get();

      setIsAuthenticated(true);
      setUser(currentUser);
    } catch (error: any) {
      if (!isGuestOrSessionError(error)) {
        console.log("Не удалось проверить сессию", error);
      }

      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      beginLogout();

      await deleteCurrentSessionSafely();

      setIsAuthenticated(false);
      setUser(null);

      finishLogoutLater();
    } catch (error: any) {
      finishLogoutLater();

      if (isGuestOrSessionError(error)) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      console.log("Logout error:", error);
    }
  }

  return { isLoading, isAuthenticated, user, logout, checkSession };
}

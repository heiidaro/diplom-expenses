import { usePathname } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { updateMyActivity } from "../services/activityService";
import {
  isGuestOrSessionError,
  isLogoutInProgress,
} from "../services/sessionGuardService";

const HEARTBEAT_INTERVAL_MS = 60_000;

function isAuthPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.includes("sign-in") ||
    pathname.includes("sign-up") ||
    pathname.includes("forgot-password") ||
    pathname.includes("reset-password")
  );
}

function getScreenName(pathname: string) {
  if (!pathname || pathname === "/") {
    return "start";
  }

  if (pathname.includes("admin")) {
    if (pathname.includes("dashboard")) return "admin_dashboard";
    if (pathname.includes("users")) return "admin_users";
    if (pathname.includes("support")) return "admin_support";
    if (pathname.includes("news")) return "admin_news";
    if (pathname.includes("logs")) return "admin_logs";
    if (pathname.includes("profile")) return "admin_profile";

    return "admin";
  }

  if (pathname.includes("home")) return "home";
  if (pathname.includes("categories")) return "categories";
  if (pathname.includes("expenses")) return "expenses";
  if (pathname.includes("profile")) return "profile";
  if (pathname.includes("statistics")) return "statistics";
  if (pathname.includes("goals")) return "goals";
  if (pathname.includes("support")) return "support";
  if (pathname.includes("notifications")) return "notifications";
  if (pathname.includes("settings")) return "settings";

  return pathname.replace(/[\/()]/g, "_").replace(/_+/g, "_") || "app";
}

export function useActivityHeartbeat() {
  const pathname = usePathname();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentAtRef = useRef(0);
  const lastScreenRef = useRef("");

  const screenName = useMemo(() => {
    return getScreenName(pathname || "");
  }, [pathname]);

  function stopHeartbeat() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function sendActivity(force = false) {
    try {
      if (isLogoutInProgress()) {
        stopHeartbeat();
        return;
      }

      if (!pathname || isAuthPath(pathname)) {
        return;
      }

      if (appStateRef.current !== "active") {
        return;
      }

      const now = Date.now();
      const isSameScreen = lastScreenRef.current === screenName;
      const isTooSoon = now - lastSentAtRef.current < 55_000;

      if (!force && isSameScreen && isTooSoon) {
        return;
      }

      lastSentAtRef.current = now;
      lastScreenRef.current = screenName;

      await updateMyActivity(screenName);
    } catch (error: any) {
      if (isGuestOrSessionError(error) || isLogoutInProgress()) {
        return;
      }

      console.log("Не удалось отправить heartbeat активности", error);
    }
  }

  function startHeartbeat() {
    stopHeartbeat();

    if (isLogoutInProgress()) {
      return;
    }

    intervalRef.current = setInterval(() => {
      sendActivity(true);
    }, HEARTBEAT_INTERVAL_MS);
  }

  useEffect(() => {
    sendActivity(true);
  }, [screenName]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;

      if (nextState === "active") {
        sendActivity(true);
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    if (AppState.currentState === "active") {
      sendActivity(true);
      startHeartbeat();
    }

    return () => {
      subscription.remove();
      stopHeartbeat();
    };
  }, [screenName]);
}

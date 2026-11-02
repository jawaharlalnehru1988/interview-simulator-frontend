"use client";

import { useEffect, useState, useCallback } from "react";
import {
  SESSION_UPDATED_EVENT,
  createDefaultSession,
  loadClientSession,
  clearClientSession as clearSession,
  isSessionExpired,
  type ClientSession,
} from "./session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export function useSession() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL)
  );

  const refresh = useCallback(() => {
    setSession(loadClientSession(DEFAULT_API_BASE_URL));
  }, []);

  const logout = useCallback(() => {
    clearSession(DEFAULT_API_BASE_URL);
    setSession(createDefaultSession(DEFAULT_API_BASE_URL));
  }, []);

  useEffect(() => {
    refresh();

    const handleSessionUpdate = () => refresh();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "interview-simulater.session") {
        refresh();
      }
    };

    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
    window.addEventListener("storage", handleStorageChange);

    // Active heartbeat: check every 15 seconds if 30-min timeout occurred
    const interval = setInterval(() => {
      const current = loadClientSession(DEFAULT_API_BASE_URL);
      if (current.accessToken && isSessionExpired(current)) {
        logout();
        window.location.href = "/auth?mode=login&reason=timeout";
      }
    }, 15000);

    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [refresh, logout]);

  const isLoggedIn = Boolean(session.accessToken && session.username && session.username.trim().length > 0);

  return {
    session,
    isLoggedIn,
    logout,
    refresh,
  };
}

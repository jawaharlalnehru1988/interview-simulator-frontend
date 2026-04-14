"use client";

import { useEffect, useState, useCallback } from "react";
import {
  SESSION_UPDATED_EVENT,
  createDefaultSession,
  loadClientSession,
  clearClientSession as clearSession,
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

    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refresh]);

  const logout = useCallback(() => {
    clearSession(DEFAULT_API_BASE_URL);
  }, []);

  const isLoggedIn = !!(session.accessToken && session.username.trim());

  return {
    session,
    isLoggedIn,
    logout,
    refresh,
  };
}

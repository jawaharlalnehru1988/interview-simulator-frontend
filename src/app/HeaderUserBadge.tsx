"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SESSION_UPDATED_EVENT,
  createDefaultSession,
  loadClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function HeaderUserBadge() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );

  useEffect(() => {
    setSession(loadClientSession(DEFAULT_API_BASE_URL));

    const refreshFromStorage = () => {
      setSession(loadClientSession(DEFAULT_API_BASE_URL));
    };

    window.addEventListener("storage", refreshFromStorage);
    window.addEventListener(SESSION_UPDATED_EVENT, refreshFromStorage as EventListener);

    return () => {
      window.removeEventListener("storage", refreshFromStorage);
      window.removeEventListener(SESSION_UPDATED_EVENT, refreshFromStorage as EventListener);
    };
  }, []);

  const displayName = useMemo(() => {
    const username = session.username.trim();
    if (session.accessToken && username) {
      return username;
    }
    return "Guest";
  }, [session.accessToken, session.username]);

  const initial = useMemo(() => displayName.charAt(0).toUpperCase() || "G", [displayName]);

  return (
    <div className="user-chip" title={displayName}>
      <span className="user-avatar" aria-hidden="true">
        {initial}
      </span>
      <span className="user-name">{displayName}</span>
    </div>
  );
}

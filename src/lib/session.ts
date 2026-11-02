export type ClientSession = {
  apiBaseUrl: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  interviewId: number | null;
  topic: string;
  roundType: string;
  startedAt?: number;
  picture?: string;
  loginTimestamp?: number;
};

const STORAGE_KEY = "interview-simulater.session";
export const SESSION_UPDATED_EVENT = "interview-simulater:session-updated";
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

function normalizeApiBaseUrl(apiBaseUrl: string): string {
  if (typeof window === "undefined") {
    return apiBaseUrl;
  }

  const trimmed = apiBaseUrl.trim();
  if (!trimmed) {
    return window.location.origin;
  }

  if (window.location.protocol === "https:" && trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }

  return trimmed;
}

export function createDefaultSession(defaultApiBaseUrl: string): ClientSession {
  return {
    apiBaseUrl: normalizeApiBaseUrl(defaultApiBaseUrl),
    username: "",
    email: "",
    accessToken: "",
    refreshToken: "",
    interviewId: null,
    topic: "Java 8",
    roundType: "basic",
  };
}

export function isSessionExpired(session: Partial<ClientSession>): boolean {
  if (!session.accessToken) {
    return false;
  }

  // 1. Check 30-minute inactivity / login timestamp limit
  if (session.loginTimestamp && typeof session.loginTimestamp === "number") {
    if (Date.now() - session.loginTimestamp > SESSION_TIMEOUT_MS) {
      return true;
    }
  }

  // 2. Check JWT expiration claim if available
  try {
    const parts = session.accessToken.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload && typeof payload.exp === "number") {
        const expMs = payload.exp * 1000;
        if (Date.now() > expMs) {
          return true;
        }
      }
    }
  } catch {
    // Non-fatal if token is not standard base64 JWT
  }

  return false;
}

export function loadClientSession(defaultApiBaseUrl: string): ClientSession {
  if (typeof window === "undefined") {
    return createDefaultSession(defaultApiBaseUrl);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDefaultSession(defaultApiBaseUrl);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ClientSession>;

    // If session has timed out (exceeded 30 mins or JWT expired), purge immediately
    if (isSessionExpired(parsed)) {
      return clearClientSession(defaultApiBaseUrl);
    }

    const apiBaseUrl = normalizeApiBaseUrl(parsed.apiBaseUrl || defaultApiBaseUrl);
    return {
      ...createDefaultSession(defaultApiBaseUrl),
      ...parsed,
      apiBaseUrl,
    };
  } catch {
    return createDefaultSession(defaultApiBaseUrl);
  }
}

export function saveClientSession(session: ClientSession) {
  if (typeof window === "undefined") {
    return;
  }

  // Ensure loginTimestamp is stamped if missing on active session
  if (session.accessToken && !session.loginTimestamp) {
    session.loginTimestamp = Date.now();
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: session }));
}

export function clearClientSession(defaultApiBaseUrl: string) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.clear();

      // Disable Google Auto-Select so user doesn't get automatically re-logged in
      const win = window as any;
      if (win.google && win.google.accounts && win.google.accounts.id) {
        win.google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.warn("Storage cleanup error:", e);
    }
  }

  const cleared = createDefaultSession(defaultApiBaseUrl);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: cleared }));
  }
  return cleared;
}

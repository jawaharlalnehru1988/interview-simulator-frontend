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
};

const STORAGE_KEY = "interview-simulater.session";
export const SESSION_UPDATED_EVENT = "interview-simulater:session-updated";

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
    roundType: "technical",
  };
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

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: session }));
}

export function clearClientSession(defaultApiBaseUrl: string) {
  const cleared = createDefaultSession(defaultApiBaseUrl);
  saveClientSession(cleared);
  return cleared;
}

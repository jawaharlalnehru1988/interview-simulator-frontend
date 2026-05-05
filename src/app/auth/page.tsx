"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ApiError, loginUser, registerUser } from "@/lib/api";
import {
  createDefaultSession,
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function AuthPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [ready, setReady] = useState(false);
  const authMode: "login" | "register" =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "register"
      ? "register"
      : "login";

  useEffect(() => {
    setSession(loadClientSession(DEFAULT_API_BASE_URL));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    saveClientSession(session);
  }, [ready, session]);

  function updateSession(patch: Partial<ClientSession>) {
    setSession((current) => ({ ...current, ...patch }));
  }

  async function runAction(label: string, action: () => Promise<void>) {
    setBusyLabel(label);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await action();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unexpected error";
      setErrorMessage(message);
    } finally {
      setBusyLabel("");
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction("Register", async () => {
      const response = await registerUser(session.apiBaseUrl, {
        username: session.username,
        email: session.email,
        password,
      });
      setSuccessMessage(`Created user ${response.username}. You can log in now.`);
    });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction("Login", async () => {
      const response = await loginUser(session.apiBaseUrl, {
        username: session.username,
        password,
      });
      updateSession({
        accessToken: response.access,
        refreshToken: response.refresh,
      });
      setSuccessMessage("Login successful. Redirecting to the interview workspace.");
      router.push("/interview");
    });
  }

  return (
    <main className="shell route-shell auth-page">


      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}
      {successMessage ? <p className="banner success">{successMessage}</p> : null}

      <section className="route-grid auth-grid-center">
        <article className="card stack-card auth-card">
          <div className="card-heading">
            <h2>{authMode === "login" ? "Login" : "Create account"}</h2>
          </div>
          <form
            className="stack-card"
            onSubmit={authMode === "login" ? handleLogin : handleRegister}
          >
            <label className="field">
              <span>Username</span>
              <input
                required
                value={session.username}
                onChange={(event) => updateSession({ username: event.target.value })}
              />
            </label>
            {authMode === "register" ? (
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={session.email}
                  onChange={(event) => updateSession({ email: event.target.value })}
                />
              </label>
            ) : null}
            <label className="field">
              <span>Password</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-color, #666)"
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </label>
            <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
              {authMode === "login" ? "Log in" : "Register user"}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

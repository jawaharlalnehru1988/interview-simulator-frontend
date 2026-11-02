"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ApiError, loginUser, registerUser } from "@/lib/api";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  loadClientSession,
  saveClientSession,
} from "@/lib/session";
import { useSession } from "@/lib/useSession";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function AuthPage() {
  const router = useRouter();
  const { session: currentSession, isLoggedIn } = useSession();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
    const loaded = loadClientSession(DEFAULT_API_BASE_URL);
    if (loaded.username) {
      setUsername(loaded.username);
    }
    if (loaded.email) {
      setEmail(loaded.email);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "timeout") {
      setErrorMessage("Your session timed out after 30 minutes of inactivity. Please log in again to continue.");
    }
    setReady(true);
  }, []);

  // Redirect to dashboard immediately if already authenticated
  useEffect(() => {
    if (ready && isLoggedIn) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTarget = searchParams.get("redirect") || "/";
      window.location.href = redirectTarget;
    }
  }, [ready, isLoggedIn]);

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
      const apiBaseUrl = currentSession.apiBaseUrl || DEFAULT_API_BASE_URL;
      const response = await registerUser(apiBaseUrl, {
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setSuccessMessage(`Created user ${response.username}. You can log in now.`);
    });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction("Login", async () => {
      const apiBaseUrl = currentSession.apiBaseUrl || DEFAULT_API_BASE_URL;
      const response = await loginUser(apiBaseUrl, {
        username: username.trim(),
        password,
      });
      saveClientSession({
        ...currentSession,
        username: username.trim(),
        accessToken: response.access,
        refreshToken: response.refresh,
        loginTimestamp: Date.now(),
      });
      setSuccessMessage("Login successful. Redirecting to dashboard...");
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTarget = searchParams.get("redirect") || "/";
      window.location.href = redirectTarget;
    });
  }

  if (ready && isLoggedIn) {
    return (
      <main className="shell route-shell auth-page">
        <section className="route-grid auth-grid-center">
          <article className="card stack-card auth-card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div className="card-heading" style={{ justifyContent: "center" }}>
              <h2>Welcome back, {currentSession.username || "User"}!</h2>
            </div>
            <p className="muted-copy">You are already authenticated. Redirecting to your dashboard...</p>
            <div style={{ marginTop: "16px" }}>
              <a href="/" className="primary-button link-button">
                Go to Dashboard
              </a>
            </div>
          </article>
        </section>
      </main>
    );
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
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            {authMode === "register" ? (
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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

            <div style={{ display: "flex", alignItems: "center", margin: "16px 0", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border, #e5e7eb)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border, #e5e7eb)" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <GoogleSignInButton redirectAfterLogin="/" buttonText="Continue with Google" />
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}

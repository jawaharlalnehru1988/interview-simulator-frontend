"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  checkHealth,
  loginUser,
  refreshUserToken,
  registerUser,
} from "@/lib/api";
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
  const [healthState, setHealthState] = useState("unknown");
  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [ready, setReady] = useState(false);

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

  async function handleHealthCheck() {
    await runAction("Health Check", async () => {
      const response = await checkHealth(session.apiBaseUrl);
      setHealthState(response.status);
      setSuccessMessage(`Backend responded with ${response.status}.`);
    });
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

  async function handleRefreshToken() {
    if (!session.refreshToken || !session.accessToken) {
      setErrorMessage("Log in first before refreshing tokens.");
      return;
    }

    await runAction("Refresh Token", async () => {
      const response = await refreshUserToken(session.apiBaseUrl, session.refreshToken);
      updateSession({ accessToken: response.access });
      setSuccessMessage("Access token refreshed.");
    });
  }

  return (
    <main className="shell route-shell">
      <section className="route-hero">
        <div>
          <p className="eyebrow">Authentication Routes</p>
          <h1>Register and log in on a dedicated route.</h1>
          <p className="hero-copy">
            This page owns candidate onboarding and token management. Once authenticated, the
            interview workspace takes over the rest of the product flow.
          </p>
        </div>
        <div className="hero-links">
          <button className="ghost-button" onClick={handleHealthCheck} type="button">
            Check backend health
          </button>
          <button className="ghost-button" onClick={handleRefreshToken} type="button">
            Refresh token
          </button>
          <Link className="secondary-button link-button" href="/interview">
            Go to interview route
          </Link>
        </div>
      </section>

      <section className="status-strip">
        <div className="status-pill">
          <span>Backend</span>
          <strong>{healthState}</strong>
        </div>
        <div className="status-pill">
          <span>Busy</span>
          <strong>{busyLabel || "idle"}</strong>
        </div>
        <div className="status-pill accent">
          <span>Session</span>
          <strong>{session.accessToken ? "authenticated" : "guest"}</strong>
        </div>
      </section>

      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}
      {successMessage ? <p className="banner success">{successMessage}</p> : null}

      <section className="route-grid">
        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Connection</p>
            <h2>API target</h2>
          </div>
          <label className="field">
            <span>API base URL</span>
            <input
              value={session.apiBaseUrl}
              onChange={(event) => updateSession({ apiBaseUrl: event.target.value })}
              placeholder="http://127.0.0.1:8000"
            />
          </label>
          <p className="muted-copy">
            The frontend stores this locally, so you can point at local, staging, or production
            Django instances without rebuilding the app.
          </p>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Register</p>
            <h2>Create account</h2>
          </div>
          <form className="stack-card" onSubmit={handleRegister}>
            <label className="field">
              <span>Username</span>
              <input
                required
                value={session.username}
                onChange={(event) => updateSession({ username: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={session.email}
                onChange={(event) => updateSession({ email: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
              Register user
            </button>
          </form>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Login</p>
            <h2>Issue JWT tokens</h2>
          </div>
          <form className="stack-card" onSubmit={handleLogin}>
            <label className="field">
              <span>Username</span>
              <input
                required
                value={session.username}
                onChange={(event) => updateSession({ username: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
              Log in
            </button>
          </form>
          <div className="token-box">
            <span>Access token</span>
            <code>{session.accessToken ? `${session.accessToken.slice(0, 32)}...` : "not issued yet"}</code>
          </div>
        </article>
      </section>
    </main>
  );
}

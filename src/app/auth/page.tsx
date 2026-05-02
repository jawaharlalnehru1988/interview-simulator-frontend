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
      <section className="route-hero">
        <div>
          <p className="eyebrow">Login Page</p>
          <h1>{authMode === "login" ? "Log in to continue" : "Create your account"}</h1>
          <p className="hero-copy">
            {authMode === "login"
              ? "Use your account credentials to enter the interview workspace."
              : "Create an account first, then switch to login to access the interview workspace."}
          </p>
        </div>
      </section>

      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}
      {successMessage ? <p className="banner success">{successMessage}</p> : null}

      <section className="route-grid auth-grid-center">
        <article className="card stack-card auth-card">
          <div className="card-heading">
            <p className="eyebrow">{authMode === "login" ? "Login" : "Register"}</p>
            <h2>{authMode === "login" ? "Issue JWT tokens" : "Create account"}</h2>
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
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
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

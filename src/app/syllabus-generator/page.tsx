"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  generateSyllabus,
  convertToSyllabusChecklist,
  toggleSyllabusChecklistItem,
  getSyllabusHistory,
  getSyllabusDetails,
  type SyllabusResponse,
  type AuthState,
} from "@/lib/api";
import {
  createDefaultSession,
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function SyllabusGeneratorPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [ready, setReady] = useState(false);
  const [topic, setTopic] = useState("");
  const [activeSyllabus, setActiveSyllabus] = useState<SyllabusResponse | null>(null);
  const [history, setHistory] = useState<SyllabusResponse[]>([]);
  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setSession(loadClientSession(DEFAULT_API_BASE_URL));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveClientSession(session);
  }, [ready, session]);

  const authState: AuthState = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    onAccessToken: (accessToken) => {
      setSession((current) => ({ ...current, accessToken }));
    },
    onUnauthorized: () => {
      setSession((current) => ({ ...current, accessToken: "", refreshToken: "" }));
      setErrorMessage("Session expired. Log in again from the auth route.");
    },
  };

  async function runAction(label: string, action: () => Promise<void>) {
    setBusyLabel(label);
    setErrorMessage("");
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

  async function loadHistory() {
    if (!session.accessToken) return;
    try {
      const res = await getSyllabusHistory(session.apiBaseUrl, authState);
      setHistory(res);
    } catch {
      // Keep app running if history loading fails
    }
  }

  useEffect(() => {
    if (!ready || !session.accessToken) return;
    void loadHistory();
  }, [ready, session.accessToken]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.accessToken) {
      setErrorMessage("Log in from the auth route before generating a syllabus.");
      return;
    }
    if (!topic.trim()) {
      setErrorMessage("Please enter a topic.");
      return;
    }

    await runAction("Generating Syllabus", async () => {
      const response = await generateSyllabus(session.apiBaseUrl, authState, topic.trim());
      setActiveSyllabus(response);
      setTopic("");
      await loadHistory();
    });
  }

  async function handleConvertToChecklist() {
    if (!activeSyllabus) return;
    await runAction("Converting to Checklist", async () => {
      const response = await convertToSyllabusChecklist(
        session.apiBaseUrl,
        authState,
        activeSyllabus.id,
      );
      setActiveSyllabus(response);
      await loadHistory();
    });
  }

  async function handleToggleItem(itemId: string, currentCompleted: boolean) {
    if (!activeSyllabus) return;
    await runAction("Updating Checklist", async () => {
      const response = await toggleSyllabusChecklistItem(
        session.apiBaseUrl,
        authState,
        activeSyllabus.id,
        itemId,
        !currentCompleted,
      );
      setActiveSyllabus(response);
      await loadHistory();
    });
  }

  async function handleSelectSyllabus(id: number) {
    await runAction("Loading Syllabus Details", async () => {
      const response = await getSyllabusDetails(session.apiBaseUrl, authState, id);
      setActiveSyllabus(response);
    });
  }

  // Calculate Checklist progress
  const progressStats = useMemo(() => {
    if (!activeSyllabus?.checklist || !activeSyllabus.converted_to_checklist) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const total = activeSyllabus.checklist.length;
    const completed = activeSyllabus.checklist.filter((item) => item.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [activeSyllabus]);

  // Group checklist items by Topic (Chapter)
  const groupedChecklist = useMemo(() => {
    if (!activeSyllabus?.checklist) return {};
    const groups: Record<string, typeof activeSyllabus.checklist> = {};
    for (const item of activeSyllabus.checklist) {
      if (!groups[item.topic]) {
        groups[item.topic] = [];
      }
      groups[item.topic].push(item);
    }
    return groups;
  }, [activeSyllabus]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="shell route-shell">
      <section className="route-hero">
        <div>
          <p className="eyebrow">Learning Planner</p>
          <h1>Syllabus Generator</h1>
          <p className="hero-copy">
            Enter any technical topic, and our AI will build a detailed syllabus. Convert it to a
            custom checklist to track your learning journey, master subtopics, and check off your progress with automated date stamping.
          </p>
        </div>
        <div className="hero-links">
          <Link className="secondary-button link-button" href="/aspiration">
            Open Aspiration Planner
          </Link>
        </div>
      </section>

      {errorMessage && <div className="banner error">{errorMessage}</div>}

      <section className="route-grid">
        {/* Left Column - Form and Content */}
        <article className="card tall-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Generator</p>
            <h2>Create New Learning Path</h2>
          </div>
          <form className="stack-card" onSubmit={handleGenerate}>
            <label className="field" htmlFor="topic-input">
              <span>Broader Topic</span>
              <input
                id="topic-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Example: Spring Boot, Next.js, Kubernetes, Rust Lang"
                disabled={!!busyLabel}
              />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit" disabled={!!busyLabel}>
                {busyLabel === "Generating Syllabus" ? "Creating Syllabus..." : "Generate Syllabus"}
              </button>
              {activeSyllabus && (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setActiveSyllabus(null);
                    setTopic("");
                  }}
                  disabled={!!busyLabel}
                >
                  Clear Screen
                </button>
              )}
            </div>
          </form>

          {busyLabel === "Generating Syllabus" && (
            <div className="stack-card" style={{ marginTop: "24px", alignItems: "center" }}>
              <div className="loading-spinner" />
              <p className="muted-copy" style={{ textAlign: "center" }}>
                AI is structuring a comprehensive learning syllabus... Please hold on.
              </p>
            </div>
          )}

          {/* Render Active Syllabus */}
          {activeSyllabus && busyLabel !== "Generating Syllabus" && (
            <div className="stack-card" style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
              <div className="card-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <p className="eyebrow">Active Plan</p>
                  <h2 style={{ margin: 0 }}>{activeSyllabus.topic}</h2>
                </div>
                {!activeSyllabus.converted_to_checklist && (
                  <button
                    className="secondary-button"
                    onClick={handleConvertToChecklist}
                    disabled={!!busyLabel}
                  >
                    {busyLabel === "Converting to Checklist" ? "Converting..." : "Convert to Tracker Checklist"}
                  </button>
                )}
              </div>

              {/* Progress Panel for Checklist */}
              {activeSyllabus.converted_to_checklist && (
                <div className="card stack-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <strong>Progress Checklist Tracker</strong>
                    <span className="text-accent">{progressStats.percentage}% Mastered</span>
                  </div>
                  <div className="progress-bar-container" style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${progressStats.percentage}%`,
                        height: "100%",
                        background: "var(--accent-color, #a855f7)",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <small className="muted-copy" style={{ marginTop: "6px" }}>
                    {progressStats.completed} of {progressStats.total} subtopics checked off
                  </small>
                </div>
              )}

              {/* Syllabus Layout (Outline Mode) */}
              {!activeSyllabus.converted_to_checklist ? (
                <div className="summary-list" style={{ marginTop: "20px" }}>
                  {activeSyllabus.syllabus.map((chapter, idx) => (
                    <div
                      key={`chapter-${idx}`}
                      className="card"
                      style={{ background: "rgba(255,255,255,0.01)", padding: "16px", border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <h3 style={{ margin: "0 0 12px 0", color: "var(--accent-color, #a855f7)" }}>
                        {chapter.title}
                      </h3>
                      <ul style={{ paddingLeft: "20px", margin: 0, listStyleType: "circle" }}>
                        {chapter.subtopics.map((sub, sIdx) => (
                          <li key={`sub-${sIdx}`} className="muted-copy" style={{ margin: "6px 0" }}>
                            {sub}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                /* Syllabus Layout (Checklist Mode) */
                <div className="summary-list" style={{ marginTop: "24px" }}>
                  {Object.entries(groupedChecklist).map(([chapterTitle, items], idx) => (
                    <div
                      key={`checklist-group-${idx}`}
                      className="card"
                      style={{ background: "rgba(255,255,255,0.01)", padding: "16px", border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <h3 style={{ margin: "0 0 16px 0", color: "var(--accent-color, #a855f7)", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                        {chapterTitle}
                      </h3>
                      <div className="stack-card" style={{ gap: "12px" }}>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`summary-item ${item.completed ? "completed-row" : ""}`}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "12px",
                              padding: "10px",
                              borderRadius: "6px",
                              border: "1px solid rgba(255,255,255,0.03)",
                              background: item.completed ? "rgba(168,85,247,0.03)" : "transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => void handleToggleItem(item.id, item.completed)}
                              disabled={!!busyLabel}
                              style={{ width: "18px", height: "18px", marginTop: "2px", cursor: "pointer" }}
                            />
                            <div style={{ flex: 1 }}>
                              <p
                                className="muted-copy"
                                style={{
                                  margin: 0,
                                  textDecoration: item.completed ? "line-through" : "none",
                                  color: item.completed ? "rgba(255,255,255,0.5)" : "var(--foreground-color)",
                                }}
                              >
                                {item.subtopic}
                              </p>
                              {item.completed && item.completedAt && (
                                <small className="text-accent" style={{ display: "block", fontSize: "11px", marginTop: "4px" }}>
                                  ✓ Mastered on {formatDate(item.completedAt)}
                                </small>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>

        {/* Right Column - Syllabus History */}
        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">History</p>
            <h2>My Learning Plans</h2>
          </div>
          <div className="summary-list">
            {history.length ? (
              history.map((item) => (
                <button
                  key={item.id}
                  className={`summary-item summary-item-button ${activeSyllabus?.id === item.id ? "active" : ""}`}
                  onClick={() => void handleSelectSyllabus(item.id)}
                  disabled={!!busyLabel}
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    border: activeSyllabus?.id === item.id ? "1px solid var(--accent-color)" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="summary-item-head">
                    <strong>{item.topic}</strong>
                    <span>
                      {item.converted_to_checklist ? (
                        <span className="text-accent" style={{ fontSize: "11px" }}>Checklist Active</span>
                      ) : (
                        <span className="muted-copy" style={{ fontSize: "11px" }}>Outline View</span>
                      )}
                    </span>
                  </div>
                  {item.converted_to_checklist && item.checklist && (
                    <small className="muted-copy">
                      Progress: {item.checklist.filter((i) => i.completed).length} / {item.checklist.length} subtopics
                    </small>
                  )}
                </button>
              ))
            ) : (
              <p className="muted-copy" style={{ padding: "12px", textAlign: "center" }}>
                No syllabus plans generated yet. Enter a topic above to begin.
              </p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

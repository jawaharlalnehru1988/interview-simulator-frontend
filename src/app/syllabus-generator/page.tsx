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
  deleteSyllabus,
  explainSyllabusSubtopic,
  saveSyllabusExplanation,
  getSavedSyllabusExplanations,
  type SyllabusResponse,
  type AuthState,
  type SyllabusExplanationResponse,
} from "@/lib/api";
import {
  createDefaultSession,
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-light.css";

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

  const [showExplainModal, setShowExplainModal] = useState(false);
  const [modalTopic, setModalTopic] = useState("");
  const [modalSubtopic, setModalSubtopic] = useState("");
  const [modalExplanation, setModalExplanation] = useState("");
  const [modalSaved, setModalSaved] = useState(false);
  const [savedLibrary, setSavedLibrary] = useState<SyllabusExplanationResponse[]>([]);
  const [activeTab, setActiveTab] = useState<"checklist" | "library">("checklist");

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
      setActiveTab("checklist");
      setSavedLibrary([]);
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
      setActiveTab("checklist");
      try {
        const res = await getSavedSyllabusExplanations(session.apiBaseUrl, authState, id);
        setSavedLibrary(res);
      } catch {
        // ignore
      }
    });
  }

  async function handleDeleteSyllabus(id: number) {
    if (!confirm("Are you sure you want to delete this syllabus?")) return;
    await runAction("Deleting Syllabus", async () => {
      await deleteSyllabus(session.apiBaseUrl, authState, id);
      if (activeSyllabus?.id === id) {
        setActiveSyllabus(null);
      }
      await loadHistory();
    });
  }

  async function loadSavedExplanations() {
    if (!activeSyllabus || !session.accessToken) return;
    try {
      const res = await getSavedSyllabusExplanations(
        session.apiBaseUrl,
        authState,
        activeSyllabus.id,
      );
      setSavedLibrary(res);
    } catch {
      // ignore
    }
  }

  async function handleExplain(topicName: string, subtopicName: string) {
    if (!activeSyllabus || !session.accessToken) return;

    setModalTopic(topicName);
    setModalSubtopic(subtopicName);
    setModalExplanation("");
    setModalSaved(false);
    setShowExplainModal(true);

    const alreadySaved = savedLibrary.find(
      (item) => item.topic === topicName && item.subtopic === subtopicName
    );

    if (alreadySaved) {
      setModalExplanation(alreadySaved.explanation);
      setModalSaved(true);
      return;
    }

    await runAction("Generating Explanation", async () => {
      const response = await explainSyllabusSubtopic(
        session.apiBaseUrl,
        authState,
        activeSyllabus.id,
        topicName,
        subtopicName,
      );
      setModalExplanation(response.explanation);
    });
  }

  async function handleRegenerateExplanation() {
    if (!activeSyllabus || !session.accessToken) return;

    setModalExplanation("");
    setModalSaved(false);

    await runAction("Generating Explanation", async () => {
      const response = await explainSyllabusSubtopic(
        session.apiBaseUrl,
        authState,
        activeSyllabus.id,
        modalTopic,
        modalSubtopic,
      );
      setModalExplanation(response.explanation);
    });
  }

  async function handleSaveExplanation() {
    if (!activeSyllabus || !session.accessToken || !modalExplanation) return;

    await runAction("Saving Explanation", async () => {
      await saveSyllabusExplanation(
        session.apiBaseUrl,
        authState,
        activeSyllabus.id,
        modalTopic,
        modalSubtopic,
        modalExplanation,
      );
      setModalSaved(true);
      await loadSavedExplanations();

      // Automatically mark as complete if it's a checklist item
      if (activeSyllabus.converted_to_checklist && activeSyllabus.checklist) {
        const item = activeSyllabus.checklist.find(
          (i) => i.topic === modalTopic && i.subtopic === modalSubtopic
        );
        if (item && !item.completed) {
          const response = await toggleSyllabusChecklistItem(
            session.apiBaseUrl,
            authState,
            activeSyllabus.id,
            item.id,
            true
          );
          setActiveSyllabus(response);
          await loadHistory();
        }
      }
    });
  }

  function handleExportPdf() {
    if (!activeSyllabus) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Syllabus: ${activeSyllabus.topic}`, 14, 22);
    
    let tableData: string[][] = [];
    if (activeSyllabus.converted_to_checklist) {
      tableData = activeSyllabus.checklist.map((item) => [
        item.topic,
        item.subtopic,
        item.completed ? "[x]" : "[ ]",
      ]);
      autoTable(doc, {
        startY: 30,
        head: [["Chapter", "Subtopic", "Completed"]],
        body: tableData,
      });
    } else {
      activeSyllabus.syllabus.forEach(chapter => {
        chapter.subtopics.forEach(sub => {
          tableData.push([chapter.title, sub]);
        });
      });
      autoTable(doc, {
        startY: 30,
        head: [["Chapter", "Subtopic"]],
        body: tableData,
      });
    }
    
    doc.save(`${activeSyllabus.topic.replace(/\\s+/g, '_')}_Syllabus.pdf`);
  }

  function handleExportExcel() {
    if (!activeSyllabus) return;
    
    let exportData: any[] = [];
    if (activeSyllabus.converted_to_checklist) {
      exportData = activeSyllabus.checklist.map((item) => ({
        Chapter: item.topic,
        Subtopic: item.subtopic,
        Completed: item.completed ? "Yes" : "No",
        CompletedAt: item.completed && item.completedAt ? new Date(item.completedAt).toLocaleString() : "",
      }));
    } else {
      activeSyllabus.syllabus.forEach(chapter => {
        chapter.subtopics.forEach(sub => {
          exportData.push({
            Chapter: chapter.title,
            Subtopic: sub,
          });
        });
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Syllabus");
    XLSX.writeFile(workbook, `${activeSyllabus.topic.replace(/\\s+/g, '_')}_Syllabus.xlsx`);
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
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button className="ghost-button" onClick={handleExportPdf} title="Download PDF" style={{ padding: "6px 12px", fontSize: "14px", display: "flex", gap: "6px", alignItems: "center" }}>
                    📄 PDF
                  </button>
                  <button className="ghost-button" onClick={handleExportExcel} title="Download Excel" style={{ padding: "6px 12px", fontSize: "14px", display: "flex", gap: "6px", alignItems: "center" }}>
                    📊 Excel
                  </button>
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

              {/* Tab Selector */}
              <div className="tab-container" style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "8px", marginBottom: "16px", marginTop: "16px" }}>
                <button
                  className={`ghost-button ${activeTab === "checklist" ? "primary-button" : ""}`}
                  type="button"
                  onClick={() => setActiveTab("checklist")}
                  style={{
                    padding: "6px 16px",
                    fontSize: "13px",
                    height: "auto",
                    minHeight: "unset",
                    background: activeTab === "checklist" ? "linear-gradient(135deg, #b44f2b, #d77645)" : "transparent",
                    color: activeTab === "checklist" ? "white" : "var(--foreground-color)",
                    border: activeTab === "checklist" ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {activeSyllabus.converted_to_checklist ? "Checklist Tracker" : "Syllabus Outline"}
                </button>
                <button
                  className={`ghost-button ${activeTab === "library" ? "primary-button" : ""}`}
                  type="button"
                  onClick={() => {
                    setActiveTab("library");
                    void loadSavedExplanations();
                  }}
                  style={{
                    padding: "6px 16px",
                    fontSize: "13px",
                    height: "auto",
                    minHeight: "unset",
                    background: activeTab === "library" ? "linear-gradient(135deg, #b44f2b, #d77645)" : "transparent",
                    color: activeTab === "library" ? "white" : "var(--foreground-color)",
                    border: activeTab === "library" ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Saved Library ({savedLibrary.length})
                </button>
              </div>

              {/* Syllabus Layout (Outline Mode / Checklist Mode / Library Mode) */}
              {activeTab === "checklist" ? (
                !activeSyllabus.converted_to_checklist ? (
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
                            <li
                              key={`sub-${sIdx}`}
                              className="muted-copy"
                              style={{ margin: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            >
                              <span>{sub}</span>
                              <button
                                className="ghost-button"
                                type="button"
                                onClick={() => void handleExplain(chapter.title, sub)}
                                disabled={!!busyLabel}
                                style={{ padding: "4px 8px", fontSize: "12px", height: "auto", minHeight: "unset" }}
                              >
                                {savedLibrary.some(item => item.topic === chapter.title && item.subtopic === sub) ? "Go to topic" : "Explain"}
                              </button>
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
                              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <p
                                    className="muted-copy"
                                    style={{
                                      margin: 0,
                                      textDecoration: item.completed ? "line-through" : "none",
                                      color: item.completed ? "var(--muted)" : "var(--foreground-color)",
                                      opacity: item.completed ? 0.6 : 1,
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
                                <button
                                  className="ghost-button"
                                  type="button"
                                  onClick={() => void handleExplain(item.topic, item.subtopic)}
                                  disabled={!!busyLabel}
                                  style={{ padding: "4px 8px", fontSize: "12px", height: "auto", minHeight: "unset" }}
                                >
                                  {savedLibrary.some(saved => saved.topic === item.topic && saved.subtopic === item.subtopic) ? "Go to topic" : "Explain"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Syllabus Layout (Library Mode) */
                <div className="stack-card" style={{ gap: "16px", marginTop: "20px" }}>
                  {savedLibrary.length === 0 ? (
                    <p className="muted-copy" style={{ textAlign: "center", padding: "32px 0" }}>
                      No explanations saved in the library yet. Click "Explain" on any subtopic and save it to build your custom guide.
                    </p>
                  ) : (
                    savedLibrary.map((item) => (
                      <LibraryItem key={item.id} item={item} onExplain={handleExplain} />
                    ))
                  )}
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
                <div
                  key={item.id}
                  className={`summary-item ${activeSyllabus?.id === item.id ? "active" : ""}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "12px",
                    border: activeSyllabus?.id === item.id ? "1px solid var(--accent-color)" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    onClick={() => void handleSelectSyllabus(item.id)}
                    style={{ flex: 1, cursor: "pointer", textAlign: "left" }}
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
                  </div>
                  <button
                    className="ghost-button"
                    title="Delete"
                    onClick={() => void handleDeleteSyllabus(item.id)}
                    disabled={!!busyLabel}
                    style={{ padding: "4px 8px", fontSize: "14px", minHeight: "unset", height: "auto", marginLeft: "8px", color: "var(--error-color, #ef4444)" }}
                  >
                    🗑
                  </button>
                </div>
              ))
            ) : (
              <p className="muted-copy" style={{ padding: "12px", textAlign: "center" }}>
                No syllabus plans generated yet. Enter a topic above to begin.
              </p>
            )}
          </div>
        </article>
      </section>

      {/* Explanation Modal Overlay */}
      {showExplainModal && (
        <div className="modal-overlay" onClick={() => setShowExplainModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(720px, calc(100% - 32px))", maxHeight: "95vh", display: "flex", flexDirection: "column", padding: "20px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px", marginBottom: "0px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flex: 1, overflow: "hidden" }}>
                <span className="text-accent" style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {modalTopic}
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {modalSubtopic}
                </span>
              </div>
              <button
                className="ghost-button"
                onClick={() => setShowExplainModal(false)}
                style={{ padding: "4px 8px", fontSize: "14px", height: "auto", minHeight: "unset", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px", margin: "8px 0" }}>
              {!modalExplanation && busyLabel === "Generating Explanation" ? (
                <div className="stack-card" style={{ alignItems: "center", padding: "40px 0" }}>
                  <div className="loading-spinner" />
                  <p className="muted-copy">Generating AI explanation for {modalSubtopic}...</p>
                </div>
              ) : (
                <div className="coach-lesson markdown-body" style={{ overflowX: "auto" }}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[[rehypeHighlight, { detect: true }]]}
                  >
                    {modalExplanation}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div className="button-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px", display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "auto" }}>
              <button
                className="ghost-button"
                onClick={handleRegenerateExplanation}
                disabled={busyLabel === "Generating Explanation"}
                style={{ padding: "6px 12px", fontSize: "13px", height: "auto", minHeight: "32px" }}
              >
                {busyLabel === "Generating Explanation" ? "Regenerating..." : "Regenerate"}
              </button>
              <button
                className="primary-button"
                onClick={handleSaveExplanation}
                disabled={modalSaved || busyLabel === "Generating Explanation" || busyLabel === "Saving Explanation" || !modalExplanation}
                style={{ padding: "6px 12px", fontSize: "13px", height: "auto", minHeight: "32px" }}
              >
                {modalSaved ? "✓ Saved to Library" : busyLabel === "Saving Explanation" ? "Saving..." : "Save to Library"}
              </button>
              <button
                className="secondary-button"
                onClick={() => setShowExplainModal(false)}
                style={{ padding: "6px 12px", fontSize: "13px", height: "auto", minHeight: "32px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Collapsible item for explanations library
function LibraryItem({
  item,
  onExplain,
}: {
  item: SyllabusExplanationResponse;
  onExplain: (topic: string, subtopic: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{
        background: "rgba(255, 255, 255, 0.01)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        padding: "16px",
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <small className="text-accent" style={{ fontSize: "11px", display: "block" }}>
            {item.topic}
          </small>
          <strong style={{ fontSize: "1.1rem" }}>{item.subtopic}</strong>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="ghost-button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExplain(item.topic, item.subtopic);
            }}
            style={{ padding: "4px 10px", fontSize: "12px", height: "auto", minHeight: "unset" }}
          >
            Explain Mode
          </button>
          <span style={{ fontSize: "16px" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div
          style={{
            marginTop: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            paddingTop: "16px",
          }}
        >
          <div className="coach-lesson markdown-body" style={{ overflowX: "auto" }}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeHighlight, { detect: true }]]}
            >
              {item.explanation}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { loadClientSession } from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080";

interface Question {
  question: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  hint: string;
  answers?: string[]; // optionally stores generated answers
}

interface SavedAnalysis {
  id: number;
  resumeFilename: string;
  extractedText: string;
  questions: Question[];
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Technical":            "#6366f1",
  "Technical Skill-Based":"#8b5cf6",
  "Behavioral":           "#10b981",
  "Situational":          "#f59e0b",
  "Project-Based":        "#ec4899",
  "Career Gap":           "#f97316",
  "Job Switching":        "#ef4444",
  "Leadership":           "#06b6d4",
  "Cultural Fit":         "#84cc16",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   "#10b981",
  Medium: "#f59e0b",
  Hard:   "#ef4444",
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#6366f1";
}

// ─── Answer Panel ─────────────────────────────────────────────────────────────
interface AnswerPanelProps {
  question: Question;
  resumeContext: string;
  accessToken: string;
  savedAnalysisId?: number;
  onAnswersFetched: (answers: string[]) => void;
}

function AnswerPanel({ question, resumeContext, accessToken, savedAnalysisId, onAnswersFetched }: AnswerPanelProps) {
  const [answers, setAnswers] = useState<string[]>(question.answers || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchAnswers() {
    if (answers.length > 0) return; // already loaded (either previously fetched or from saved data)
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/resume/answers/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ question: question.question, resumeContext, savedAnalysisId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const raw = data.answers;
      const list: string[] = Array.isArray(raw) ? raw : [];
      setAnswers(list);
      onAnswersFetched(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch answers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAnswers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "16px 20px 16px 62px", borderTop: "1px solid var(--border, #1e1e30)" }}>
        <p className="muted-copy" style={{ margin: 0, fontSize: "0.83rem" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: "8px", verticalAlign: "middle" }} />
          Generating possible answers…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "12px 20px 14px 62px", borderTop: "1px solid var(--border, #1e1e30)" }}>
        <p style={{ margin: 0, color: "#f87171", fontSize: "0.83rem" }}>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 18px 62px", borderTop: "1px solid var(--border, #1e1e30)" }}>
      <p style={{ margin: "12px 0 10px", fontWeight: 700, fontSize: "0.82rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        💬 Possible Answers
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {answers.map((ans, i) => (
          <div
            key={i}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.15)",
              fontSize: "0.87rem",
              lineHeight: 1.65,
              position: "relative",
            }}
          >
            <span style={{
              position: "absolute", top: "10px", left: "12px",
              fontSize: "0.65rem", fontWeight: 700, opacity: 0.4,
            }}>
              {i + 1}
            </span>
            <span style={{ paddingLeft: "16px", display: "block" }}>{ans}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResumeAnalyzerPage() {
  const [accessToken, setAccessToken] = useState("");
  const [viewMode, setViewMode] = useState<"new" | "saved">("new");
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

  // Current analysis state
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [resumeFilename, setResumeFilename] = useState("");
  const [extractedLength, setExtractedLength] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showAnswersIdx, setShowAnswersIdx] = useState<number | null>(null);
  
  // Save State
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = loadClientSession(DEFAULT_API_BASE_URL);
    setAccessToken(session.accessToken);
  }, []);

  useEffect(() => {
    if (accessToken) {
      void fetchSavedAnalyses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, viewMode]);

  async function fetchSavedAnalyses() {
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/resume/saved/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedAnalyses(data);
      }
    } catch (e) {
      console.error("Failed to fetch saved analyses", e);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== "application/pdf") { setError("Only PDF files are supported."); return; }
    setFile(f);
    setError("");
    setQuestions([]);
    setExtractedText("");
    setExtractedLength(null);
    setExpandedIdx(null);
    setShowAnswersIdx(null);
    setSaveSuccess(false);
    setCurrentSavedId(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(f ? URL.createObjectURL(f) : null);
    if (f) setResumeFilename(f.name);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF files are supported."); return; }
    setFile(f);
    setError("");
    setQuestions([]);
    setExtractedText("");
    setExtractedLength(null);
    setSaveSuccess(false);
    setCurrentSavedId(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(f));
    setResumeFilename(f.name);
  }

  async function handleAnalyze() {
    if (!file) { setError("Please select a PDF file first."); return; }
    setLoading(true);
    setError("");
    setQuestions([]);
    setShowAnswersIdx(null);
    setExpandedIdx(null);
    setSaveSuccess(false);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/resume/analyze/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      const qs: Question[] = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(qs);
      setExtractedLength(data.extractedTextLength ?? null);
      setExtractedText(data.extractedText ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestionAnswers(idx: number, answers: string[]) {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], answers };
      return next;
    });
  }

  async function handleSaveAnalysis() {
    if (questions.length === 0) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const url = currentSavedId 
        ? `${DEFAULT_API_BASE_URL}/api/resume/save/${currentSavedId}`
        : `${DEFAULT_API_BASE_URL}/api/resume/save/`;
      const method = currentSavedId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          resumeFilename: resumeFilename || "Resume",
          extractedText,
          questions
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      if (!currentSavedId) setCurrentSavedId(data.id);
      setSaveSuccess(true);
      void fetchSavedAnalyses();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      alert("Failed to save analysis.");
    } finally {
      setSaving(false);
    }
  }

  function loadSavedAnalysis(saved: SavedAnalysis) {
    try {
      const qs = saved.questions || [];
      setQuestions(qs);
      setExtractedText(saved.extractedText);
      setExtractedLength(saved.extractedText.length);
      setResumeFilename(saved.resumeFilename);
      setExpandedIdx(null);
      setShowAnswersIdx(null);
      setSaveSuccess(false);
      setError("");
      setCurrentSavedId(saved.id);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setViewMode("new"); // Switch back to main view but with loaded data
    } catch(e) {
      alert("Error loading saved analysis data.");
    }
  }

  if (!accessToken) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">Resume Analyzer</p>
            <h1>This route needs an authenticated session.</h1>
          </div>
          <div className="hero-links">
            <Link className="primary-button link-button" href="/auth">Go to auth route</Link>
          </div>
        </section>
      </main>
    );
  }

  const allCategories = ["All", ...Array.from(new Set(questions.map((q) => q.category)))];
  const filtered = filter === "All" ? questions : questions.filter((q) => q.category === filter);

  return (
    <main className="shell route-shell">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Hero */}
      <section className="route-hero">
        <div>
          <p className="eyebrow">AI Analysis</p>
          <h1>Resume Analyzer</h1>
          <p className="hero-copy">
            Upload your resume as a PDF. The AI panel generates <strong>50 tailored interview questions</strong> across
            9 categories — technical, behavioral, project-based, career gaps, job switching, and more.
            Click any question to see <strong>possible answers</strong> to help you prepare.
          </p>
        </div>
        <div className="hero-links" style={{ display: "flex", gap: "10px" }}>
          <button
            className={viewMode === "new" ? "primary-button" : "secondary-button"}
            onClick={() => {
              setViewMode("new");
              setQuestions([]);
              setFile(null);
              setResumeFilename("");
              setExtractedText("");
              setCurrentSavedId(null);
              if (pdfUrl) URL.revokeObjectURL(pdfUrl);
              setPdfUrl(null);
            }}
          >
            + New Analysis
          </button>
          <button
            className={viewMode === "saved" ? "primary-button" : "secondary-button"}
            onClick={() => setViewMode("saved")}
          >
            🗂️ View Saved ({savedAnalyses.length})
          </button>
        </div>
      </section>

      {viewMode === "saved" ? (
        // Saved Analyses View
        <section className="route-grid" style={{ marginBottom: "32px" }}>
          {savedAnalyses.length === 0 ? (
            <article className="card full-card">
              <p className="muted-copy">No saved analyses found. Go to <strong>New Analysis</strong> to create one.</p>
            </article>
          ) : (
            savedAnalyses.map(saved => (
              <article key={saved.id} className="card stack-card">
                <div className="card-heading">
                  <p className="eyebrow">{new Date(saved.createdAt).toLocaleString()}</p>
                  <h2 style={{ fontSize: "1.1rem" }}>{saved.resumeFilename || "Resume"}</h2>
                </div>
                <p className="muted-copy" style={{ fontSize: "0.85rem" }}>
                  {saved.extractedText.length.toLocaleString()} characters extracted
                </p>
                <button className="primary-button" onClick={() => loadSavedAnalysis(saved)}>
                  Load Saved Analysis
                </button>
              </article>
            ))
          )}
        </section>
      ) : (
        // New / Active Analysis View
        <>
          {/* Upload Card */}
          <section className="route-grid" style={{ marginBottom: "32px" }}>
            <article className="card full-card stack-card" style={{ gap: "20px" }}>
              <div className="card-heading">
                <p className="eyebrow">Step 1 — Upload</p>
                <h2>{questions.length > 0 && !file ? "Loaded Resume: " + resumeFilename : "Select Your Resume PDF"}</h2>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragging ? "var(--accent, #6366f1)" : "var(--border, #2a2a40)"}`,
                  borderRadius: "12px", padding: "40px 20px", textAlign: "center",
                  cursor: "pointer", background: dragging ? "rgba(99,102,241,0.06)" : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {file ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "2.5rem" }}>📄</span>
                    <strong style={{ fontSize: "1rem" }}>{file.name}</strong>
                    <span className="muted-copy" style={{ fontSize: "0.8rem" }}>{(file.size / 1024).toFixed(1)} KB — click to change</span>
                  </div>
                ) : questions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                     <span style={{ fontSize: "2.5rem" }}>📂</span>
                     <strong style={{ fontSize: "1rem" }}>{resumeFilename}</strong>
                     <span className="muted-copy" style={{ fontSize: "0.8rem" }}>Currently reviewing saved analysis. Click to upload a different PDF.</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "2.5rem", opacity: 0.4 }}>📤</span>
                    <p style={{ margin: 0, fontWeight: 600 }}>Click or drag & drop your PDF here</p>
                    <p className="muted-copy" style={{ margin: 0, fontSize: "0.82rem" }}>Only PDF files are supported.</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: "none" }} />

              {pdfUrl && (
                <div style={{ marginTop: "10px" }}>
                  <p className="eyebrow">PDF Preview</p>
                  <iframe src={pdfUrl} width="100%" height="400px" style={{ border: "1px solid var(--border, #2a2a40)", borderRadius: "8px" }} />
                </div>
              )}
              
              {!pdfUrl && currentSavedId !== null && extractedText && (
                <div style={{ marginTop: "10px" }}>
                  <p className="eyebrow">Extracted Text Preview (PDF not stored)</p>
                  <div style={{ maxHeight: "300px", overflowY: "auto", padding: "16px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", fontSize: "0.85rem", whiteSpace: "pre-wrap", border: "1px solid var(--border, #2a2a40)" }}>
                    {extractedText}
                  </div>
                </div>
              )}

              {error && (
                <p style={{ margin: 0, color: "#f87171", fontSize: "0.85rem", background: "rgba(248,113,113,0.1)", padding: "10px 14px", borderRadius: "8px" }}>
                  ⚠️ {error}
                </p>
              )}

              {(!questions.length || file) && (
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <button
                    type="button" className="primary-button" onClick={handleAnalyze}
                    disabled={loading || !file}
                    style={{ minWidth: "200px" }}
                  >
                    {loading ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                        Analyzing…
                      </span>
                    ) : "🔍 Analyze Resume"}
                  </button>
                  {loading && (
                    <p className="muted-copy" style={{ fontSize: "0.82rem", margin: 0 }}>
                      Extracting text & generating 50 questions via AI… ~20–40 seconds.
                    </p>
                  )}
                </div>
              )}
            </article>
          </section>

          {/* Results */}
          {questions.length > 0 && (
            <>
              {/* Stats + filter bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <p className="eyebrow" style={{ margin: 0 }}>Step 2 — Prepare</p>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{questions.length} questions loaded</span>
                    {extractedLength && (
                      <span className="muted-copy" style={{ fontSize: "0.8rem", display: "none" }}>· {extractedLength.toLocaleString()} characters extracted</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {saveSuccess && <span style={{ color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>✅ Saved successfully</span>}
                    <button 
                      className="secondary-button" 
                      onClick={handleSaveAnalysis} 
                      disabled={saving}
                      style={{ border: "1px solid var(--accent, #6366f1)" }}
                    >
                      {saving ? "Saving..." : (currentSavedId === null ? "💾 Save Analysis to Dashboard" : "💾 Update Analysis")}
                    </button>
                  </div>
                </div>

                {/* Category filter pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {allCategories.map((cat) => {
                    const count = cat === "All" ? questions.length : questions.filter((q) => q.category === cat).length;
                    const color = getCategoryColor(cat);
                    const isActive = filter === cat;
                    return (
                      <button
                        key={cat} type="button" onClick={() => setFilter(cat)}
                        style={{
                          padding: "5px 14px", borderRadius: "999px", cursor: "pointer",
                          fontSize: "0.8rem", fontWeight: 600, transition: "all 0.15s",
                          border: `1px solid ${isActive ? color : "var(--border, #334)"}`,
                          background: isActive ? color : "transparent",
                          color: isActive ? "#fff" : "inherit",
                        }}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question accordion */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filtered.map((q) => {
                  const globalIdx = questions.indexOf(q);
                  const isOpen = expandedIdx === globalIdx;
                  const showAnswers = showAnswersIdx === globalIdx;
                  const catColor = getCategoryColor(q.category);
                  const hasAnswers = q.answers && q.answers.length > 0;

                  return (
                    <article
                      key={globalIdx}
                      style={{
                        border: "1px solid var(--border, #2a2a40)",
                        borderRadius: "12px", overflow: "hidden",
                        borderLeft: `3px solid ${catColor}`,
                      }}
                    >
                      {/* Question row */}
                      <div style={{ display: "flex", alignItems: "flex-start", padding: "14px 16px", gap: "12px" }}>
                        {/* Number */}
                        <span style={{
                          minWidth: "26px", height: "26px", borderRadius: "50%",
                          background: catColor, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, marginTop: "2px",
                        }}>
                          {globalIdx + 1}
                        </span>

                        {/* Text + badges */}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: "0.93rem", lineHeight: 1.55 }}>
                            {q.question}
                          </p>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: "999px", background: catColor, color: "#fff" }}>
                              {q.category}
                            </span>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: "999px", border: `1px solid ${DIFFICULTY_COLORS[q.difficulty]}`, color: DIFFICULTY_COLORS[q.difficulty] }}>
                              {q.difficulty}
                            </span>
                            {hasAnswers && (
                               <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: "999px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                                 ✓ Answers Generated
                               </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => { setExpandedIdx(isOpen ? null : globalIdx); }}
                            style={{
                              padding: "5px 12px", borderRadius: "8px", cursor: "pointer",
                              fontSize: "0.75rem", fontWeight: 600, border: "1px solid var(--border, #334)",
                              background: isOpen ? "rgba(99,102,241,0.15)" : "transparent",
                              color: "inherit", transition: "all 0.15s",
                            }}
                          >
                            {isOpen ? "▴ Hide Hint" : "▾ Hint"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAnswersIdx(showAnswers ? null : globalIdx); }}
                            style={{
                              padding: "5px 14px", borderRadius: "8px", cursor: "pointer",
                              fontSize: "0.75rem", fontWeight: 600,
                              border: `1px solid ${showAnswers || hasAnswers ? catColor : "var(--border, #334)"}`,
                              background: showAnswers || hasAnswers ? catColor : "transparent",
                              color: showAnswers || hasAnswers ? "#fff" : "inherit",
                              transition: "all 0.15s",
                            }}
                          >
                            💬 {hasAnswers ? "View Answers" : "Generate Answers"}
                          </button>
                          {hasAnswers && (
                            <button
                              type="button"
                              onClick={() => handleSaveAnalysis()}
                              disabled={saving}
                              style={{
                                padding: "5px 14px", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer",
                                fontSize: "0.75rem", fontWeight: 600,
                                border: "1px solid var(--border, #334)",
                                background: "rgba(16, 185, 129, 0.1)",
                                color: "#10b981",
                                transition: "all 0.15s",
                              }}
                            >
                              {saving ? "Saving..." : "💾 Save Answer"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hint panel */}
                      {isOpen && (
                        <div style={{ padding: "10px 16px 16px 54px", borderTop: "1px solid var(--border, #1e1e30)", background: "rgba(99,102,241,0.03)" }}>
                          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.85, lineHeight: 1.6 }}>
                            <strong>💡 Interviewer hint:</strong> {q.hint}
                          </p>
                        </div>
                      )}

                      {showAnswers && (
                        <AnswerPanel
                          question={q}
                          resumeContext={extractedText}
                          accessToken={accessToken}
                          savedAnalysisId={currentSavedId ?? undefined}
                          onAnswersFetched={(answers) => updateQuestionAnswers(globalIdx, answers)}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

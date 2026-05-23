"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-light.css";
import Editor from "@monaco-editor/react";
import { useTopics } from "@/context/TopicContext";
import {
  ApiError,
  startCodingTest,
  submitCodingApproach,
  submitCodingDirect,
  submitCodingCode,
  type AuthState,
  type SubmitCodingCodeResponse,
  type SubmitCodingDirectResponse,
} from "@/lib/api";
import {
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const PREDEFINED_TOPICS = ["Java", "Javascript"];

const DIFFICULTY_LEVELS: Array<"SUPER_EASY" | "EASY" | "MEDIUM" | "HARD" | "HARDER"> = [
  "SUPER_EASY",
  "EASY",
  "MEDIUM",
  "HARD",
  "HARDER",
];

export default function CodingPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    loadClientSession(DEFAULT_API_BASE_URL)
  );
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busyLabel, setBusyLabel] = useState("");

  const { topics, setIsAddTopicOpen } = useTopics();
  const [prevTopicsLength, setPrevTopicsLength] = useState(0);

  // Quiz Setup State
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"SUPER_EASY" | "EASY" | "MEDIUM" | "HARD" | "HARDER">("MEDIUM");
  const [customDescription, setCustomDescription] = useState("");

  useEffect(() => {
    if (topics.length > prevTopicsLength) {
      if (prevTopicsLength > 0) {
        setTopic(topics[0].name);
      } else if (!topic || !topics.some(t => t.name === topic)) {
        setTopic(topics[0].name);
      }
    }
    setPrevTopicsLength(topics.length);
  }, [topics, prevTopicsLength, topic]);

  // Active Session State
  const [activeInterviewId, setActiveInterviewId] = useState<number | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");

  // Phase-based state for Medium/Hard/Harder
  const [currentPhase, setCurrentPhase] = useState<"APPROACH" | "CODING" | "COMPLETED">("APPROACH");
  const [approachText, setApproachText] = useState("");
  const [approachFeedback, setApproachFeedback] = useState("");
  const [approachApproved, setApproachApproved] = useState(false);

  // Editor Templates and User Code
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [templates, setTemplates] = useState<Record<string, string>>({
    java: "",
    javascript: "",
  });
  const [userCode, setUserCode] = useState("");

  // Direct Output/Complexity State for Super Easy / Easy
  const [directAnswer, setDirectAnswer] = useState("");
  const [directResult, setDirectResult] = useState<SubmitCodingDirectResponse | null>(null);

  // Scorecard / Completed State
  const [codingResult, setCodingResult] = useState<SubmitCodingCodeResponse | null>(null);

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

  async function handleStartCodingSession(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setBusyLabel("Generating Challenge...");

    try {
      const response = await startCodingTest(session.apiBaseUrl, authState, {
        topic,
        difficulty,
        description: customDescription,
      });

      setActiveInterviewId(response.interview_id);
      setActiveQuestionId(response.question_id);
      setQuestionText(response.question_text);

      // Reset test states
      setApproachText("");
      setApproachFeedback("");
      setApproachApproved(false);
      setUserCode("");
      setDirectAnswer("");
      setDirectResult(null);
      setCodingResult(null);

      const isDirect = difficulty === "SUPER_EASY" || difficulty === "EASY";
      setCurrentPhase(isDirect ? "CODING" : "APPROACH");
      setSelectedLanguage(topic.toLowerCase() === "java" ? "java" : "javascript");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to start coding session."
      );
    } finally {
      setBusyLabel("");
    }
  }

  async function handleSubmitApproach(event: FormEvent) {
    event.preventDefault();
    if (!activeInterviewId || !activeQuestionId) return;
    if (!approachText.trim()) {
      setErrorMessage("Please describe your approach.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setBusyLabel("Evaluating Approach...");

    try {
      const response = await submitCodingApproach(
        session.apiBaseUrl,
        authState,
        activeInterviewId,
        activeQuestionId,
        { approach: approachText }
      );

      setApproachFeedback(response.feedback);
      setApproachApproved(response.approved);

      if (response.approved) {
        setTemplates({
          java: response.java_template ?? "",
          javascript: response.javascript_template ?? "",
        });
        // Pre-populate editor code based on selected language
        const lang = selectedLanguage === "java" ? "java" : "javascript";
        setUserCode(lang === "java" ? (response.java_template ?? "") : (response.javascript_template ?? ""));
        setCurrentPhase("CODING");
        setSuccessMessage("Approach Approved! Proceed to the coding challenge.");
      } else {
        setErrorMessage("Approach rejected. Please read the critique and try another strategy.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to submit approach."
      );
    } finally {
      setBusyLabel("");
    }
  }

  async function handleSubmitDirectAnswer(event: FormEvent) {
    event.preventDefault();
    if (!activeInterviewId || !activeQuestionId) return;
    if (!directAnswer.trim()) {
      setErrorMessage("Please enter an answer.");
      return;
    }

    setErrorMessage("");
    setBusyLabel("Evaluating Answer...");

    try {
      const response = await submitCodingDirect(
        session.apiBaseUrl,
        authState,
        activeInterviewId,
        activeQuestionId,
        { answer: directAnswer }
      );

      setDirectResult(response);
      setCurrentPhase("COMPLETED");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to submit answer."
      );
    } finally {
      setBusyLabel("");
    }
  }

  async function handleSubmitCode() {
    if (!activeInterviewId || !activeQuestionId) return;
    if (!userCode.trim()) {
      setErrorMessage("Write your code solution before submitting.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setBusyLabel("Grading Solution...");

    try {
      const response = await submitCodingCode(
        session.apiBaseUrl,
        authState,
        activeInterviewId,
        activeQuestionId,
        {
          language: selectedLanguage,
          code: userCode,
        }
      );

      setCodingResult(response);
      setCurrentPhase("COMPLETED");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to grade solution."
      );
    } finally {
      setBusyLabel("");
    }
  }

  function handleLanguageChange(newLang: string) {
    setSelectedLanguage(newLang);
    if (newLang === "java") {
      setUserCode(templates.java);
    } else {
      setUserCode(templates.javascript);
    }
  }

  function handleReset() {
    setActiveInterviewId(null);
    setActiveQuestionId(null);
    setQuestionText("");
    setApproachText("");
    setApproachFeedback("");
    setApproachApproved(false);
    setUserCode("");
    setDirectAnswer("");
    setDirectResult(null);
    setCodingResult(null);
    setErrorMessage("");
    setSuccessMessage("");
    setCustomDescription("");
  }

  if (!ready) {
    return (
      <main className="shell route-shell">
        <p className="muted-copy">Loading session...</p>
      </main>
    );
  }

  if (!session.accessToken) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">Coding Test Hub</p>
            <h1>This workspace needs an authenticated session.</h1>
            <p className="hero-copy">
              Please log in first before attempting a customized Coding workspace interview.
            </p>
          </div>
          <div className="hero-links">
            <Link className="primary-button link-button" href="/auth">
              Go to auth route
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell route-shell">
      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}
      {successMessage ? <p className="banner success">{successMessage}</p> : null}

      {/* State 1: Setup View */}
      {!activeInterviewId && (
        <article className="card stack-card" style={{ maxWidth: "680px", margin: "0 auto", width: "100%" }}>
          <div className="card-heading">
            <p className="eyebrow">Coding Interview Sandbox</p>
            <h2>Start a coding round</h2>
            <p className="muted-copy">
              Simulate standard output prediction, time/space complexity calculations, or multi-phase LeetCode-style interviews.
            </p>
          </div>

          <form className="stack-card" onSubmit={handleStartCodingSession}>
            <label className="field">
              <span>Select Technology Stack</span>
              <select
                value={topic}
                onChange={(e) => {
                  if (e.target.value === "add_new_topic") {
                    setIsAddTopicOpen(true);
                  } else {
                    setTopic(e.target.value);
                  }
                }}
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
                <option value="add_new_topic">➕ Add new topic...</option>
              </select>
            </label>

            <div className="field">
              <span>Difficulty Level</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                {DIFFICULTY_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`secondary-button ${difficulty === lvl ? "active-badge" : ""}`}
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.875rem",
                      border: difficulty === lvl ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: difficulty === lvl ? "var(--accent-dim)" : "transparent",
                      color: "var(--foreground)",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    {lvl.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Custom Specifications (Optional)</span>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="e.g. Focus on recursive algorithms, bitwise logic, or scenario based data trees."
                rows={3}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)" }}
              />
            </label>

            <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
              {busyLabel || "Generate Challenge"}
            </button>
          </form>
        </article>
      )}

      {/* State 2: Active Coding Workspace (Split Panel Grid) */}
      {activeInterviewId && currentPhase !== "COMPLETED" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px", minHeight: "calc(100vh - 200px)" }}>
          
          {/* Left Panel: Description & Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <article className="card stack-card" style={{ flex: 1, overflowY: "auto", maxHeight: "700px" }}>
              <div className="card-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="badge" style={{ background: "var(--accent)", color: "white" }}>
                    Difficulty: {difficulty}
                  </span>
                  <span className="badge" style={{ marginLeft: "8px", background: "var(--bg-secondary)" }}>
                    Topic: {topic}
                  </span>
                </div>
                <button className="ghost-button" onClick={handleReset} style={{ color: "var(--error)" }}>
                  Exit
                </button>
              </div>

              <div className="markdown-body" style={{ marginTop: "16px", lineHeight: "1.6" }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[[rehypeHighlight, { detect: true }]]}
                >
                  {questionText}
                </ReactMarkdown>
              </div>
            </article>

            {/* Approach Input Block (For Medium/Hard/Harder in Approach Phase) */}
            {currentPhase === "APPROACH" && (
              <article className="card stack-card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "8px" }}>
                  Step 1: Explain Your Approach
                </h3>
                <p className="muted-copy" style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
                  Briefly explain your strategy, time & space complexities. AI will review it before approving coding access.
                </p>

                <form onSubmit={handleSubmitApproach} className="stack-card">
                  <textarea
                    rows={4}
                    value={approachText}
                    onChange={(e) => setApproachText(e.target.value)}
                    placeholder="e.g. I will use a two-pointer technique to swap characters, achieving O(N) time and O(1) auxiliary space."
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)" }}
                    required
                  />

                  {approachFeedback && (
                    <div style={{
                      padding: "12px",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      border: approachApproved ? "1px solid var(--success)" : "1px solid var(--error)",
                      background: approachApproved ? "var(--success-dim)" : "var(--error-dim)",
                      marginTop: "12px"
                    }}>
                      <strong>Interviewer Critique:</strong> {approachFeedback}
                    </div>
                  )}

                  <button className="primary-button" type="submit" disabled={Boolean(busyLabel)} style={{ marginTop: "10px" }}>
                    {busyLabel || "Submit Approach"}
                  </button>
                </form>
              </article>
            )}
          </div>

          {/* Right Panel: Code Workspace */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            
            {/* Editor Console wrapper */}
            {(difficulty === "SUPER_EASY" || difficulty === "EASY") ? (
              /* Super Easy & Easy Input Console */
              <article className="card stack-card" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "12px" }}>
                  Write Your Answer
                </h3>
                <p className="muted-copy" style={{ marginBottom: "16px" }}>
                  Trace the output or complexity and write your final conclusion below.
                </p>
                <form onSubmit={handleSubmitDirectAnswer} className="stack-card">
                  <textarea
                    rows={8}
                    value={directAnswer}
                    onChange={(e) => setDirectAnswer(e.target.value)}
                    placeholder="Provide your exact output, calculations, or explanations..."
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)" }}
                    required
                  />
                  <button className="primary-button" type="submit" disabled={Boolean(busyLabel)} style={{ marginTop: "16px" }}>
                    {busyLabel || "Submit Answer"}
                  </button>
                </form>
              </article>
            ) : (
              /* LeetCode Split Workspace (Monaco Editor) */
              <article className="card stack-card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Select Language:</span>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: "6px", background: "var(--bg-secondary)", color: "var(--foreground)" }}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="java">Java</option>
                    </select>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => handleLanguageChange(selectedLanguage)}
                    style={{ fontSize: "0.85rem", color: "var(--muted)" }}
                  >
                    Reset Code
                  </button>
                </div>

                <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", minHeight: "450px" }}>
                  <Editor
                    height="100%"
                    language={selectedLanguage}
                    theme="vs-dark"
                    value={userCode}
                    onChange={(val) => setUserCode(val ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineHeight: 20,
                      automaticLayout: true,
                      tabSize: 4,
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", gap: "12px" }}>
                  <button
                    className="primary-button"
                    style={{ background: "#29603a", color: "white" }}
                    onClick={handleSubmitCode}
                    disabled={Boolean(busyLabel)}
                  >
                    {busyLabel || "Submit Code Solution"}
                  </button>
                </div>
              </article>
            )}

          </div>
        </div>
      )}

      {/* State 3: Final Grading / completed Scorecard View */}
      {currentPhase === "COMPLETED" && (
        <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Direct Answer Complexity Result Card */}
          {directResult && (
            <article className="card stack-card" style={{ padding: "40px", textAlign: "center" }}>
              <p className="eyebrow">Evaluation Result</p>
              <div style={{ margin: "24px auto", position: "relative", width: "160px", height: "160px", borderRadius: "50%", border: "10px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
                <div>
                  <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--foreground)" }}>
                    {directResult.score}
                  </div>
                  <div style={{ fontSize: "1rem", color: "var(--muted)" }}>
                    out of 100
                  </div>
                </div>
              </div>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "16px" }}>
                Score: {directResult.score}/100
              </h2>
              <div style={{ textAlign: "left", padding: "16px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", marginTop: "12px" }}>
                <strong>Explanation:</strong>
                <p style={{ marginTop: "8px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{directResult.explanation}</p>
              </div>
              <button className="primary-button" onClick={handleReset} style={{ marginTop: "24px" }}>
                Try Another Challenge
              </button>
            </article>
          )}

          {/* Monaco LeetCode Code Result Card */}
          {codingResult && (
            <>
              <article className="card stack-card" style={{ padding: "40px", textAlign: "center" }}>
                <p className="eyebrow">Submission Scorecard</p>
                <div style={{ margin: "24px auto", position: "relative", width: "160px", height: "160px", borderRadius: "50%", border: "10px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
                  <div>
                    <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--foreground)" }}>
                      {codingResult.score}
                    </div>
                    <div style={{ fontSize: "1rem", color: "var(--muted)" }}>
                      out of 100
                    </div>
                  </div>
                </div>
                <h2>Score: {codingResult.score}/100</h2>
                <button className="primary-button" onClick={handleReset} style={{ marginTop: "24px" }}>
                  Try Another Challenge
                </button>
              </article>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <article className="card stack-card">
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "12px" }}>Strengths</h3>
                  <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                    {codingResult.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </article>

                <article className="card stack-card">
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "12px" }}>Weaknesses & Concerns</h3>
                  <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                    {codingResult.weaknesses.map((weak, i) => (
                      <li key={i}>{weak}</li>
                    ))}
                  </ul>
                </article>
              </div>

              <article className="card stack-card">
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "12px" }}>Areas of Improvement</h3>
                <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                  {codingResult.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </article>

              <article className="card stack-card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "12px" }}>
                  Interviewer Refactored Code (Optimal Solution)
                </h3>
                <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                  <Editor
                    height="350px"
                    language={selectedLanguage}
                    theme="vs-dark"
                    value={codingResult.refactored_code}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  />
                </div>
              </article>
            </>
          )}

        </div>
      )}
    </main>
  );
}

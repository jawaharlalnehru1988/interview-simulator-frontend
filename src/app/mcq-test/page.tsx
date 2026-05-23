"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import {
  ApiError,
  startMcqTest,
  submitMcqTest,
  type AuthState,
  type McqTestQuestion,
  type SubmitMcqTestResponse,
} from "@/lib/api";
import {
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const PREDEFINED_TOPICS = [
  "Java 8",
  "DSA",
  "Javascript",
  "Angular",
  "Springboot",
  "Microservices(Java)",
  "React",
  "NextJS",
  "Devops",
  "API design",
  "Agentic AI",
  "Frontend SystemDesign",
  "backend SystemDesign",
  "backend security",
];

const DIFFICULTY_LEVELS: Array<"SUPER_EASY" | "EASY" | "MEDIUM" | "HARD" | "HARDER"> = [
  "SUPER_EASY",
  "EASY",
  "MEDIUM",
  "HARD",
  "HARDER",
];

export default function McqTestPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    loadClientSession(DEFAULT_API_BASE_URL)
  );
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyLabel, setBusyLabel] = useState("");

  // Quiz State
  const [topic, setTopic] = useState("Java 8");
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"SUPER_EASY" | "EASY" | "MEDIUM" | "HARD" | "HARDER">("MEDIUM");
  const [customDescription, setCustomDescription] = useState("");
  
  const [activeTestId, setActiveTestId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<McqTestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}); // question_id -> selected_option
  
  // Timer State
  const [secondsLeft, setSecondsLeft] = useState(30 * 60); // 30 minutes
  const [quizActive, setQuizActive] = useState(false);

  // Result State
  const [result, setResult] = useState<SubmitMcqTestResponse | null>(null);

  useEffect(() => {
    setSession(loadClientSession(DEFAULT_API_BASE_URL));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveClientSession(session);
  }, [ready, session]);

  // Quiz Countdown Timer
  useEffect(() => {
    if (!quizActive || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizActive, secondsLeft]);

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

  const getSecondsForDifficulty = (diff: "SUPER_EASY" | "EASY" | "MEDIUM" | "HARD" | "HARDER") => {
    switch (diff) {
      case "SUPER_EASY": return 5 * 60;
      case "EASY": return 10 * 60;
      case "MEDIUM": return 15 * 60;
      case "HARD": return 20 * 60;
      case "HARDER": return 25 * 60;
      default: return 15 * 60;
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  async function handleStartQuiz(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setBusyLabel("Generating Test...");

    const finalTopic = topic === "custom" ? customTopic : topic;
    if (!finalTopic.trim()) {
      setErrorMessage("Please specify a topic.");
      setBusyLabel("");
      return;
    }

    try {
      const response = await startMcqTest(session.apiBaseUrl, authState, {
        topic: finalTopic,
        difficulty,
        description: customDescription,
      });

      setQuestions(response.questions);
      setActiveTestId(response.interview_id);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setSecondsLeft(getSecondsForDifficulty(difficulty));
      setQuizActive(true);
      setResult(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to generate test. Make sure backend is running."
      );
    } finally {
      setBusyLabel("");
    }
  }

  async function handleSubmitQuiz() {
    if (!activeTestId) return;
    setQuizActive(false);
    setErrorMessage("");
    setBusyLabel("Grading Quiz...");

    const formattedAnswers = questions.map((q) => ({
      questionId: q.question_id,
      answer: userAnswers[q.question_id] ?? "",
    }));

    try {
      const response = await submitMcqTest(
        session.apiBaseUrl,
        authState,
        activeTestId,
        { answers: formattedAnswers }
      );

      setResult(response);
      setQuizActive(false);
      setActiveTestId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to submit answers."
      );
    } finally {
      setBusyLabel("");
    }
  }

  function handleSelectOption(questionId: number, option: string) {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  }

  function handleReset() {
    setResult(null);
    setQuestions([]);
    setUserAnswers({});
    setQuizActive(false);
    setActiveTestId(null);
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
            <p className="eyebrow">MCQ Test Hub</p>
            <h1>This workspace needs an authenticated session.</h1>
            <p className="hero-copy">
              Please log in first before attempting a customized MCQ test.
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

      <div className="route-grid" style={{ gridTemplateColumns: "1fr" }}>
        
        {/* State 1: Setup View */}
        {!quizActive && !result && (
          <article className="card stack-card" style={{ maxWidth: "680px", margin: "0 auto", width: "100%" }}>
            <div className="card-heading">
              <p className="eyebrow">MCQ Testing Centre</p>
              <h2>Generate a Custom MCQ Exam</h2>
              <p className="muted-copy">
                Generated batch of 15 questions in one single call. No adaptive changes, answering all questions first, graded at the end.
              </p>
            </div>

            <form className="stack-card" onSubmit={handleStartQuiz}>
              <label className="field">
                <span>Select Topic</span>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {PREDEFINED_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="custom">Other (Type your own)</option>
                </select>
              </label>

              {topic === "custom" && (
                <label className="field">
                  <span>Custom Topic</span>
                  <input
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Enter custom topic name"
                    required
                  />
                </label>
              )}

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
                <span>Custom Description / Prompt Instructions (Optional)</span>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g. Focus on memory management, multithreading, and stream API. Ask practical code output questions."
                  rows={4}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)" }}
                />
              </label>

              <button
                className="primary-button"
                disabled={Boolean(busyLabel)}
                type="submit"
                style={{ marginTop: "12px" }}
              >
                {busyLabel || "Generate MCQ Exam"}
              </button>
            </form>
          </article>
        )}

        {/* State 2: Active Quiz View */}
        {quizActive && questions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px", alignItems: "start", maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
            
            {/* Left Column: Active Question */}
            <article className="card stack-card">
              <div className="card-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="badge" style={{ background: "var(--accent)", color: "white" }}>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="badge" style={{ marginLeft: "8px", background: "var(--bg-secondary)" }}>
                    {difficulty}
                  </span>
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: "bold", fontFamily: "monospace", color: secondsLeft < 60 ? "var(--error)" : "var(--foreground)" }}>
                  ⏱️ {formatTime(secondsLeft)}
                </div>
              </div>

              <div style={{ margin: "24px 0", fontSize: "1.2rem", fontWeight: 600, color: "var(--foreground)", lineHeight: "1.5" }}>
                {currentQuestionIndex + 1}. {questions[currentQuestionIndex].question}
              </div>

              <div className="mcq-options-wrapper" style={{ margin: "24px 0 16px" }}>
                <p className="mcq-label">Select your answer:</p>
                <div className="mcq-options">
                  {questions[currentQuestionIndex].mcq_options.map((option, idx) => {
                    const isSelected = userAnswers[questions[currentQuestionIndex].question_id] === option;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].question_id, option)}
                        className={`mcq-option ${isSelected ? "mcq-option-selected" : ""}`}
                      >
                        <span style={{ fontWeight: "bold", marginRight: "12px" }}>
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                >
                  Previous
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    style={{ background: "#29603a", color: "white" }}
                    onClick={handleSubmitQuiz}
                    disabled={Boolean(busyLabel)}
                  >
                    {busyLabel || "Submit Quiz"}
                  </button>
                )}
              </div>
            </article>

            {/* Right Column: Sidebar Status Board */}
            <article className="card stack-card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                Exam Status Board
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: "500" }}>Total Questions:</span>
                  <strong style={{ fontSize: "1.1rem" }}>{questions.length}</strong>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: "500" }}>Answered:</span>
                  <strong style={{ fontSize: "1.1rem", color: "#29603a" }}>
                    {Object.keys(userAnswers).length}
                  </strong>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: "500" }}>Unanswered:</span>
                  <strong style={{ fontSize: "1.1rem", color: "var(--accent)" }}>
                    {questions.length - Object.keys(userAnswers).length}
                  </strong>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>
                    Progress
                  </span>
                  <div style={{ width: "100%", height: "10px", borderRadius: "999px", background: "rgba(58, 42, 33, 0.08)", overflow: "hidden" }}>
                    <span 
                      style={{ 
                        display: "block", 
                        height: "100%", 
                        borderRadius: "inherit", 
                        background: "linear-gradient(90deg, #b44f2b, #efe3d4)", 
                        width: `${(Object.keys(userAnswers).length / questions.length) * 100}%`, 
                        transition: "width 0.3s ease" 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </article>

          </div>
        )}

        {/* State 3: Results Scoreboard View */}
        {result && (
          <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Visual Circular Score */}
            <article className="card stack-card" style={{ textAlign: "center", padding: "40px" }}>
              <p className="eyebrow">MCQ Test Results</p>
              
              <div style={{ margin: "24px auto", position: "relative", width: "160px", height: "160px", borderRadius: "50%", border: "10px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
                <div>
                  <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--foreground)" }}>
                    {result.correct_answers}
                  </div>
                  <div style={{ fontSize: "1rem", color: "var(--muted)" }}>
                    out of {result.total_questions}
                  </div>
                </div>
              </div>

              <h2 style={{ fontSize: "1.75rem", color: result.score_percentage >= 70 ? "var(--success)" : "var(--foreground)" }}>
                {result.score_percentage >= 70 ? "Congratulations! Passed." : "Keep Practicing!"}
              </h2>
              
              <p className="muted-copy" style={{ fontSize: "1.1rem" }}>
                You scored <strong>{result.score_percentage.toFixed(1)}%</strong> on this examination.
              </p>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
                <button type="button" className="primary-button" onClick={handleReset}>
                  Try Another Test
                </button>
              </div>
            </article>

            {/* Question Breakdown List */}
            <article className="card stack-card">
              <div className="card-heading">
                <h2>Question Breakdown</h2>
                <p className="muted-copy">Review your answers and check key explanations below</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "12px" }}>
                {result.results.map((item, idx) => (
                  <div
                    key={item.question_id}
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: item.is_correct ? "var(--success-dim)" : "var(--error-dim)",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>#{idx + 1}.</span>
                      <span style={{ color: item.is_correct ? "var(--success)" : "var(--error)" }}>
                        {item.is_correct ? "✓ Correct" : "✗ Incorrect"}
                      </span>
                    </div>

                    <p style={{ margin: "8px 0", fontWeight: 500, color: "var(--foreground)" }}>
                      {item.question}
                    </p>

                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.95rem" }}>
                      <div>
                        <strong>Your answer:</strong>{" "}
                        <span style={{ color: item.is_correct ? "var(--success)" : "var(--error)" }}>
                          {item.user_answer || "(No Answer)"}
                        </span>
                      </div>
                      {!item.is_correct && (
                        <div>
                          <strong>Correct answer:</strong>{" "}
                          <span style={{ color: "var(--success)" }}>
                            {item.correct_answer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>

          </div>
        )}

      </div>
    </main>
  );
}

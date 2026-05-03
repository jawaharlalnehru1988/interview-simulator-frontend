"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  ApiError,
  checkHealth,
  getInterviewHistory,
  getInterviewSummary,
  getNextQuestion,
  startInterview,
  submitAnswer,
  type AuthState,
  type EvaluationResult,
  type InterviewHistoryItem,
  type InterviewSummaryResponse,
  type NextQuestionResponse,
} from "@/lib/api";
import {
  clearClientSession,
  createDefaultSession,
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type ActivityItem = {
  id: number;
  title: string;
  detail: string;
};

function timestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export default function InterviewPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [healthState, setHealthState] = useState("unknown");
  const [currentQuestion, setCurrentQuestion] = useState<NextQuestionResponse | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [selectedMcqOption, setSelectedMcqOption] = useState("");
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [summary, setSummary] = useState<InterviewSummaryResponse | null>(null);
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [showSuggestedAnswer, setShowSuggestedAnswer] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!session.startedAt || !session.interviewId) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - session.startedAt!;
      const totalMs = 60 * 60 * 1000;
      const remaining = Math.max(0, totalMs - elapsed);
      
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt, session.interviewId]);

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

  useEffect(() => {
    setShowSuggestedAnswer(false);
  }, [currentQuestion?.question_id]);

  function updateSession(patch: Partial<ClientSession>) {
    setSession((current) => ({ ...current, ...patch }));
  }

  function pushActivity(title: string, detail: string) {
    setActivity((current) => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title,
        detail: `${timestamp()} · ${detail}`,
      },
      ...current,
    ].slice(0, 8));
  }

  const authState: AuthState = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    onAccessToken: (accessToken) => {
      setSession((current) => ({ ...current, accessToken }));
      pushActivity("Token Refresh", "Access token refreshed automatically after a 401.");
    },
    onUnauthorized: () => {
      setSession((current) => ({ ...current, accessToken: "", refreshToken: "" }));
      setErrorMessage("Session expired. Log in again from the auth route.");
    },
  };

  async function loadInterviewHistory() {
    if (!session.accessToken) {
      return;
    }

    try {
      const response = await getInterviewHistory(session.apiBaseUrl, authState);
      setHistory(response.interviews);

      if (response.interviews.length > 0) {
        const latest = response.interviews[0];
        setSummary(latest);

        if (!session.interviewId) {
          const id = latest.interview_id || (latest as any).id;
          if (id) {
            updateSession({ interviewId: id });
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unexpected error";
      setErrorMessage(message);
    }
  }

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
      pushActivity(label, `Failed: ${message}`);
    } finally {
      setBusyLabel("");
    }
  }

  async function handleHealthCheck() {
    await runAction("Health Check", async () => {
      const response = await checkHealth(session.apiBaseUrl);
      setHealthState(response.status);
      pushActivity("Health Check", `Backend responded with ${response.status}.`);
    });
  }

  async function handleStartInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session.accessToken) {
      setErrorMessage("Log in from the auth route before starting an interview.");
      return;
    }

    await runAction("Start Interview", async () => {
      // 1. Start the interview
      const response = await startInterview(session.apiBaseUrl, authState, {
        topic: session.topic,
        round: session.roundType,
      });

      const newInterviewId = response.interview_id;
      updateSession({ interviewId: newInterviewId, startedAt: Date.now() });
      setCurrentQuestion(null);
      setAnswerText("");
      setSelectedMcqOption("");
      setLastEvaluation(null);
      setSummary(null);

      pushActivity(
        "Start Interview",
        `Interview ${newInterviewId} created for ${response.topic}.`,
      );

      // 2. Fetch the first question immediately
      pushActivity("Fetch Question", "Automatically loading the first question...");
      const questionResponse = await getNextQuestion(
        session.apiBaseUrl,
        authState,
        newInterviewId,
      );

      setCurrentQuestion(questionResponse);
      pushActivity(
        "First Question",
        `Loaded question ${questionResponse.question_number} at ${questionResponse.difficulty} difficulty.`,
      );

      await loadInterviewHistory();
    });
  }

  async function handleNextQuestion() {
    if (!session.accessToken || !session.interviewId) {
      setErrorMessage("Start an interview before asking for the next question.");
      return;
    }

    await runAction("Next Question", async () => {
      const response = await getNextQuestion(session.apiBaseUrl, authState, session.interviewId!);
      setCurrentQuestion(response);
      setAnswerText("");
      setSelectedMcqOption("");
      setLastEvaluation(null);
      pushActivity(
        "Next Question",
        `Loaded question ${response.question_number} at ${response.difficulty} difficulty.`,
      );

      await loadInterviewHistory();
    });
  }

  async function handleSubmitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session.accessToken || !currentQuestion) {
      setErrorMessage("Fetch a question before submitting an answer.");
      return;
    }

    const finalAnswer = answerText.trim();
    if (!finalAnswer) {
      setErrorMessage("Please provide an answer before submitting.");
      return;
    }

    await runAction("Submit Answer", async () => {
      const response = await submitAnswer(session.apiBaseUrl, authState, {
        question_id: currentQuestion.question_id,
        answer: finalAnswer,
      });
      setLastEvaluation(response.evaluation ?? null);
      pushActivity(
        "Submit Answer",
        response.evaluation
          ? `Scored ${response.evaluation.score}/100.`
          : `Answer accepted with ${response.evaluation_status} status.`,
      );
      // Fetch next question automatically to simulate continuous flow
      try {
        const nextQResponse = await getNextQuestion(session.apiBaseUrl, authState, session.interviewId!);
        setCurrentQuestion(nextQResponse);
        setAnswerText("");
        setSelectedMcqOption("");
        pushActivity(
          "Next Question",
          `Loaded question ${nextQResponse.question_number} automatically.`
        );
      } catch (err) {
        // If the interview is completed, it might throw an error or handle it.
      }

      await loadInterviewHistory();
    });
  }

  async function handleSummary() {
    if (!session.accessToken || !session.interviewId) {
      setErrorMessage("Start an interview before requesting the summary.");
      return;
    }

    await runAction("Interview Summary", async () => {
      const response = await getInterviewSummary(
        session.apiBaseUrl,
        authState,
        session.interviewId!,
      );
      setSummary(response);
      pushActivity(
        "Interview Summary",
        `Loaded ${response.questions.length} question records from the backend.`,
      );
    });
  }

  function handleResetWorkspace() {
    const cleared = clearClientSession(DEFAULT_API_BASE_URL);
    setSession({
      ...cleared,
      apiBaseUrl: session.apiBaseUrl,
      username: session.username,
      email: session.email,
    });
    setCurrentQuestion(null);
    setAnswerText("");
    setLastEvaluation(null);
    setSummary(null);
    setHistory([]);
    setActivity([]);
    setErrorMessage("");
  }

  useEffect(() => {
    if (!ready || !session.accessToken) {
      return;
    }

    loadInterviewHistory();
  }, [ready, session.accessToken]);

  function extractCleanedQuestion(question: string, hasOptions: boolean): string {
    let cleaned = question.trim();

    // 1. Remove redundant "Question: " prefix if present
    cleaned = cleaned.replace(/^Question:\s*/i, "");

    // 2. Identify the start of the MCQ options block using a robust Regex.
    // This looks for the first occurrence of:
    // (space or punctuation) followed by (A or B or 1) followed by ) or . or encased in ()
    // Examples matched: " A)", " A.", " (A)", "?A)", ".A)"
    const mcqPattern = /[\s?.!]\s*([A-D][).]|(?:\([A-D]\))|1[).])/;
    const match = cleaned.match(mcqPattern);

    if (match && match.index !== undefined) {
      // Truncate at the start of the match
      // We keep everything before the whitespace/punctuation that started the match
      // or just trim the result.
      cleaned = cleaned.substring(0, match.index + 1).trim();
    }

    return cleaned;
  }

  if (!ready) {
    return <main className="shell route-shell"><p className="muted-copy">Loading session...</p></main>;
  }

  if (!session.accessToken) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">Interview Route</p>
            <h1>This workspace needs an authenticated session.</h1>
            <p className="hero-copy">
              The protected interview APIs use JWT, and this route now auto-refreshes tokens on a
              `401` response. Log in first and come back here.
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

      <section className="route-grid">

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Interview Setup</p>
            <h2>Start a new session</h2>
          </div>
          <form className="stack-card" onSubmit={handleStartInterview}>
            <label className="field">
              <span>Topic</span>
              <select
                value={PREDEFINED_TOPICS.includes(session.topic) ? session.topic : "custom"}
                onChange={(event) => {
                  if (event.target.value === "custom") {
                    updateSession({ topic: "" });
                  } else {
                    updateSession({ topic: event.target.value });
                  }
                }}
              >
                {PREDEFINED_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
                <option value="custom">Other (Type your own)</option>
              </select>
            </label>
            {!PREDEFINED_TOPICS.includes(session.topic) && (
              <label className="field">
                <span>Custom Topic</span>
                <input
                  value={session.topic}
                  onChange={(event) => updateSession({ topic: event.target.value })}
                  placeholder="Enter a custom topic"
                  required
                />
              </label>
            )}
            <label className="field">
              <span>Round type</span>
              <select
                value={session.roundType}
                onChange={(event) => updateSession({ roundType: event.target.value })}
              >
                <option value="technical">Technical</option>
                <option value="mcq">MCQ</option>
                <option value="coding">Coding</option>
              </select>
            </label>
            <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
              Start interview
            </button>
          </form>
        </article>

        <article className="card stack-card tall-card">
          <div className="card-heading">
            <p className="eyebrow">Live Interview</p>
            <h2>Question and answer flow</h2>
          </div>
          <div className="button-row">
            <button
              className="ghost-button"
              disabled={!currentQuestion || Boolean(busyLabel)}
              onClick={() => setShowSuggestedAnswer((current) => !current)}
              type="button"
            >
              {showSuggestedAnswer ? "Hide answer" : "Show answer"}
            </button>
          </div>
          <div className="question-panel">
            <div className="question-meta">
              <span>Question</span>
              <strong>{currentQuestion?.question_number ?? "--"}</strong>
              <span>Difficulty</span>
              <strong>{currentQuestion?.difficulty ?? "--"}</strong>
              {timeLeft && (
                <>
                  <span>Time Left</span>
                  <strong style={{ color: "var(--accent)" }}>{timeLeft}</strong>
                </>
              )}
            </div>
            <p className="question-text">
              {extractCleanedQuestion(
                currentQuestion?.question ?? "Fetch a question to begin.",
                session.roundType === "mcq" && Boolean(currentQuestion?.mcq_options?.length),
              )}
            </p>
          </div>

          {showSuggestedAnswer ? (
            <div className="coach-suggestion">
              <p className="mcq-label">Suggested answer</p>
              <div className="question-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentQuestion?.suggested_answer?.trim() ||
                    "Suggested answer is not available for this question yet. Please fetch the next question."}
                </ReactMarkdown>
              </div>
            </div>
          ) : null}

          {session.roundType === "mcq" && currentQuestion?.mcq_options?.length ? (
            <div className="mcq-options-wrapper">
              <p className="mcq-label">Select the correct option:</p>
              <div className="mcq-options">
                {currentQuestion.mcq_options.map((option) => {
                  const checked = selectedMcqOption === option;
                  return (
                    <button
                      key={option}
                      className={`mcq-option ${checked ? "mcq-option-selected" : ""}`}
                      onClick={() => {
                        setSelectedMcqOption(option);
                        setAnswerText(option);
                      }}
                      type="button"
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <form className="stack-card" onSubmit={handleSubmitAnswer}>
            {session.roundType !== "mcq" && (
              <label className="field">
                <span>Your answer</span>
                <textarea
                  rows={6}
                  value={answerText}
                  onChange={(event) => {
                    setAnswerText(event.target.value);
                    if (selectedMcqOption) {
                      setSelectedMcqOption("");
                    }
                  }}
                  placeholder="Describe your design, tradeoffs, and production strategy."
                />
              </label>
            )}
            <div className="button-row">
              <button
                className="primary-button"
                disabled={!currentQuestion || !answerText.trim() || Boolean(busyLabel)}
                type="submit"
              >
                Submit answer
              </button>
              <button
                className="secondary-button"
                disabled={!session.interviewId || Boolean(busyLabel)}
                onClick={handleNextQuestion}
                type="button"
              >
                Fetch next question
              </button>
            </div>
          </form>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Evaluation</p>
            <h2>Latest scorecard</h2>
          </div>
          {lastEvaluation ? (
            <>
              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div className="score-orb" style={{ flex: 1, padding: "16px", textAlign: "center" }}>
                  <span>Current Answer Score</span>
                  <strong>{lastEvaluation.score} / {session.roundType === 'mcq' ? 1 : session.roundType === 'coding' ? 20 : 10}</strong>
                </div>
                {summary && (summary.interview_id === session.interviewId || (summary as any).id === session.interviewId) && (() => {
                  const evaluatedQs = summary.questions.filter((q: any) => q.score != null);
                  const totalScore = evaluatedQs.reduce((acc: number, q: any) => acc + q.score, 0);
                  const maxPerQuestion = session.roundType === 'mcq' ? 1 : session.roundType === 'coding' ? 20 : 10;
                  const maxScore = evaluatedQs.length * maxPerQuestion;
                  if (maxScore === 0) return null;
                  return (
                    <div className="score-orb" style={{ flex: 1, padding: "16px", textAlign: "center", background: "linear-gradient(135deg, rgba(239,197,141,0.2), rgba(180,79,43,0.1))" }}>
                      <span>Cumulative Score</span>
                      <strong>{totalScore} / {maxScore}</strong>
                    </div>
                  );
                })()}
              </div>
              {session.roundType === "mcq" ? (
                <div className="list-block">
                  <h3>Explanation</h3>
                  <ul>
                    {lastEvaluation.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <div className="list-block">
                    <h3>Strengths</h3>
                    <ul>
                      {lastEvaluation.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="list-block">
                    <h3>Weaknesses</h3>
                    <ul>
                      {lastEvaluation.weaknesses.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="list-block">
                    <h3>Improvements</h3>
                    <ul>
                      {lastEvaluation.improvements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="muted-copy">
              The backend currently falls back when no LLM key is configured. Once you provide your
              purchased model details, this panel will start showing real model-generated feedback.
            </p>
          )}
        </article>

        <article className="card stack-card tall-card">
          <div className="card-heading">
            <p className="eyebrow">Interview Summary</p>
            <h2>Attempted interviews</h2>
          </div>
          {history.length > 0 ? (
            <div className="summary-list">
              {history.map((interview, index) => (
                <div className="summary-item" key={interview.interview_id || (interview as any).id || index}>
                  <div className="summary-item-head">
                    <strong>{interview.topic}</strong>
                    <span>{interview.round || (interview as any).roundType}</span>
                    <span>{interview.status}</span>
                  </div>
                  <small>
                    Asked: {interview.questions_asked ?? (interview as any).questions?.length} · Avg: {interview.average_score ?? "--"}
                  </small>
                  <div className="summary-list">
                    {(interview.questions || (interview as any).questions || [])
                      .filter((q: any) => q.answer || q.score !== null)
                      .map((item: any, qIndex: number) => (
                      <div className="summary-item" key={item.question_id || item.id || qIndex}>
                        <div className="summary-item-head">
                          <strong>Q{(item.order ?? item.sort_order ?? qIndex) + 1}</strong>
                          <span>{item.difficulty}</span>
                          <span>{item.score ?? "pending"}</span>
                        </div>
                        <p>{item.question || item.text}</p>
                        <small>{item.answer || "No answer submitted yet."}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : summary ? (
            <>
              <div className="metric-grid">
                <div>
                  <span>Topic</span>
                  <strong>{summary.topic}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{summary.status}</strong>
                </div>
                <div>
                  <span>Asked</span>
                  <strong>{summary.questions_asked}</strong>
                </div>
                <div>
                  <span>Average</span>
                  <strong>{summary.average_score ?? "--"}</strong>
                </div>
              </div>
              <div className="summary-list">
                {(summary.questions || [])
                  .filter((q: any) => q.answer || q.score !== null)
                  .map((item: any, qIndex: number) => (
                  <div className="summary-item" key={item.question_id || item.id || qIndex}>
                    <div className="summary-item-head">
                      <strong>Q{(item.order ?? item.sort_order ?? qIndex) + 1}</strong>
                      <span>{item.difficulty}</span>
                      <span>{item.score ?? "pending"}</span>
                    </div>
                    <p>{item.question || item.text}</p>
                    <small>{item.answer || "No answer submitted yet."}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted-copy">Start interview and answer questions to build your history.</p>
          )}
        </article>

      </section>
    </main>
  );
}

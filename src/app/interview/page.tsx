"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  checkHealth,
  getInterviewSummary,
  getNextQuestion,
  startInterview,
  submitAnswer,
  type AuthState,
  type EvaluationResult,
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
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
      const response = await startInterview(session.apiBaseUrl, authState, {
        topic: session.topic,
        round: session.roundType,
      });
      updateSession({ interviewId: response.interview_id });
      setCurrentQuestion(null);
      setAnswerText("");
      setLastEvaluation(null);
      setSummary(null);
      pushActivity(
        "Start Interview",
        `Interview ${response.interview_id} created for ${response.topic}.`,
      );
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
    setActivity([]);
    setErrorMessage("");
  }

  function extractCleanedQuestion(question: string, hasOptions: boolean): string {
    if (!hasOptions) return question;
    // Remove the options (A), B), C), D)) from the end of the question
    const optionPattern = /^(.+?)(?:\s+[A-D]\)\s+.+)*$/;
    const match = question.match(optionPattern);
    if (match && match[1]) {
      // Find the last occurrence of "A)" or "B)" or "C)" or "D)" and remove from there
      const lastOptionIndex = Math.max(
        question.lastIndexOf("A)"),
        question.lastIndexOf("B)"),
        question.lastIndexOf("C)"),
        question.lastIndexOf("D)"),
      );
      if (lastOptionIndex > 0) {
        // Look backwards to find the start of the options section
        const beforeOptions = question.substring(0, lastOptionIndex).trim();
        // Only remove if options section is substantial (has multiple lines)
        if (beforeOptions.length > 50) {
          return beforeOptions;
        }
      }
    }
    return question;
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
      <section className="route-hero">
        <div>
          <p className="eyebrow">Interview Workspace</p>
          <h1>Run the interview flow on a dedicated route.</h1>
          <p className="hero-copy">
            This page is focused entirely on protected interview APIs. Real model-backed scoring will
            appear here automatically once the backend receives your purchased LLM provider details.
          </p>
        </div>
        <div className="hero-links">
          <button className="ghost-button" onClick={handleHealthCheck} type="button">
            Check backend health
          </button>
          <Link className="secondary-button link-button" href="/auth">
            Back to auth route
          </Link>
        </div>
      </section>

      <section className="status-strip">
        <div className="status-pill">
          <span>Backend</span>
          <strong>{healthState}</strong>
        </div>
        <div className="status-pill">
          <span>User</span>
          <strong>{session.username || "current session"}</strong>
        </div>
        <div className="status-pill">
          <span>Interview</span>
          <strong>{session.interviewId ?? "none"}</strong>
        </div>
        <div className="status-pill accent">
          <span>Busy</span>
          <strong>{busyLabel || "idle"}</strong>
        </div>
      </section>

      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}

      <section className="route-grid">
        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Connection</p>
            <h2>Session config</h2>
          </div>
          <label className="field">
            <span>API base URL</span>
            <input
              value={session.apiBaseUrl}
              onChange={(event) => updateSession({ apiBaseUrl: event.target.value })}
            />
          </label>
          <div className="token-box">
            <span>Access token</span>
            <code>{`${session.accessToken.slice(0, 32)}...`}</code>
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={handleResetWorkspace} type="button">
              Clear local session
            </button>
          </div>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Interview Setup</p>
            <h2>Start a new session</h2>
          </div>
          <form className="stack-card" onSubmit={handleStartInterview}>
            <label className="field">
              <span>Topic</span>
              <input
                value={session.topic}
                onChange={(event) => updateSession({ topic: event.target.value })}
                required
              />
            </label>
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
              className="primary-button"
              disabled={!session.interviewId || Boolean(busyLabel)}
              onClick={handleNextQuestion}
              type="button"
            >
              Fetch next question
            </button>
            <button
              className="secondary-button"
              disabled={!session.interviewId || Boolean(busyLabel)}
              onClick={handleSummary}
              type="button"
            >
              Load summary
            </button>
          </div>
          <div className="question-panel">
            <div className="question-meta">
              <span>Question</span>
              <strong>{currentQuestion?.question_number ?? "--"}</strong>
              <span>Difficulty</span>
              <strong>{currentQuestion?.difficulty ?? "--"}</strong>
            </div>
            <p className="question-text">
              {extractCleanedQuestion(
                currentQuestion?.question ?? "Fetch a question to begin.",
                session.roundType === "mcq" && Boolean(currentQuestion?.mcq_options?.length),
              )}
            </p>
          </div>

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
                placeholder={
                  session.roundType === "mcq"
                    ? "Select an option above or type your answer here."
                    : "Describe your design, tradeoffs, and production strategy."
                }
              />
            </label>
            <button
              className="primary-button"
              disabled={!currentQuestion || !answerText.trim() || Boolean(busyLabel)}
              type="submit"
            >
              Submit answer
            </button>
          </form>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Evaluation</p>
            <h2>Latest scorecard</h2>
          </div>
          {lastEvaluation ? (
            <>
              <div className="score-orb">
                <span>Score</span>
                <strong>{lastEvaluation.score}</strong>
              </div>
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
            <h2>Protected summary route</h2>
          </div>
          {summary ? (
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
                {summary.questions.map((item) => (
                  <div className="summary-item" key={item.question_id}>
                    <div className="summary-item-head">
                      <strong>Q{item.order + 1}</strong>
                      <span>{item.difficulty}</span>
                      <span>{item.score ?? "pending"}</span>
                    </div>
                    <p>{item.question}</p>
                    <small>{item.answer || "No answer submitted yet."}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted-copy">Load summary after answering at least one question.</p>
          )}
        </article>

        <article className="card stack-card tall-card">
          <div className="card-heading">
            <p className="eyebrow">Activity</p>
            <h2>Request timeline</h2>
          </div>
          <div className="activity-list">
            {activity.length ? (
              activity.map((item) => (
                <div className="activity-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))
            ) : (
              <p className="muted-copy">Run an interview action to see the request timeline.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

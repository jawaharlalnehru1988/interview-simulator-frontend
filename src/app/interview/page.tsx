"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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

import { InterviewSetup } from "./components/InterviewSetup";
import { LiveInterview } from "./components/LiveInterview";
import { EvaluationScorecard } from "./components/EvaluationScorecard";
import { InterviewSummary } from "./components/InterviewSummary";

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

  function handleResumeInterview(interview: any) {
    const id = interview.interview_id || interview.id;
    updateSession({
      interviewId: id,
      topic: interview.topic || session.topic,
      roundType: interview.round || interview.roundType || "basic",
      startedAt: Date.now(),
    });
    setCurrentQuestion(null);
    setAnswerText("");
    setSelectedMcqOption("");
    setLastEvaluation(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <InterviewSetup
          session={session}
          updateSession={updateSession}
          predefinedTopics={PREDEFINED_TOPICS}
          busyLabel={busyLabel}
          handleStartInterview={handleStartInterview}
        />

        <LiveInterview
          session={session}
          currentQuestion={currentQuestion}
          busyLabel={busyLabel}
          showSuggestedAnswer={showSuggestedAnswer}
          setShowSuggestedAnswer={setShowSuggestedAnswer}
          timeLeft={timeLeft}
          selectedMcqOption={selectedMcqOption}
          setSelectedMcqOption={setSelectedMcqOption}
          answerText={answerText}
          setAnswerText={setAnswerText}
          handleSubmitAnswer={handleSubmitAnswer}
          handleNextQuestion={handleNextQuestion}
        />

        <EvaluationScorecard
          session={session}
          lastEvaluation={lastEvaluation}
          summary={summary}
        />

        <InterviewSummary
          history={history}
          summary={summary}
          handleResumeInterview={handleResumeInterview}
        />
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  ApiError,
  answerPersonalCoachQuestion,
  choosePersonalCoachSubtopic,
  explainPersonalCoachQuery,
  getUserLearningProgress,
  resumePersonalCoachSession,
  startPersonalCoach,
  type AuthState,
  type UserLearningProgressResponse,
} from "@/lib/api";
import {
  createDefaultSession,
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function PersonalCoachPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [ready, setReady] = useState(false);

  const [topic, setTopic] = useState("System Design");
  const [coachSessionId, setCoachSessionId] = useState<number | null>(null);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState("");

  const [lesson, setLesson] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [score, setScore] = useState<number | null>(null);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [coachPrompt, setCoachPrompt] = useState("");
  const [suggestedNextSubtopic, setSuggestedNextSubtopic] = useState("");
  const [explainerQuestion, setExplainerQuestion] = useState("");
  const [explainerAnswer, setExplainerAnswer] = useState("");

  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState<UserLearningProgressResponse | null>(null);

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

  async function loadProgress() {
    if (!session.accessToken) {
      return;
    }

    try {
      const response = await getUserLearningProgress(session.apiBaseUrl, authState);
      setProgress(response);
    } catch {
      // Keep page usable even if progress fetch fails.
    }
  }

  useEffect(() => {
    if (!ready || !session.accessToken) {
      return;
    }
    void loadProgress();
  }, [ready, session.accessToken]);

  async function handleStartCoach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic.trim()) {
      setErrorMessage("Please enter a topic.");
      return;
    }

    await runAction("Start Coach", async () => {
      const response = await startPersonalCoach(session.apiBaseUrl, authState, topic.trim());
      setCoachSessionId(response.session_id);
      setSubtopics(response.subtopics ?? []);
      setSelectedSubtopic("");
      setLesson("");
      setQuestion("");
      setAnswer("");
      setScore(null);
      setStrengths([]);
      setGaps([]);
      setFeedback("");
      setCoachPrompt(response.coach_prompt || "Choose one subtopic to begin learning.");
      setSuggestedNextSubtopic("");
      await loadProgress();
    });
  }

  async function handleChooseSubtopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coachSessionId) {
      setErrorMessage("Start a coach session first.");
      return;
    }

    if (!selectedSubtopic.trim()) {
      setErrorMessage("Please choose a subtopic.");
      return;
    }

    await runAction("Choose Subtopic", async () => {
      const response = await choosePersonalCoachSubtopic(
        session.apiBaseUrl,
        authState,
        coachSessionId,
        selectedSubtopic,
      );

      setLesson(response.lesson);
      setQuestion(response.question);
      setAnswer("");
      setScore(null);
      setStrengths([]);
      setGaps([]);
      setFeedback("");
      setCoachPrompt(response.coach_prompt || "Answer the question below.");
      setSuggestedNextSubtopic("");
    });
  }

  async function handleSubmitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!coachSessionId) {
      setErrorMessage("Start a coach session first.");
      return;
    }

    if (!answer.trim()) {
      setErrorMessage("Please write your answer first.");
      return;
    }

    await runAction("Evaluate Answer", async () => {
      const response = await answerPersonalCoachQuestion(
        session.apiBaseUrl,
        authState,
        coachSessionId,
        answer.trim(),
      );

      setScore(response.score);
      setStrengths(response.strengths ?? []);
      setGaps(response.gaps ?? []);
      setFeedback(response.feedback || "");
      setCoachPrompt(response.coach_prompt || "");

      if (response.coach_decision === "advance") {
        setQuestion("");
        setLesson("");
        setAnswer("");
        setSuggestedNextSubtopic(response.suggested_next_subtopic || "");
        if (response.subtopics?.length) {
          setSubtopics(response.subtopics);
        }
      } else {
        setQuestion(response.next_question || question);
        setAnswer("");
        setSuggestedNextSubtopic("");
      }
      await loadProgress();
    });
  }

  async function handleExplainQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!coachSessionId) {
      setErrorMessage("Start a coach session first before asking for explanation.");
      return;
    }

    if (!explainerQuestion.trim()) {
      setErrorMessage("Type your terminology/syntax question first.");
      return;
    }

    await runAction("Explain Concept", async () => {
      const response = await explainPersonalCoachQuery(
        session.apiBaseUrl,
        authState,
        coachSessionId,
        explainerQuestion.trim(),
      );
      setExplainerAnswer(response.explanation || "");
    });
  }

  function applySuggestedSubtopic() {
    if (suggestedNextSubtopic) {
      setSelectedSubtopic(suggestedNextSubtopic);
    }
  }

  async function handleResumeSession(sessionId: number) {
    await runAction("Resume Session", async () => {
      const response = await resumePersonalCoachSession(session.apiBaseUrl, authState, sessionId);
      setTopic(response.topic);
      setCoachSessionId(response.session_id);
      setSubtopics(response.subtopics ?? []);
      setSelectedSubtopic(response.selected_subtopic || response.suggested_next_subtopic || "");
      setLesson(response.lesson || "");
      setQuestion(response.question || "");
      setSuggestedNextSubtopic(response.suggested_next_subtopic || "");
      setCoachPrompt(response.coach_prompt || "");
      setAnswer("");
      setExplainerAnswer("");

      if (response.latest_attempt) {
        setScore(response.latest_attempt.score);
        setStrengths(response.latest_attempt.strengths ?? []);
        setGaps(response.latest_attempt.gaps ?? []);
        setFeedback(response.latest_attempt.feedback || "");
      } else {
        setScore(null);
        setStrengths([]);
        setGaps([]);
        setFeedback("");
      }
    });
  }

  if (!ready) {
    return <main className="shell route-shell"><p className="muted-copy">Loading session...</p></main>;
  }

  if (!session.accessToken) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">Personal Coach</p>
            <h1>This route needs an authenticated session.</h1>
            <p className="hero-copy">
              Log in first, then return to start a personalized learning flow with adaptive
              coaching and follow-up questions.
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
            <p className="eyebrow">1. Topic Input</p>
            <h2>Start Coach Session</h2>
          </div>
          <form className="stack-card" onSubmit={handleStartCoach}>
            <label className="field">
              <span>Topic</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Example: System Design"
                required
              />
            </label>
            <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
              {busyLabel === "Start Coach" ? "Generating subtopics..." : "Generate subtopics"}
            </button>
          </form>
        </article>

        <article className="card stack-card tall-card">
          <div className="card-heading">
            <p className="eyebrow">2. Subtopic Choice</p>
            <h2>Select What To Learn</h2>
          </div>
          <p className="muted-copy">{coachPrompt || "AI will suggest subtopics after you start."}</p>

          <form className="stack-card" onSubmit={handleChooseSubtopic}>
            <label className="field">
              <span>Subtopic</span>
              <select
                value={selectedSubtopic}
                onChange={(event) => setSelectedSubtopic(event.target.value)}
                disabled={!subtopics.length || Boolean(busyLabel)}
              >
                <option value="">Choose a subtopic</option>
                {subtopics.map((subtopic) => (
                  <option key={subtopic} value={subtopic}>
                    {subtopic}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              type="submit"
              disabled={!coachSessionId || !selectedSubtopic || Boolean(busyLabel)}
            >
              {busyLabel === "Choose Subtopic" ? "Preparing lesson..." : "Start learning"}
            </button>
          </form>

          {suggestedNextSubtopic ? (
            <div className="coach-suggestion">
              <p className="muted-copy">
                Suggested next subtopic: <strong>{suggestedNextSubtopic}</strong>
              </p>
              <button className="ghost-button" type="button" onClick={applySuggestedSubtopic}>
                Use suggested subtopic
              </button>
            </div>
          ) : null}

          <div className="coach-explainer-box">
            <p className="muted-copy coach-explainer-title">Need a quick explanation?</p>
            <form className="stack-card" onSubmit={handleExplainQuestion}>
              <label className="field">
                <span>Ask terminology or syntax</span>
                <textarea
                  rows={3}
                  value={explainerQuestion}
                  onChange={(event) => setExplainerQuestion(event.target.value)}
                  placeholder="Example: What is idempotency? or Python list comprehension syntax?"
                />
              </label>
              <button
                className="ghost-button"
                type="submit"
                disabled={!coachSessionId || !explainerQuestion.trim() || Boolean(busyLabel)}
              >
                {busyLabel === "Explain Concept" ? "Explaining..." : "Ask coach explainer"}
              </button>
            </form>

            {explainerAnswer ? (
              <div className="coach-explainer-answer">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{explainerAnswer}</ReactMarkdown>
              </div>
            ) : null}
          </div>
        </article>

        <article className="card stack-card tall-card">
          <div className="card-heading">
            <p className="eyebrow">3. Learn + Practice</p>
            <h2>AI Teaching Loop</h2>
          </div>

          {lesson ? (
            <div className="question-panel">
              <div className="question-meta">
                <span>Current Subtopic</span>
                <strong>{selectedSubtopic || "--"}</strong>
              </div>
              <p className="coach-lesson">{lesson}</p>
            </div>
          ) : null}

          {question ? (
            <form className="stack-card" onSubmit={handleSubmitAnswer}>
              <label className="field">
                <span>Coach Question</span>
                <p className="coach-question">{question}</p>
              </label>
              <label className="field">
                <span>Your Answer</span>
                <textarea
                  rows={6}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Write a structured answer with definition, example, and tradeoffs."
                />
              </label>
              <button
                className="primary-button"
                type="submit"
                disabled={!question || !answer.trim() || Boolean(busyLabel)}
              >
                {busyLabel === "Evaluate Answer" ? "Evaluating..." : "Submit answer"}
              </button>
            </form>
          ) : (
            <p className="muted-copy">Choose a subtopic to start the teaching loop.</p>
          )}
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">4. Feedback</p>
            <h2>Coach Evaluation</h2>
          </div>

          {score !== null ? (
            <>
              <div className="score-orb">
                <span>Score</span>
                <strong>{score}</strong>
              </div>
              <div className="summary-list">
                <article className="summary-item">
                  <div className="summary-item-head">
                    <strong>Strengths</strong>
                  </div>
                  <ul>
                    {strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="summary-item">
                  <div className="summary-item-head">
                    <strong>Gaps</strong>
                  </div>
                  <ul>
                    {gaps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
              <p className="muted-copy coach-feedback">{feedback}</p>
            </>
          ) : (
            <p className="muted-copy">Submit an answer to receive coach feedback and next steps.</p>
          )}
        </article>

        <article className="card stack-card full-card">
          <div className="card-heading">
            <p className="eyebrow">5. Your Progress</p>
            <h2>Revisit History</h2>
          </div>

          {progress ? (
            <>
              <p className="muted-copy">
                Attempted coach topics: {progress.attempted_topics.personal_coach_topics.length || 0}
              </p>
              <div className="summary-list">
                {progress.modules.personal_coach.length ? (
                  progress.modules.personal_coach.map((item) => (
                    <button
                      className="summary-item summary-item-button"
                      key={item.session_id}
                      onClick={() => void handleResumeSession(item.session_id)}
                      type="button"
                    >
                      <div className="summary-item-head">
                        <strong>{item.topic}</strong>
                        <span>{item.current_subtopic || item.suggested_next_subtopic || "Resume"}</span>
                      </div>
                      <small>
                        Attempts: {item.attempt_count} · Avg score: {item.average_score ?? "--"}
                      </small>
                    </button>
                  ))
                ) : (
                  <p className="muted-copy">No coach attempts yet.</p>
                )}
              </div>

              <p className="muted-copy">
                Attempted interview topics: {progress.attempted_topics.interview_topics.join(", ") || "none"}
              </p>
            </>
          ) : (
            <p className="muted-copy">Loading your historical learning data...</p>
          )}
        </article>
      </section>
    </main>
  );
}

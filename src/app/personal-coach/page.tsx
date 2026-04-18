"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/atom-one-light.css";

import {
  ApiError,
  answerPersonalCoachQuestion,
  choosePersonalCoachLesson,
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

type CoachChatMessage = {
  id: number;
  question: string;
  answer: string;
  pending: boolean;
};

export default function PersonalCoachPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [ready, setReady] = useState(false);

  const [topic, setTopic] = useState("System Design");
  const [coachSessionId, setCoachSessionId] = useState<number | null>(null);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState("");
  const [lessons, setLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState("");
  const [practicedSubtopics, setPracticedSubtopics] = useState<string[]>([]);
  const [practicedLessonsMap, setPracticedLessonsMap] = useState<Record<string, string[]>>({});
  const [topicProgressPercent, setTopicProgressPercent] = useState(0);
  const [topicProgressMeta, setTopicProgressMeta] = useState({
    totalSubtopics: 0,
    practicedSubtopicsCount: 0,
    totalLessons: 0,
    practicedLessonsCount: 0,
  });

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
  const [coachChat, setCoachChat] = useState<CoachChatMessage[]>([]);

  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState<UserLearningProgressResponse | null>(null);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [isSpeakingSubtopic, setIsSpeakingSubtopic] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const chatThreadRef = useRef<HTMLDivElement | null>(null);

  const completedLessonsForCurrentSubtopic = practicedLessonsMap[selectedSubtopic] ?? [];

  function normalizeTopicText(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function topicSimilarityScore(a: string, b: string) {
    const x = normalizeTopicText(a);
    const y = normalizeTopicText(b);
    if (!x || !y) {
      return 0;
    }
    if (x === y) {
      return 1;
    }
    if (x.includes(y) || y.includes(x)) {
      return 0.9;
    }

    const xa = new Set(x.split(" "));
    const ya = new Set(y.split(" "));
    const common = [...xa].filter((word) => ya.has(word)).length;
    const union = new Set([...xa, ...ya]).size;
    return union ? common / union : 0;
  }

  function findSimilarCoachSession(topicInput: string) {
    const sessions = progress?.modules.personal_coach ?? [];
    let best: { session_id: number; topic: string; score: number } | null = null;

    for (const sessionItem of sessions) {
      const score = topicSimilarityScore(topicInput, sessionItem.topic);
      if (score >= 0.55 && (!best || score > best.score)) {
        best = {
          session_id: sessionItem.session_id,
          topic: sessionItem.topic,
          score,
        };
      }
    }
    return best;
  }

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setTtsSupported(typeof window.speechSynthesis !== "undefined");

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!chatThreadRef.current) {
      return;
    }
    chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
  }, [coachChat]);

  function handleSpeakSubtopic() {
    if (typeof window !== "undefined" && ttsSupported) {
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        setIsSpeechPaused(true);
        return;
      }
      if (synth.speaking && synth.paused) {
        synth.resume();
        setIsSpeechPaused(false);
        return;
      }
    }

    const subtopic = selectedSubtopic.trim();
    const lessonBody = lesson.trim();

    if (!subtopic && !lessonBody) {
      setErrorMessage("Choose a subtopic first, then use the mic icon to hear it.");
      return;
    }

    if (!ttsSupported || typeof window === "undefined") {
      setErrorMessage("Text-to-speech is not supported in this browser.");
      return;
    }

    setErrorMessage("");
    window.speechSynthesis.cancel();
    setIsSpeechPaused(false);
    const speechText = [
      subtopic ? `Current subtopic. ${subtopic}.` : "",
      lessonBody,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeakingSubtopic(true);
    utterance.onpause = () => setIsSpeechPaused(true);
    utterance.onresume = () => setIsSpeechPaused(false);
    utterance.onend = () => {
      setIsSpeakingSubtopic(false);
      setIsSpeechPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeakingSubtopic(false);
      setIsSpeechPaused(false);
    };
    window.speechSynthesis.speak(utterance);
  }

  async function handleStartCoach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic.trim()) {
      setErrorMessage("Please enter a topic.");
      return;
    }

    const similar = findSimilarCoachSession(topic.trim());
    if (similar) {
      const shouldContinue = typeof window !== "undefined"
        ? window.confirm(
            `A similar topic already exists: "${similar.topic}". Would you like to continue it instead of creating a new one?`,
          )
        : false;
      if (shouldContinue) {
        await handleResumeSession(similar.session_id);
        return;
      }
    }

    await runAction("Start Coach", async () => {
      const response = await startPersonalCoach(session.apiBaseUrl, authState, topic.trim());
      setCoachSessionId(response.session_id);
      setSubtopics(response.subtopics ?? []);
      setSelectedSubtopic("");
      setLessons([]);
      setSelectedLesson("");
      setPracticedSubtopics([]);
      setPracticedLessonsMap({});
      setTopicProgressPercent(0);
      setTopicProgressMeta({
        totalSubtopics: 0,
        practicedSubtopicsCount: 0,
        totalLessons: 0,
        practicedLessonsCount: 0,
      });
      setLesson("");
      setQuestion("");
      setAnswer("");
      setScore(null);
      setStrengths([]);
      setGaps([]);
      setFeedback("");
      setCoachPrompt(response.coach_prompt || "Choose one subtopic to begin learning.");
      setSuggestedNextSubtopic("");
      setCoachChat([]);
      setExplainerQuestion("");
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

      setLessons(response.lessons ?? []);
      setSelectedLesson("");
      setPracticedSubtopics(response.practiced_subtopics ?? []);
      setPracticedLessonsMap((current) => ({
        ...current,
        [selectedSubtopic]: response.practiced_lessons ?? [],
      }));
      setTopicProgressPercent(0);
      setLesson("");
      setQuestion("");
      setAnswer("");
      setScore(null);
      setStrengths([]);
      setGaps([]);
      setFeedback("");
      setCoachPrompt(response.coach_prompt || "Choose a lesson to start.");
      setSuggestedNextSubtopic("");
    });
  }

  async function handleChooseLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!coachSessionId) {
      setErrorMessage("Start a coach session first.");
      return;
    }

    if (!selectedSubtopic.trim()) {
      setErrorMessage("Please choose a subtopic first.");
      return;
    }

    if (!selectedLesson.trim()) {
      setErrorMessage("Please choose a lesson.");
      return;
    }

    await runAction("Choose Lesson", async () => {
      const response = await choosePersonalCoachLesson(
        session.apiBaseUrl,
        authState,
        coachSessionId,
        selectedLesson,
      );

      setSelectedLesson(response.selected_lesson || selectedLesson);
      setPracticedSubtopics(response.practiced_subtopics ?? practicedSubtopics);
      setPracticedLessonsMap((current) => ({
        ...current,
        [selectedSubtopic]: response.practiced_lessons ?? current[selectedSubtopic] ?? [],
      }));
      setTopicProgressPercent(response.progress_percent ?? topicProgressPercent);
      setTopicProgressMeta({
        totalSubtopics: response.total_subtopics ?? topicProgressMeta.totalSubtopics,
        practicedSubtopicsCount: response.practiced_subtopics_count ?? topicProgressMeta.practicedSubtopicsCount,
        totalLessons: response.total_lessons ?? topicProgressMeta.totalLessons,
        practicedLessonsCount: response.practiced_lessons_count ?? topicProgressMeta.practicedLessonsCount,
      });
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
      setPracticedSubtopics(response.practiced_subtopics ?? practicedSubtopics);
      setPracticedLessonsMap((current) => ({
        ...current,
        [selectedSubtopic]: response.practiced_lessons ?? current[selectedSubtopic] ?? [],
      }));
      setTopicProgressPercent(response.progress_percent ?? topicProgressPercent);
      setTopicProgressMeta({
        totalSubtopics: response.total_subtopics ?? topicProgressMeta.totalSubtopics,
        practicedSubtopicsCount: response.practiced_subtopics_count ?? topicProgressMeta.practicedSubtopicsCount,
        totalLessons: response.total_lessons ?? topicProgressMeta.totalLessons,
        practicedLessonsCount: response.practiced_lessons_count ?? topicProgressMeta.practicedLessonsCount,
      });

      if (response.coach_decision === "advance") {
        setQuestion("");
        setLesson("");
        setSelectedLesson("");
        setLessons([]);
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

    const prompt = explainerQuestion.trim();
    const messageId = Date.now();

    setCoachChat((current) => [
      ...current,
      {
        id: messageId,
        question: prompt,
        answer: "",
        pending: true,
      },
    ]);

    await runAction("Explain Concept", async () => {
      const response = await explainPersonalCoachQuery(
        session.apiBaseUrl,
        authState,
        coachSessionId,
        prompt,
      );

      setCoachChat((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                answer:
                  response.explanation ||
                  "I could not generate an explanation for that yet. Please try reframing the question.",
                pending: false,
              }
            : item,
        ),
      );
      setExplainerQuestion("");
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
      setLessons(response.available_lessons ?? []);
      setSelectedLesson(response.selected_lesson || "");
      setPracticedSubtopics(response.practiced_subtopics ?? []);
      setPracticedLessonsMap(response.practiced_lessons_map ?? {});
      setTopicProgressPercent(response.progress_percent ?? 0);
      setTopicProgressMeta({
        totalSubtopics: response.total_subtopics ?? 0,
        practicedSubtopicsCount: response.practiced_subtopics_count ?? 0,
        totalLessons: response.total_lessons ?? 0,
        practicedLessonsCount: response.practiced_lessons_count ?? 0,
      });
      setLesson(response.lesson || "");
      setQuestion(response.question || "");
      setSuggestedNextSubtopic(response.suggested_next_subtopic || "");
      setCoachPrompt(response.coach_prompt || "");
      setAnswer("");
      setExplainerQuestion("");
      setCoachChat([]);

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
                    {practicedSubtopics.some((item) => item.toLowerCase() === subtopic.toLowerCase())
                      ? `${subtopic} (Practiced)`
                      : subtopic}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              type="submit"
              disabled={!coachSessionId || !selectedSubtopic || Boolean(busyLabel)}
            >
              {busyLabel === "Choose Subtopic" ? "Loading lessons..." : "Load lessons"}
            </button>
          </form>

          <form className="stack-card" onSubmit={handleChooseLesson}>
            <label className="field">
              <span>Lesson</span>
              <select
                value={selectedLesson}
                onChange={(event) => setSelectedLesson(event.target.value)}
                disabled={!lessons.length || !selectedSubtopic || Boolean(busyLabel)}
              >
                <option value="">Choose a lesson</option>
                {lessons.map((lessonItem) => (
                  <option key={lessonItem} value={lessonItem}>
                    {(practicedLessonsMap[selectedSubtopic] ?? []).some(
                      (item) => item.toLowerCase() === lessonItem.toLowerCase(),
                    )
                      ? `${lessonItem} (Practiced)`
                      : lessonItem}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              type="submit"
              disabled={!coachSessionId || !selectedSubtopic || !selectedLesson || Boolean(busyLabel)}
            >
              {busyLabel === "Choose Lesson" ? "Preparing lesson..." : "Load lesson and practice"}
            </button>
          </form>

          {(practicedSubtopics.length || completedLessonsForCurrentSubtopic.length || topicProgressPercent > 0) ? (
            <div className="coach-progress-panel">
              <div className="coach-progress-header">
                <strong>Topic Progress</strong>
                <span>{topicProgressPercent.toFixed(0)}%</span>
              </div>
              <div className="coach-progress-bar" aria-hidden="true">
                <span style={{ width: `${topicProgressPercent}%` }} />
              </div>
              <p className="muted-copy coach-progress-copy">
                Completed subtopics: {topicProgressMeta.practicedSubtopicsCount}/{topicProgressMeta.totalSubtopics} · Completed lessons: {topicProgressMeta.practicedLessonsCount}/{topicProgressMeta.totalLessons}
              </p>

              {practicedSubtopics.length ? (
                <div className="coach-chip-block">
                  <span className="coach-chip-title">Completed subtopics</span>
                  <div className="coach-chip-list">
                    {practicedSubtopics.map((item) => (
                      <span className="coach-chip" key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {completedLessonsForCurrentSubtopic.length ? (
                <div className="coach-chip-block">
                  <span className="coach-chip-title">Completed lessons</span>
                  <div className="coach-chip-list">
                    {completedLessonsForCurrentSubtopic.map((item) => (
                      <span className="coach-chip coach-chip-soft" key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

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

        </article>

        <article className="card stack-card tall-card">
          <div className="card-heading">
            <p className="eyebrow">3. Learn + Practice</p>
            <h2>AI Teaching Loop</h2>
          </div>

          {lesson ? (
            <div className="question-panel">
              <div className="question-meta">
                <div className="stack-card coach-subtopic-header">
                  <span>Current Subtopic</span>
                  <strong>{selectedSubtopic || "--"}</strong>
                  <span>Current Lesson</span>
                  <strong>{selectedLesson || "--"}</strong>
                </div>
                <button
                  className="ghost-button coach-tts-button"
                  type="button"
                  onClick={handleSpeakSubtopic}
                  disabled={!ttsSupported || !selectedSubtopic.trim()}
                  aria-label="Read current subtopic aloud"
                  title="Read current subtopic aloud"
                >
                  <svg
                    aria-hidden="true"
                    className="coach-tts-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.5 11.5a6.5 6.5 0 1 0 13 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 18v3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9 21h6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>
                    {isSpeakingSubtopic
                      ? isSpeechPaused
                        ? "Resume"
                        : "Pause"
                      : "Read"}
                  </span>
                </button>
              </div>
              <div className="coach-lesson">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
                  {lesson}
                </ReactMarkdown>
              </div>
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

        <article className="card stack-card coach-side-panel">
          <div className="card-heading">
            <p className="eyebrow">4. Feedback + Doubts</p>
            <h2>Coach Evaluation</h2>
          </div>

          <div className="coach-evaluation-compact">
            {score !== null ? (
              <>
                <div className="coach-evaluation-score-row">
                  <div className="coach-score-pill">
                    <span>Score</span>
                    <strong>{score}</strong>
                  </div>
                  <p className="muted-copy coach-feedback">{feedback || "Coach feedback will appear here."}</p>
                </div>
                <div className="coach-evaluation-columns">
                  <article className="summary-item coach-summary-mini">
                    <div className="summary-item-head">
                      <strong>Strengths</strong>
                    </div>
                    <ul>
                      {strengths.length ? strengths.map((item) => <li key={item}>{item}</li>) : <li>No strengths yet</li>}
                    </ul>
                  </article>
                  <article className="summary-item coach-summary-mini">
                    <div className="summary-item-head">
                      <strong>Gaps</strong>
                    </div>
                    <ul>
                      {gaps.length ? gaps.map((item) => <li key={item}>{item}</li>) : <li>No gaps yet</li>}
                    </ul>
                  </article>
                </div>
              </>
            ) : (
              <p className="muted-copy">Submit an answer to receive coach feedback and next steps.</p>
            )}
          </div>

          <div className="coach-chat-panel">
            <div className="coach-chat-header">
              <p className="muted-copy coach-explainer-title">Cross-question and doubt clear chat</p>
            </div>
            <div className="coach-chat-thread" ref={chatThreadRef} role="log" aria-live="polite">
              {coachChat.length ? (
                coachChat.map((entry) => (
                  <div className="coach-chat-entry" key={entry.id}>
                    <div className="coach-chat-bubble coach-chat-user">
                      <strong>You</strong>
                      <p>{entry.question}</p>
                    </div>
                    <div className="coach-chat-bubble coach-chat-coach">
                      <strong>Coach</strong>
                      {entry.pending ? (
                        <p className="muted-copy">Thinking...</p>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
                          {entry.answer}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted-copy">Ask any terminology, syntax, or follow-up question after each evaluation.</p>
              )}
            </div>
            <form className="stack-card coach-chat-input" onSubmit={handleExplainQuestion}>
              <label className="field">
                <span>Ask coach</span>
                <textarea
                  rows={3}
                  value={explainerQuestion}
                  onChange={(event) => setExplainerQuestion(event.target.value)}
                  placeholder="Example: Why is my answer weak on tradeoffs?"
                />
              </label>
              <button
                className="ghost-button"
                type="submit"
                disabled={!coachSessionId || !explainerQuestion.trim() || Boolean(busyLabel)}
              >
                {busyLabel === "Explain Concept" ? "Explaining..." : "Send to coach"}
              </button>
            </form>
          </div>
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
                      <p className="muted-copy coach-session-progress-copy">
                        Progress: {item.progress_percent ?? 0}% · Subtopics {item.practiced_subtopics_count ?? 0}/{item.total_subtopics ?? 0} · Lessons {item.practiced_lessons_count ?? 0}/{item.total_lessons ?? 0}
                      </p>
                      {(item.practiced_subtopics?.length ?? 0) > 0 ? (
                        <div className="coach-chip-list coach-chip-list-compact">
                          {item.practiced_subtopics?.slice(0, 6).map((subtopic) => (
                            <span className="coach-chip" key={`${item.session_id}-${subtopic}`}>{subtopic}</span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <p className="muted-copy">No coach attempts yet.</p>
                )}
              </div>

              <p className="muted-copy">
                Attempted interview topics: {progress.attempted_topics.interview_topics.join(", ") || "none"}
              </p>

              <div className="card-heading">
                <p className="eyebrow">JD Analyzer History</p>
                <h2>Saved Job Description Analyses</h2>
              </div>
              <div className="summary-list">
                {progress.modules.job_description_analyzer.length ? (
                  progress.modules.job_description_analyzer.map((item) => (
                    <article className="summary-item" key={item.analysis_id}>
                      <div className="summary-item-head">
                        <strong>{item.company_name || "Unknown company"}</strong>
                        <span>{item.application_last_date || item.application_last_date_raw || "No deadline"}</span>
                      </div>
                      <p className="muted-copy">
                        Recruiter: {item.recruiter_name || "Not available"}
                      </p>
                      <p className="muted-copy">{item.recruiter_intent || "No recruiter intent summary"}</p>
                      <small>{item.job_description_preview}</small>
                    </article>
                  ))
                ) : (
                  <p className="muted-copy">No JD analyses saved yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="muted-copy">Loading your historical learning data...</p>
          )}
        </article>
      </section>
    </main>
  );
}

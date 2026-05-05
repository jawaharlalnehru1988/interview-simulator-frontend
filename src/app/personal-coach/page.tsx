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

import { TopicInput } from "./components/TopicInput";
import { SubtopicSelection } from "./components/SubtopicSelection";
import { LearningLoop } from "./components/LearningLoop";
import { CoachEvaluation } from "./components/CoachEvaluation";
import { ProgressHistory } from "./components/ProgressHistory";

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

  const [topic, setTopic] = useState("Java 8");
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
          session_id: sessionItem.session_id || sessionItem.id as number,
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
        <TopicInput
          topic={topic}
          setTopic={setTopic}
          busyLabel={busyLabel}
          predefinedTopics={PREDEFINED_TOPICS}
          handleStartCoach={handleStartCoach}
        />

        <SubtopicSelection
          coachPrompt={coachPrompt}
          subtopics={subtopics}
          selectedSubtopic={selectedSubtopic}
          setSelectedSubtopic={setSelectedSubtopic}
          practicedSubtopics={practicedSubtopics}
          handleChooseSubtopic={handleChooseSubtopic}
          busyLabel={busyLabel}
          coachSessionId={coachSessionId}
          lessons={lessons}
          selectedLesson={selectedLesson}
          setSelectedLesson={setSelectedLesson}
          practicedLessonsMap={practicedLessonsMap}
          handleChooseLesson={handleChooseLesson}
          topicProgressPercent={topicProgressPercent}
          topicProgressMeta={topicProgressMeta}
          completedLessonsForCurrentSubtopic={completedLessonsForCurrentSubtopic}
          suggestedNextSubtopic={suggestedNextSubtopic}
          applySuggestedSubtopic={applySuggestedSubtopic}
        />

        <LearningLoop
          lesson={lesson}
          selectedSubtopic={selectedSubtopic}
          selectedLesson={selectedLesson}
          handleSpeakSubtopic={handleSpeakSubtopic}
          ttsSupported={ttsSupported}
          isSpeakingSubtopic={isSpeakingSubtopic}
          isSpeechPaused={isSpeechPaused}
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          handleSubmitAnswer={handleSubmitAnswer}
          busyLabel={busyLabel}
        />

        <CoachEvaluation
          score={score}
          feedback={feedback}
          strengths={strengths}
          gaps={gaps}
          coachChat={coachChat}
          chatThreadRef={chatThreadRef}
          explainerQuestion={explainerQuestion}
          setExplainerQuestion={setExplainerQuestion}
          handleExplainQuestion={handleExplainQuestion}
          coachSessionId={coachSessionId}
          busyLabel={busyLabel}
        />

        <ProgressHistory
          progress={progress}
          handleResumeSession={handleResumeSession}
        />
      </section>
    </main>
  );
}

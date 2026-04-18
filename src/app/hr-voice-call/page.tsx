"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  ApiError,
  answerHRVoiceInterview,
  getCandidateProfile,
  getUserLearningProgress,
  resumeHRVoiceInterview,
  startHRVoiceInterview,
  type AuthState,
  type CandidateProfile,
  type HRVoiceFinalFeedback,
  type HRVoiceResumeResponse,
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

export default function HRVoiceCallPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [ready, setReady] = useState(false);

  const [progress, setProgress] = useState<UserLearningProgressResponse | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [questionCount, setQuestionCount] = useState(12);
  const [selectedAspirationId, setSelectedAspirationId] = useState<number | null>(null);
  const [selectedJdAnalysisId, setSelectedJdAnalysisId] = useState<number | null>(null);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [turns, setTurns] = useState<HRVoiceResumeResponse["turns"]>([]);
  const [finalFeedback, setFinalFeedback] = useState<HRVoiceFinalFeedback | null>(null);

  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoReadQuestion, setAutoReadQuestion] = useState(true);
  const recognitionRef = useRef<any>(null);
  const transcriptBaseRef = useRef("");
  const finalTranscriptRef = useRef("");

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
      // Keep usable when progress fetch fails.
    }
  }

  async function loadProfile() {
    if (!session.accessToken) {
      return;
    }

    try {
      const response = await getCandidateProfile(session.apiBaseUrl, authState);
      setProfile(response);
    } catch {
      // Keep setup usable even if profile fetch fails.
    }
  }

  useEffect(() => {
    if (!ready || !session.accessToken) {
      return;
    }
    void loadProgress();
    void loadProfile();
  }, [ready, session.accessToken]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(Boolean(speechCtor));
    setTtsSupported(typeof window.speechSynthesis !== "undefined");

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!currentQuestion || !ttsSupported || !autoReadQuestion) {
      return;
    }
    speakQuestion(currentQuestion);
  }, [currentQuestion, ttsSupported, autoReadQuestion]);

  function speakQuestion(question: string) {
    if (!ttsSupported || typeof window === "undefined" || !question.trim()) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (!speechSupported || typeof window === "undefined") {
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    setErrorMessage("");

    const speechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!speechCtor) {
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new speechCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    transcriptBaseRef.current = answer.trim();
    finalTranscriptRef.current = "";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const phrase = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${phrase} `;
        } else {
          interimTranscript += phrase;
        }
      }

      const spoken = `${finalTranscriptRef.current} ${interimTranscript}`.trim();
      const merged = [transcriptBaseRef.current, spoken].filter(Boolean).join(" ");
      setAnswer(merged);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }

  async function handleStartInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction("Start HR Interview", async () => {
      const response = await startHRVoiceInterview(session.apiBaseUrl, authState, {
        aspirationId: selectedAspirationId ?? undefined,
        jdAnalysisId: selectedJdAnalysisId ?? undefined,
        questionCount,
      });

      setSessionId(response.session_id);
      setStatus(response.status);
      setCurrentQuestion(response.current_question);
      setTurns([]);
      setFinalFeedback(null);
      setAnswer("");
      await loadProgress();
    });
  }

  async function handleSubmitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionId || !answer.trim()) {
      return;
    }

    if (isListening) {
      stopListening();
    }

    await runAction("Submit HR Answer", async () => {
      const response = await answerHRVoiceInterview(
        session.apiBaseUrl,
        authState,
        sessionId,
        answer.trim(),
      );

      setTurns((current) => [
        ...current,
        {
          question: currentQuestion,
          answer: answer.trim(),
          score: response.question_score,
          strengths: response.evaluation.strengths,
          weaknesses: response.evaluation.weaknesses,
          improvements: response.evaluation.improvements,
          created_at: new Date().toISOString(),
        },
      ]);

      setStatus(response.status);
      setAnswer("");

      if (response.status === "completed" && response.final_feedback) {
        setCurrentQuestion("");
        setFinalFeedback(response.final_feedback);
      } else {
        setCurrentQuestion(response.next_question || "");
      }

      await loadProgress();
    });
  }

  async function handleResumeSession(resumeSessionId: number) {
    await runAction("Resume HR Session", async () => {
      const response = await resumeHRVoiceInterview(session.apiBaseUrl, authState, resumeSessionId);
      setSessionId(response.session_id);
      setStatus(response.status);
      setCurrentQuestion(response.current_question || "");
      setTurns(response.turns);
      setFinalFeedback(response.final_feedback);
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
            <p className="eyebrow">HR Voice Call Interview</p>
            <h1>This route needs an authenticated session.</h1>
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
          <p className="eyebrow">Recruiter Simulation</p>
          <h1>HR Voice Call Interview</h1>
          <p className="hero-copy">
            AI acts as an HR recruiter, asks 10-15 screening questions based on your profile,
            aspiration, and JD context, then gives pass/fail and improvement feedback.
          </p>
        </div>
        <div className="hero-links">
          <Link className="secondary-button link-button" href="/profile-settings">
            Open profile settings
          </Link>
          <Link className="ghost-button link-button" href="/aspiration">
            Open aspiration
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}

      <section className="route-grid">
        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">1. Setup</p>
            <h2>Interview Context</h2>
          </div>

          <form className="stack-card" onSubmit={handleStartInterview}>
            <div className="question-panel stack-card">
              <div className="question-meta">
                <span>Profile Reference</span>
              </div>
              {profile ? (
                <>
                  <p className="muted-copy">
                    {(profile.current_position || "Role not set")}
                    {profile.current_company ? ` at ${profile.current_company}` : ""}
                    {profile.total_experience_years !== null
                      ? ` · ${profile.total_experience_years} years experience`
                      : ""}
                  </p>
                  <p className="muted-copy">
                    Preferred role: {profile.preferred_role || "Not set"} · Salary expectation: {profile.salary_expectation || "Not set"}
                  </p>
                  {profile.primary_skills.length ? (
                    <ul className="jd-chip-list">
                      {profile.primary_skills.slice(0, 8).map((skill) => (
                        <li key={skill}>{skill}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-copy">No skills listed yet. Add them in Profile Settings for more tailored HR questions.</p>
                  )}
                </>
              ) : (
                <p className="muted-copy">Loading profile reference...</p>
              )}
              <div className="button-row">
                <Link className="ghost-button link-button" href="/profile-settings">
                  Update profile
                </Link>
              </div>
            </div>

            <label className="field">
              <span>Question count</span>
              <input
                type="number"
                min={10}
                max={15}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value) || 10)}
              />
            </label>

            <label className="field">
              <span>Aspiration context (optional)</span>
              <select
                value={selectedAspirationId ?? ""}
                onChange={(event) =>
                  setSelectedAspirationId(event.target.value ? Number(event.target.value) : null)
                }
              >
                <option value="">Use latest aspiration</option>
                {(progress?.modules.aspirations ?? []).map((item) => (
                  <option key={item.aspiration_id} value={item.aspiration_id}>
                    {item.current_position} → {item.target_job}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>JD analysis context (optional)</span>
              <select
                value={selectedJdAnalysisId ?? ""}
                onChange={(event) =>
                  setSelectedJdAnalysisId(event.target.value ? Number(event.target.value) : null)
                }
              >
                <option value="">Use latest JD analysis</option>
                {(progress?.modules.job_description_analyzer ?? []).map((item) => (
                  <option key={item.analysis_id} value={item.analysis_id}>
                    {item.company_name || "Unknown company"} · {item.recruiter_name || "Recruiter"}
                  </option>
                ))}
              </select>
            </label>

            <button className="primary-button" type="submit" disabled={Boolean(busyLabel)}>
              {busyLabel === "Start HR Interview" ? "Starting..." : "Start HR voice call interview"}
            </button>
          </form>
        </article>

        <article className="card tall-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">2. Conversation</p>
            <h2>Q&A Simulation</h2>
          </div>

          {sessionId ? (
            <>
              <p className="muted-copy">Status: {status}</p>
              <div className="voice-support-strip">
                <span className={`voice-listening-pill ${isListening ? "live" : "idle"}`}>
                  {isListening ? "Mic is listening" : "Mic is idle"}
                </span>
                {!speechSupported ? (
                  <p className="muted-copy voice-support-copy">
                    Speech-to-text is unavailable in this browser. Use latest Chrome or Edge on desktop and allow microphone permission.
                  </p>
                ) : null}
                {!ttsSupported ? (
                  <p className="muted-copy voice-support-copy">
                    Text-to-speech is unavailable in this browser. You can still continue with typed answers.
                  </p>
                ) : null}
              </div>
              {currentQuestion ? (
                <form className="stack-card" onSubmit={handleSubmitAnswer}>
                  <div className="question-panel">
                    <div className="question-meta">
                      <span>Current HR Question</span>
                    </div>
                    <p>{currentQuestion}</p>
                    <div className="button-row">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => speakQuestion(currentQuestion)}
                        disabled={!ttsSupported}
                      >
                        Read question aloud
                      </button>
                      <label className="aspiration-pending-toggle">
                        <input
                          type="checkbox"
                          checked={autoReadQuestion}
                          onChange={(event) => setAutoReadQuestion(event.target.checked)}
                        />
                        <span>Auto-read next question</span>
                      </label>
                    </div>
                  </div>
                  <label className="field">
                    <span>Your answer</span>
                    <textarea
                      rows={5}
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      placeholder="Answer as if talking to recruiter on a real call"
                    />
                    <div className="button-row">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          if (isListening) {
                            stopListening();
                          } else {
                            startListening();
                          }
                        }}
                        disabled={!speechSupported}
                      >
                        {isListening ? "Stop microphone" : "Start microphone"}
                      </button>
                    </div>
                  </label>
                  <button
                    className="secondary-button"
                    type="submit"
                    disabled={!answer.trim() || Boolean(busyLabel)}
                  >
                    {busyLabel === "Submit HR Answer" ? "Evaluating..." : "Submit answer"}
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <p className="muted-copy">Start a session to begin HR screening simulation.</p>
          )}

          {turns.length ? (
            <div className="summary-list">
              {turns.slice(-5).map((turn, index) => (
                <article className="summary-item" key={`${turn.created_at}-${index}`}>
                  <div className="summary-item-head">
                    <strong>Score: {turn.score}</strong>
                  </div>
                  <p><strong>Q:</strong> {turn.question}</p>
                  <p><strong>A:</strong> {turn.answer}</p>
                  {turn.strengths?.length ? (
                    <p className="muted-copy"><strong>Strong points:</strong> {turn.strengths.join(" | ")}</p>
                  ) : null}
                  {turn.weaknesses?.length ? (
                    <p className="muted-copy"><strong>Needs improvement:</strong> {turn.weaknesses.join(" | ")}</p>
                  ) : null}
                  {turn.improvements?.length ? (
                    <div className="muted-copy">
                      <strong>Better way to answer:</strong>
                      <ul>
                        {turn.improvements.map((item, itemIndex) => (
                          <li key={`${turn.created_at}-${index}-improve-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="card stack-card full-card">
          <div className="card-heading">
            <p className="eyebrow">3. Final Report</p>
            <h2>Pass/Fail Feedback</h2>
          </div>

          {finalFeedback ? (
            <>
              <div className="score-orb">
                <span>Decision</span>
                <strong>{finalFeedback.pass ? "PASS" : "NOT YET"}</strong>
              </div>
              <p className="muted-copy">Average score: {finalFeedback.average_score}</p>
              <p>{finalFeedback.overall_feedback}</p>

              <div className="summary-list">
                <article className="summary-item">
                  <div className="summary-item-head"><strong>Strong Answers</strong></div>
                  <ul>
                    {finalFeedback.strong_answers.map((item, index) => (
                      <li key={`strong-${index}`}>{item.question} (score: {item.score})</li>
                    ))}
                  </ul>
                </article>
                <article className="summary-item">
                  <div className="summary-item-head"><strong>Weak Answers</strong></div>
                  <ul>
                    {finalFeedback.weak_answers.map((item, index) => (
                      <li key={`weak-${index}`}>{item.question} (score: {item.score})</li>
                    ))}
                  </ul>
                </article>
              </div>

              <article className="summary-item">
                <div className="summary-item-head"><strong>How to improve next time</strong></div>
                <ul>
                  {finalFeedback.improvement_plan.map((item, index) => (
                    <li key={`improve-${index}`}>{item}</li>
                  ))}
                </ul>
              </article>
            </>
          ) : (
            <p className="muted-copy">Complete all questions to get final HR call feedback.</p>
          )}
        </article>

        <article className="card full-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">4. Revisit</p>
            <h2>Previous HR Interview Sessions</h2>
          </div>

          {progress ? (
            <div className="summary-list">
              {(progress.modules.hr_voice_calls ?? []).length ? (
                progress.modules.hr_voice_calls.map((item) => (
                  <button
                    key={item.session_id}
                    type="button"
                    className="summary-item summary-item-button"
                    onClick={() => void handleResumeSession(item.session_id)}
                  >
                    <div className="summary-item-head">
                      <strong>{item.target_job || "HR Call Session"}</strong>
                      <span>{item.status}</span>
                    </div>
                    <small>
                      Answered: {item.answered_count}/{item.question_count} · Avg: {item.average_score ?? "--"}
                    </small>
                  </button>
                ))
              ) : (
                <p className="muted-copy">No HR voice call sessions yet.</p>
              )}
            </div>
          ) : (
            <p className="muted-copy">Loading session history...</p>
          )}
        </article>
      </section>
    </main>
  );
}

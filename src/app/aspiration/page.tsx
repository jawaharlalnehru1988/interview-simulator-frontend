"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  type AspirationChecklist,
  ApiError,
  createUserAspiration,
  generateAspirationChecklist,
  getUserLearningProgress,
  resumeUserAspiration,
  toggleAspirationChecklistItem,
  type AspirationResponse,
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

export default function AspirationPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [ready, setReady] = useState(false);

  const [currentPosition, setCurrentPosition] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [timelineMonths, setTimelineMonths] = useState(6);
  const [skillsInput, setSkillsInput] = useState("");
  const [constraints, setConstraints] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [result, setResult] = useState<AspirationResponse | null>(null);
  const [checklist, setChecklist] = useState<AspirationChecklist | null>(null);
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [progress, setProgress] = useState<UserLearningProgressResponse | null>(null);
  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  const currentSkills = useMemo(
    () =>
      skillsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [skillsInput],
  );

  const checklistWeeks = useMemo(() => {
    if (!checklist?.weeks?.length) {
      return [] as number[];
    }
    return checklist.weeks.map((week) => week.week);
  }, [checklist]);

  const visibleChecklistWeeks = useMemo(() => {
    if (!checklist?.weeks?.length) {
      return [];
    }
    const weekScoped =
      selectedWeek === "all"
        ? checklist.weeks
        : checklist.weeks.filter((week) => week.week === Number(selectedWeek));

    if (!showOnlyPending) {
      return weekScoped;
    }

    return weekScoped
      .map((week) => ({
        ...week,
        items: week.items.filter((item) => !item.completed),
      }))
      .filter((week) => week.items.length > 0);
  }, [checklist, selectedWeek, showOnlyPending]);

  useEffect(() => {
    setSelectedWeek("all");
    setShowOnlyPending(false);
  }, [checklist?.id]);

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

  async function handleCreateRoadmap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session.accessToken) {
      setErrorMessage("Log in from the auth route before creating a roadmap.");
      return;
    }

    if (!currentPosition.trim() || !targetJob.trim()) {
      setErrorMessage("Current position and target job are required.");
      return;
    }

    await runAction("Create Roadmap", async () => {
      const response = await createUserAspiration(session.apiBaseUrl, authState, {
        currentPosition: currentPosition.trim(),
        targetJob: targetJob.trim(),
        timelineMonths,
        currentSkills,
        constraints: constraints.trim(),
        additionalContext: additionalContext.trim(),
      });
      setResult(response);
      setChecklist(response.checklist ?? null);
      await loadProgress();
    });
  }

  async function handleResumeAspiration(aspirationId: number) {
    await runAction("Resume Aspiration", async () => {
      const response = await resumeUserAspiration(session.apiBaseUrl, authState, aspirationId);
      setResult(response);
      setChecklist(response.checklist ?? null);
      setCurrentPosition(response.current_position);
      setTargetJob(response.target_job);
      setTimelineMonths(response.timeline_months);
      setSkillsInput((response.current_skills ?? []).join(", "));
      setConstraints(response.constraints || "");
      setAdditionalContext(response.additional_context || "");
    });
  }

  async function handleConvertToChecklist(forceRegenerate = false) {
    if (!result?.aspiration_id) {
      setErrorMessage("Create or resume an aspiration first.");
      return;
    }

    await runAction("Generate Checklist", async () => {
      const response = await generateAspirationChecklist(
        session.apiBaseUrl,
        authState,
        result.aspiration_id,
        forceRegenerate,
      );
      setChecklist(response);
    });
  }

  async function handleToggleChecklistItem(itemId: string, completed: boolean) {
    if (!result?.aspiration_id) {
      return;
    }

    const previous = checklist;
    if (previous) {
      const optimisticItems = previous.items.map((item) =>
        item.id === itemId ? { ...item, completed } : item,
      );
      const completedCount = optimisticItems.filter((item) => item.completed).length;
      const grouped = previous.weeks.map((week) => ({
        ...week,
        items: week.items.map((item) =>
          item.id === itemId ? { ...item, completed } : item,
        ),
      }));

      setChecklist({
        ...previous,
        items: optimisticItems,
        weeks: grouped,
        completed_count: completedCount,
        progress_percent: previous.total_count
          ? Number(((completedCount * 100) / previous.total_count).toFixed(2))
          : 0,
      });
    }

    try {
      const response = await toggleAspirationChecklistItem(
        session.apiBaseUrl,
        authState,
        result.aspiration_id,
        itemId,
        completed,
      );
      setChecklist(response);
    } catch (error) {
      if (previous) {
        setChecklist(previous);
      }
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unexpected error";
      setErrorMessage(message);
    }
  }

  if (!ready) {
    return <main className="shell route-shell"><p className="muted-copy">Loading session...</p></main>;
  }

  if (!session.accessToken) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">Career Aspiration</p>
            <h1>This route needs an authenticated session.</h1>
            <p className="hero-copy">
              Log in first to create an AI roadmap from your current role to your target job.
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
          <p className="eyebrow">Career Strategy</p>
          <h1>User Aspiration Planner</h1>
          <p className="hero-copy">
            Tell AI where you are now and where you want to go. It will generate a practical,
            phased roadmap to help you reach your target role.
          </p>
        </div>
        <div className="hero-links">
          <Link className="secondary-button link-button" href="/job-analyzer">
            Open JD analyzer
          </Link>
          <Link className="ghost-button link-button" href="/personal-coach">
            Open personal coach
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}

      <section className="route-grid">
        <article className="card tall-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">1. Input</p>
            <h2>Career Aspiration</h2>
          </div>
          <form className="stack-card" onSubmit={handleCreateRoadmap}>
            <label className="field">
              <span>Current Position</span>
              <input
                value={currentPosition}
                onChange={(event) => setCurrentPosition(event.target.value)}
                placeholder="Example: Backend Developer"
                required
              />
            </label>
            <label className="field">
              <span>Target Job</span>
              <input
                value={targetJob}
                onChange={(event) => setTargetJob(event.target.value)}
                placeholder="Example: Senior Software Engineer"
                required
              />
            </label>
            <label className="field">
              <span>Timeline (months)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={timelineMonths}
                onChange={(event) => setTimelineMonths(Number(event.target.value) || 1)}
              />
            </label>
            <label className="field">
              <span>Current skills (comma separated)</span>
              <input
                value={skillsInput}
                onChange={(event) => setSkillsInput(event.target.value)}
                placeholder="Python, Django, REST APIs"
              />
            </label>
            <label className="field">
              <span>Constraints (optional)</span>
              <textarea
                rows={3}
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                placeholder="Example: Full-time job, only weekends available"
              />
            </label>
            <label className="field">
              <span>Additional context (optional)</span>
              <textarea
                rows={3}
                value={additionalContext}
                onChange={(event) => setAdditionalContext(event.target.value)}
                placeholder="Example: I want remote roles in product companies"
              />
            </label>
            <button className="primary-button" type="submit" disabled={Boolean(busyLabel)}>
              {busyLabel === "Create Roadmap" ? "Generating roadmap..." : "Generate roadmap"}
            </button>
          </form>
        </article>

        <article className="card tall-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">2. Result</p>
            <h2>Target Job Roadmap</h2>
          </div>
          {result ? (
            <>
              <p className="muted-copy">{result.roadmap.summary}</p>
              <div className="score-orb">
                <span>Readiness Score</span>
                <strong>{result.roadmap.readiness_score}</strong>
              </div>

              <article className="summary-item">
                <div className="summary-item-head">
                  <strong>Gap Analysis</strong>
                </div>
                <ul>
                  {result.roadmap.gap_analysis.map((item, index) => (
                    <li key={`gap-${index}`}>{item}</li>
                  ))}
                </ul>
              </article>

              <div className="summary-list">
                {result.roadmap.roadmap_phases.map((phase, index) => (
                  <article className="summary-item" key={`phase-${index}`}>
                    <div className="summary-item-head">
                      <strong>{phase.phase}</strong>
                      <span>{phase.duration}</span>
                    </div>
                    <p className="muted-copy">{phase.focus}</p>
                    <strong>Actions</strong>
                    <ul>
                      {phase.actions.map((item, actionIndex) => (
                        <li key={`phase-${index}-action-${actionIndex}`}>{item}</li>
                      ))}
                    </ul>
                    <strong>Deliverables</strong>
                    <ul>
                      {phase.deliverables.map((item, deliverableIndex) => (
                        <li key={`phase-${index}-deliverable-${deliverableIndex}`}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>

              <article className="summary-item">
                <div className="summary-item-head">
                  <strong>Weekly Execution</strong>
                </div>
                <ul>
                  {result.roadmap.weekly_execution.map((item, index) => (
                    <li key={`weekly-${index}`}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="summary-item">
                <div className="summary-item-head">
                  <strong>Interview Preparation</strong>
                </div>
                <ul>
                  {result.roadmap.interview_preparation.map((item, index) => (
                    <li key={`interview-prep-${index}`}>{item}</li>
                  ))}
                </ul>
              </article>

              <p className="banner success">{result.roadmap.encouragement}</p>

              <article className="summary-item aspiration-checklist-panel">
                <div className="summary-item-head">
                  <strong>Weekly Checklist</strong>
                  <span>
                    {checklist
                      ? `${checklist.completed_count}/${checklist.total_count} done (${checklist.progress_percent}%)`
                      : "Not generated"}
                  </span>
                </div>
                <p className="muted-copy">
                  Convert your roadmap into a week-by-week execution checklist and track progress with one click.
                </p>
                <div className="button-row">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={Boolean(busyLabel)}
                    onClick={() => void handleConvertToChecklist(false)}
                  >
                    {busyLabel === "Generate Checklist" ? "Generating..." : "Convert Aspiration to Weekly Checklist"}
                  </button>
                  {checklist ? (
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={Boolean(busyLabel)}
                      onClick={() => void handleConvertToChecklist(true)}
                    >
                      Regenerate Checklist
                    </button>
                  ) : null}
                </div>

                {checklist?.weeks?.length ? (
                  <label className="field aspiration-week-filter">
                    <span>Week filter</span>
                    <select
                      value={selectedWeek}
                      onChange={(event) => setSelectedWeek(event.target.value)}
                    >
                      <option value="all">All weeks</option>
                      {checklistWeeks.map((week) => (
                        <option key={`filter-week-${week}`} value={String(week)}>
                          Week {week}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {checklist?.weeks?.length ? (
                  <label className="aspiration-pending-toggle">
                    <input
                      type="checkbox"
                      checked={showOnlyPending}
                      onChange={(event) => setShowOnlyPending(event.target.checked)}
                    />
                    <span>Show only pending tasks</span>
                  </label>
                ) : null}

                {checklist?.weeks?.length ? (
                  <div className="summary-list">
                    {visibleChecklistWeeks.map((week) => (
                      <article className="summary-item" key={`week-${week.week}`}>
                        <div className="summary-item-head">
                          <strong>Week {week.week}</strong>
                        </div>
                        <ul className="aspiration-checklist-items">
                          {week.items.map((item) => (
                            <li key={item.id}>
                              <label className="aspiration-checklist-label">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={(event) =>
                                    void handleToggleChecklistItem(item.id, event.target.checked)
                                  }
                                />
                                <span>{item.title}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
            </>
          ) : (
            <p className="muted-copy">Submit your aspiration inputs to generate your roadmap.</p>
          )}
        </article>

        <article className="card full-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">3. Revisit</p>
            <h2>Saved Aspiration Plans</h2>
          </div>

          {progress ? (
            <div className="summary-list">
              {progress.modules.aspirations.length ? (
                progress.modules.aspirations.map((item) => (
                  <button
                    className="summary-item summary-item-button"
                    key={item.aspiration_id}
                    type="button"
                    onClick={() => void handleResumeAspiration(item.aspiration_id)}
                  >
                    <div className="summary-item-head">
                      <strong>{item.current_position} → {item.target_job}</strong>
                      <span>{item.timeline_months} months</span>
                    </div>
                    <small>
                      Readiness: {item.readiness_score ?? "--"} · Updated: {new Date(item.last_updated).toLocaleDateString()}
                    </small>
                    <p className="muted-copy">{item.summary}</p>
                  </button>
                ))
              ) : (
                <p className="muted-copy">No aspiration plans saved yet.</p>
              )}
            </div>
          ) : (
            <p className="muted-copy">Loading saved aspirations...</p>
          )}
        </article>
      </section>
    </main>
  );
}

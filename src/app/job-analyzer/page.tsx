"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  analyzeJobDescription,
  getUserLearningProgress,
  resumeJobDescriptionAnalysis,
  type AuthState,
  type JobDescriptionAnalysisResponse,
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

export default function JobAnalyzerPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [ready, setReady] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [applicationLastDate, setApplicationLastDate] = useState("");
  const [analysis, setAnalysis] = useState<JobDescriptionAnalysisResponse["analysis"] | null>(null);
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
      // Keep page usable if history fetch fails.
    }
  }

  useEffect(() => {
    if (!ready || !session.accessToken) {
      return;
    }
    void loadProgress();
  }, [ready, session.accessToken]);

  async function handleResumeAnalysis(analysisId: number) {
    await runAction("Resume JD Analysis", async () => {
      const response = await resumeJobDescriptionAnalysis(session.apiBaseUrl, authState, analysisId);
      setJobDescription(response.job_description || "");
      setRecruiterName(response.application_context.recruiter_name || "");
      setCompanyName(response.application_context.company_name || "");
      setApplicationLastDate(response.application_context.application_last_date || "");
      setAnalysis(response.analysis);
    });
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session.accessToken) {
      setErrorMessage("Log in from the auth route before analyzing a job description.");
      return;
    }

    if (!jobDescription.trim()) {
      setErrorMessage("Paste a job description first.");
      return;
    }

    await runAction("Analyze Job Description", async () => {
      const response = await analyzeJobDescription(
        session.apiBaseUrl,
        authState,
        {
          jobDescription: jobDescription.trim(),
          recruiterName,
          companyName,
          applicationLastDate,
        },
      );
      setAnalysis(response.analysis);

      if (!recruiterName && response.application_context.recruiter_name) {
        setRecruiterName(response.application_context.recruiter_name);
      }
      if (!companyName && response.application_context.company_name) {
        setCompanyName(response.application_context.company_name);
      }
      if (!applicationLastDate && response.application_context.application_last_date) {
        setApplicationLastDate(response.application_context.application_last_date);
      }

      await loadProgress();
    });
  }

  return (
    <main className="shell route-shell">
      <section className="route-hero">
        <div>
          <p className="eyebrow">Career Strategy Module</p>
          <h1>Job Description Analyzer</h1>
          <p className="hero-copy">
            Paste a JD and get recruiter intent, skill-priority tiers, salary disclosure extraction,
            market demandable salary guidance, and practical recommendations before your interview.
          </p>
        </div>
        <div className="hero-links">
          <Link className="secondary-button link-button" href="/auth">
            Open auth route
          </Link>
          <Link className="ghost-button link-button" href="/personal-coach">
            Open personal coach
          </Link>
        </div>
      </section>

      <section className="route-grid">
        <article className="card tall-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Input</p>
            <h2>Paste Job Description</h2>
          </div>
          <form className="stack-card" onSubmit={handleAnalyze}>
            <label className="field" htmlFor="job-description">
              <span>Job description text</span>
              <textarea
                id="job-description"
                rows={16}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the full job description here..."
              />
            </label>
            <label className="field" htmlFor="company-name">
              <span>Company (optional)</span>
              <input
                id="company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Example: Acme Technologies"
              />
            </label>
            <label className="field" htmlFor="recruiter-name">
              <span>Recruiter name (optional)</span>
              <input
                id="recruiter-name"
                value={recruiterName}
                onChange={(event) => setRecruiterName(event.target.value)}
                placeholder="Example: Priya Sharma"
              />
            </label>
            <label className="field" htmlFor="application-last-date">
              <span>Last date of application (optional)</span>
              <input
                id="application-last-date"
                type="date"
                value={applicationLastDate}
                onChange={(event) => setApplicationLastDate(event.target.value)}
              />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit" disabled={!!busyLabel}>
                {busyLabel || "Analyze JD"}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setJobDescription("");
                  setRecruiterName("");
                  setCompanyName("");
                  setApplicationLastDate("");
                  setAnalysis(null);
                  setErrorMessage("");
                }}
                disabled={!!busyLabel}
              >
                Clear
              </button>
            </div>
          </form>

          {errorMessage && <div className="banner error">{errorMessage}</div>}
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Intent</p>
            <h2>Recruiter Intent</h2>
          </div>
          <p className="muted-copy">
            {analysis?.recruiter_intent || "Run analysis to see the recruiter’s core hiring objective."}
          </p>
        </article>

        <article className="card stack-card full-card">
          <div className="card-heading">
            <p className="eyebrow">Skill Priorities</p>
            <h2>Strong, Okay, Low Priority Skills</h2>
          </div>
          <div className="metric-grid jd-skill-grid">
            <div>
              <strong>Strong Match</strong>
              <ul className="jd-chip-list">
                {(analysis?.skill_tiers.strong_match ?? []).map((item) => (
                  <li key={`strong-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Okay Match</strong>
              <ul className="jd-chip-list">
                {(analysis?.skill_tiers.okay_match ?? []).map((item) => (
                  <li key={`okay-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Low Priority</strong>
              <ul className="jd-chip-list">
                {(analysis?.skill_tiers.low_priority ?? []).map((item) => (
                  <li key={`low-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Disclosed Salary</strong>
              {analysis?.disclosed_salary.found ? (
                <p className="muted-copy">
                  {analysis.disclosed_salary.minimum} - {analysis.disclosed_salary.maximum}{" "}
                  {analysis.disclosed_salary.unit} ({analysis.disclosed_salary.currency})
                </p>
              ) : (
                <p className="muted-copy">No explicit salary detected in this JD.</p>
              )}
              {analysis?.disclosed_salary.raw_text && (
                <small className="muted-copy">Source: {analysis.disclosed_salary.raw_text}</small>
              )}
            </div>
          </div>
        </article>

        <article className="card tall-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Compensation View</p>
            <h2>Demandable Salary Estimate</h2>
          </div>
          {analysis ? (
            <>
              <p className="muted-copy">
                <strong>{analysis.market_salary_estimate.role_focus}</strong>
              </p>
              <div className="score-orb">
                <strong>
                  {analysis.market_salary_estimate.demandable_min} - {analysis.market_salary_estimate.demandable_max}
                </strong>
                <span>{analysis.market_salary_estimate.unit}</span>
              </div>
              <p className="muted-copy">
                Confidence: {analysis.market_salary_estimate.confidence}
              </p>
              <ul className="list-block">
                {analysis.market_salary_estimate.reasoning.map((item, index) => (
                  <li key={`reason-${index}`}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted-copy">Run analysis to get a market-based salary negotiation range.</p>
          )}
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Action Plan</p>
            <h2>Recommendations</h2>
          </div>
          <ul className="list-block">
            {(analysis?.recommendations ?? []).map((item, index) => (
              <li key={`recommendation-${index}`}>{item}</li>
            ))}
          </ul>
          {analysis?.encouragement && <div className="banner success">{analysis.encouragement}</div>}
        </article>

        <article className="card full-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">History</p>
            <h2>Previous JD Analyses</h2>
          </div>
          {progress ? (
            <div className="summary-list">
              {progress.modules.job_description_analyzer.length ? (
                progress.modules.job_description_analyzer.map((item) => (
                  <button
                    className="summary-item summary-item-button"
                    key={item.analysis_id}
                    type="button"
                    onClick={() => void handleResumeAnalysis(item.analysis_id)}
                  >
                    <div className="summary-item-head">
                      <strong>{item.company_name || "Unknown company"}</strong>
                      <span>{item.application_last_date || item.application_last_date_raw || "No deadline"}</span>
                    </div>
                    <p className="muted-copy">Recruiter: {item.recruiter_name || "Not available"}</p>
                    <p className="muted-copy">{item.recruiter_intent || "No recruiter intent summary"}</p>
                    <small>{item.job_description_preview}</small>
                  </button>
                ))
              ) : (
                <p className="muted-copy">No JD analyses saved yet.</p>
              )}
            </div>
          ) : (
            <p className="muted-copy">Loading saved JD analyses...</p>
          )}
        </article>
      </section>
    </main>
  );
}

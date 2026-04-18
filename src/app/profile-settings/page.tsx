"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  getCandidateProfile,
  updateCandidateProfile,
  type AuthState,
  type CandidateProfile,
} from "@/lib/api";
import {
  createDefaultSession,
  loadClientSession,
  saveClientSession,
  type ClientSession,
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const EMPTY_PROFILE: CandidateProfile = {
  current_position: "",
  current_company: "",
  total_experience_years: null,
  primary_skills: [],
  current_salary: "",
  salary_expectation: "",
  notice_period: "",
  reason_for_leaving: "",
  career_gap_details: "",
  highest_education: "",
  preferred_locations: [],
  preferred_role: "",
  additional_notes: "",
};

export default function ProfileSettingsPage() {
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL),
  );
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(EMPTY_PROFILE);
  const [skillsInput, setSkillsInput] = useState("");
  const [locationsInput, setLocationsInput] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
    setSuccessMessage("");

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

  async function loadProfile() {
    await runAction("Load Profile", async () => {
      const response = await getCandidateProfile(session.apiBaseUrl, authState);
      setProfile(response);
      setSkillsInput((response.primary_skills ?? []).join(", "));
      setLocationsInput((response.preferred_locations ?? []).join(", "));
    });
  }

  useEffect(() => {
    if (!ready || !session.accessToken) {
      return;
    }
    void loadProfile();
  }, [ready, session.accessToken]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction("Save Profile", async () => {
      const payload: CandidateProfile = {
        ...profile,
        primary_skills: skillsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        preferred_locations: locationsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const response = await updateCandidateProfile(session.apiBaseUrl, authState, payload);
      setProfile(response.profile);
      setSuccessMessage("Profile saved successfully.");
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
            <p className="eyebrow">Profile Settings</p>
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
          <p className="eyebrow">Candidate Data</p>
          <h1>Profile Settings</h1>
          <p className="hero-copy">
            Fill your complete career details. HR Voice Call interview will use this profile to ask
            realistic recruiter questions and evaluate your responses.
          </p>
        </div>
        <div className="hero-links">
          <Link className="secondary-button link-button" href="/hr-voice-call">
            Open HR voice call
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="banner error">{errorMessage}</p> : null}
      {successMessage ? <p className="banner success">{successMessage}</p> : null}

      <section className="route-grid">
        <article className="card full-card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Career Profile</p>
            <h2>Multi-Section Details</h2>
          </div>

          <form className="stack-card" onSubmit={handleSaveProfile}>
            <div className="metric-grid">
              <label className="field">
                <span>Current Position</span>
                <input
                  value={profile.current_position}
                  onChange={(event) => setProfile((current) => ({ ...current, current_position: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Current Company</span>
                <input
                  value={profile.current_company}
                  onChange={(event) => setProfile((current) => ({ ...current, current_company: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Total Experience (years)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={profile.total_experience_years ?? ""}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      total_experience_years: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Preferred Role</span>
                <input
                  value={profile.preferred_role}
                  onChange={(event) => setProfile((current) => ({ ...current, preferred_role: event.target.value }))}
                />
              </label>
            </div>

            <label className="field">
              <span>Primary Skills (comma separated)</span>
              <input value={skillsInput} onChange={(event) => setSkillsInput(event.target.value)} />
            </label>

            <div className="metric-grid">
              <label className="field">
                <span>Current Salary</span>
                <input
                  value={profile.current_salary}
                  onChange={(event) => setProfile((current) => ({ ...current, current_salary: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Salary Expectation</span>
                <input
                  value={profile.salary_expectation}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, salary_expectation: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Notice Period</span>
                <input
                  value={profile.notice_period}
                  onChange={(event) => setProfile((current) => ({ ...current, notice_period: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Highest Education</span>
                <input
                  value={profile.highest_education}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, highest_education: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="field">
              <span>Preferred Locations (comma separated)</span>
              <input value={locationsInput} onChange={(event) => setLocationsInput(event.target.value)} />
            </label>

            <label className="field">
              <span>Reason for leaving current job</span>
              <textarea
                rows={3}
                value={profile.reason_for_leaving}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, reason_for_leaving: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Career gap details</span>
              <textarea
                rows={3}
                value={profile.career_gap_details}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, career_gap_details: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Additional notes</span>
              <textarea
                rows={3}
                value={profile.additional_notes}
                onChange={(event) => setProfile((current) => ({ ...current, additional_notes: event.target.value }))}
              />
            </label>

            <button className="primary-button" type="submit" disabled={Boolean(busyLabel)}>
              {busyLabel === "Save Profile" ? "Saving..." : "Save profile"}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

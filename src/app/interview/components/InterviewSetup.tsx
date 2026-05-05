import React, { FormEvent } from "react";

interface InterviewSetupProps {
  session: { topic: string; roundType: string };
  updateSession: (updates: Partial<{ topic: string; roundType: string }>) => void;
  predefinedTopics: string[];
  busyLabel: string;
  handleStartInterview: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function InterviewSetup({
  session,
  updateSession,
  predefinedTopics,
  busyLabel,
  handleStartInterview,
}: InterviewSetupProps) {
  return (
    <article className="card stack-card">
      <div className="card-heading">
        <p className="eyebrow">Interview Setup</p>
        <h2>Start a new session</h2>
      </div>
      <form className="stack-card" onSubmit={handleStartInterview}>
        <label className="field">
          <span>Topic</span>
          <select
            value={predefinedTopics.includes(session.topic) ? session.topic : "custom"}
            onChange={(event) => {
              if (event.target.value === "custom") {
                updateSession({ topic: "" });
              } else {
                updateSession({ topic: event.target.value });
              }
            }}
          >
            {predefinedTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
            <option value="custom">Other (Type your own)</option>
          </select>
        </label>
        {!predefinedTopics.includes(session.topic) && (
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
            <option value="basic">Basic questions</option>
            <option value="critical_scenario">Critical Scenario</option>
            <option value="mcq">MCQ</option>
            <option value="coding">Coding</option>
          </select>
        </label>
        <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
          Start interview
        </button>
      </form>
    </article>
  );
}

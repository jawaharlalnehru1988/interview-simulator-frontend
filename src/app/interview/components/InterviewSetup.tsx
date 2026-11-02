import React, { FormEvent } from "react";

interface InterviewSetupProps {
  session: { topic: string; roundType: string };
  updateSession: (updates: Partial<{ topic: string; roundType: string }>) => void;
  busyLabel: string;
  handleStartInterview: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function InterviewSetup({
  session,
  updateSession,
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
          <textarea
            value={session.topic}
            onChange={(event) => updateSession({ topic: event.target.value })}
            placeholder="Type your topic here (e.g. Java 8, React, Next.js, System Design)..."
            rows={3}
            required
            className="w-full p-2 border rounded"
            style={{ 
              width: "100%", 
              padding: "10px", 
              borderRadius: "8px", 
              border: "1px solid #ccc", 
              minHeight: "80px", 
              outline: "none", 
              resize: "vertical" 
            }}
          />
        </label>
        <label className="field">
          <span>Round type</span>
          <select
            value={session.roundType}
            onChange={(event) => updateSession({ roundType: event.target.value })}
          >
            <option value="basic">Basic questions</option>
            <option value="critical_scenario">Critical Scenario</option>
          </select>
        </label>
        <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
          Start interview
        </button>
      </form>
    </article>
  );
}

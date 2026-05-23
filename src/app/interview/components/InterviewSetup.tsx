import React, { FormEvent } from "react";

interface InterviewSetupProps {
  session: { topic: string; roundType: string };
  updateSession: (updates: Partial<{ topic: string; roundType: string }>) => void;
  topics: { id: number; name: string; description: string }[];
  setIsAddTopicOpen: (open: boolean) => void;
  busyLabel: string;
  handleStartInterview: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function InterviewSetup({
  session,
  updateSession,
  topics,
  setIsAddTopicOpen,
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
            value={session.topic}
            onChange={(event) => {
              if (event.target.value === "add_new_topic") {
                setIsAddTopicOpen(true);
              } else {
                updateSession({ topic: event.target.value });
              }
            }}
          >
            {topics.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
            <option value="add_new_topic">➕ Add new topic...</option>
          </select>
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

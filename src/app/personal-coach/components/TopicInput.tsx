import React, { FormEvent } from "react";

interface TopicInputProps {
  topic: string;
  setTopic: (topic: string) => void;
  busyLabel: string;
  predefinedTopics: string[];
  handleStartCoach: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function TopicInput({
  topic,
  setTopic,
  busyLabel,
  predefinedTopics,
  handleStartCoach,
}: TopicInputProps) {
  return (
    <article className="card stack-card">
      <div className="card-heading">
        <p className="eyebrow">1. Topic Input</p>
        <h2>Start Coach Session</h2>
      </div>
      <form className="stack-card" onSubmit={handleStartCoach}>
        <label className="field">
          <span>Topic</span>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          >
            {predefinedTopics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="other">Other (Custom Topic)</option>
          </select>
        </label>
        {!predefinedTopics.includes(topic) && (
          <label className="field">
            <span>Custom Topic</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Enter a custom topic"
              required
            />
          </label>
        )}
        <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
          {busyLabel === "Start Coach" ? "Generating subtopics..." : "Generate subtopics"}
        </button>
      </form>
    </article>
  );
}

import React, { FormEvent } from "react";

interface TopicInputProps {
  topic: string;
  setTopic: (topic: string) => void;
  note: string;
  setNote: (note: string) => void;
  busyLabel: string;
  topics: { id: number; name: string; description: string }[];
  setIsAddTopicOpen: (open: boolean) => void;
  handleStartCoach: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function TopicInput({
  topic,
  setTopic,
  note,
  setNote,
  busyLabel,
  topics,
  setIsAddTopicOpen,
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
          <span>AI Instructions / Custom Note (Optional)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Focus on performance tuning, omit basic concepts, or customize for senior engineers."
            rows={3}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)" }}
          />
        </label>
        <label className="field">
          <span>Topic</span>
          <select
            value={topic}
            onChange={(event) => {
              if (event.target.value === "add_new_topic") {
                setIsAddTopicOpen(true);
              } else {
                setTopic(event.target.value);
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
        <button className="primary-button" disabled={Boolean(busyLabel)} type="submit">
          {busyLabel === "Start Coach" ? "Generating subtopics..." : "Generate subtopics"}
        </button>
      </form>
    </article>
  );
}

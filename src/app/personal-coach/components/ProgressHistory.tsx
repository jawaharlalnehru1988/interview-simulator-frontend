import React from "react";
import { UserLearningProgressResponse } from "@/lib/api";

interface ProgressHistoryProps {
  progress: UserLearningProgressResponse | null;
  handleResumeSession: (sessionId: number) => Promise<void>;
}

export function ProgressHistory({ progress, handleResumeSession }: ProgressHistoryProps) {
  const validSessions = progress?.modules.personal_coach.filter(
    (item) =>
      (item.total_subtopics && item.total_subtopics > 0) ||
      (item.total_lessons && item.total_lessons > 0) ||
      (item.progress_percent && item.progress_percent > 0) ||
      (item.practiced_subtopics?.length ?? 0) > 0
  ) || [];

  return (
    <article className="card stack-card full-card">
      <div className="card-heading">
        <p className="eyebrow">5. Your Progress</p>
        <h2>Revisit History</h2>
      </div>

      {progress ? (
        <>
          <p className="muted-copy">
            Attempted coach topics: {validSessions.length}
          </p>
          <div className="summary-list">
            {validSessions.length > 0 ? (
              Object.entries(
                validSessions.reduce((acc, item) => {
                  const t = item.topic || "Unknown";
                  if (!acc[t]) acc[t] = [];
                  acc[t].push(item);
                  return acc;
                }, {} as Record<string, typeof validSessions>)
              ).map(([topicName, sessions]) => (
                <div key={topicName} className="summary-group" style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "10px", color: "var(--ink)" }}>{topicName}</h3>
                  {sessions.map((item, index) => (
                    <button
                      className="summary-item summary-item-button"
                      key={item.session_id || item.id || `session-${index}`}
                      onClick={() => void handleResumeSession((item.session_id || item.id) as number)}
                      type="button"
                      style={{ textAlign: "left", width: "100%", marginBottom: "10px" }}
                    >
                      <div className="summary-item-head">
                        <strong>{item.topic}</strong>
                        <span>{item.current_subtopic || item.suggested_next_subtopic || "Resume"}</span>
                      </div>
                      <small>
                        Attempts: {item.attempt_count} · Avg score: {item.average_score ?? "--"}
                      </small>
                      <p className="muted-copy coach-session-progress-copy">
                        Progress: {item.progress_percent ?? 0}% · Subtopics {item.practiced_subtopics_count ?? 0}/{item.total_subtopics ?? 0} · Lessons {item.practiced_lessons_count ?? 0}/{item.total_lessons ?? 0}
                      </p>
                      {(item.practiced_subtopics?.length ?? 0) > 0 ? (
                        <div className="coach-chip-list coach-chip-list-compact">
                          {item.practiced_subtopics?.slice(0, 6).map((subtopic) => (
                            <span className="coach-chip" key={`${item.session_id || item.id}-${subtopic}`}>{subtopic}</span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <p className="muted-copy">No coach attempts yet.</p>
            )}
          </div>

          <p className="muted-copy">
            Attempted interview topics: {progress.attempted_topics.interview_topics.join(", ") || "none"}
          </p>

          <div className="card-heading">
            <p className="eyebrow">JD Analyzer History</p>
            <h2>Saved Job Description Analyses</h2>
          </div>
          <div className="summary-list">
            {progress.modules.job_description_analyzer.length ? (
              progress.modules.job_description_analyzer.map((item) => (
                <article className="summary-item" key={item.analysis_id}>
                  <div className="summary-item-head">
                    <strong>{item.company_name || "Unknown company"}</strong>
                    <span>{item.application_last_date || item.application_last_date_raw || "No deadline"}</span>
                  </div>
                  <p className="muted-copy">
                    Recruiter: {item.recruiter_name || "Not available"}
                  </p>
                  <p className="muted-copy">{item.recruiter_intent || "No recruiter intent summary"}</p>
                  <small>{item.job_description_preview}</small>
                </article>
              ))
            ) : (
              <p className="muted-copy">No JD analyses saved yet.</p>
            )}
          </div>
        </>
      ) : (
        <p className="muted-copy">Loading your historical learning data...</p>
      )}
    </article>
  );
}

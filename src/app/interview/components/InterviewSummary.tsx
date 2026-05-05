import React from "react";

interface InterviewSummaryProps {
  history: any[];
  summary: any;
  handleResumeInterview: (interview: any) => void;
}

export function InterviewSummary({
  history,
  summary,
  handleResumeInterview,
}: InterviewSummaryProps) {
  return (
    <article className="card stack-card tall-card">
      <div className="card-heading">
        <p className="eyebrow">Interview Summary</p>
        <h2>Attempted interviews</h2>
      </div>
      {history.length > 0 ? (
        <div className="summary-list">
          {Object.entries(
            history.reduce((acc, interview) => {
              const t = interview.topic || "Unknown";
              if (!acc[t]) acc[t] = [];
              acc[t].push(interview);
              return acc;
            }, {} as Record<string, any[]>)
          ).map(([topicName, interviews]: [string, any]) => (
            <div key={topicName} className="summary-group" style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "10px", color: "var(--ink)" }}>{topicName}</h3>
              {interviews.map((interview: any, index: number) => (
                <div className="summary-item" key={interview.interview_id || (interview as any).id || index}>
                  <div className="summary-item-head">
                    <strong>{interview.topic}</strong>
                    <span>{interview.round || (interview as any).roundType}</span>
                    <span>{interview.status}</span>
                  </div>
                  <small style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Asked: {interview.questions_asked ?? (interview as any).questions?.length} · Avg: {interview.average_score ?? "--"}</span>
                    {interview.status === "IN_PROGRESS" && (
                      <button
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => handleResumeInterview(interview)}
                      >
                        Resume
                      </button>
                    )}
                  </small>
                  <div className="summary-list">
                    {(interview.questions || (interview as any).questions || [])
                      .filter((q: any) => q.answer || q.score !== null)
                      .map((item: any, qIndex: number) => (
                      <div className="summary-item" key={item.question_id || item.id || qIndex}>
                        <div className="summary-item-head">
                          <strong>Q{item.order ?? item.sort_order ?? (qIndex + 1)}</strong>
                          <span>{item.difficulty}</span>
                          <span>{item.score ?? "pending"}</span>
                        </div>
                        <p>{item.question || item.text}</p>
                        <small>{item.answer || "No answer submitted yet."}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="metric-grid">
            <div>
              <span>Topic</span>
              <strong>{summary.topic}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{summary.status}</strong>
            </div>
            <div>
              <span>Asked</span>
              <strong>{summary.questions_asked}</strong>
            </div>
            <div>
              <span>Average</span>
              <strong>{summary.average_score ?? "--"}</strong>
            </div>
          </div>
          <div className="summary-list">
            {(summary.questions || [])
              .filter((q: any) => q.answer || q.score !== null)
              .map((item: any, qIndex: number) => (
              <div className="summary-item" key={item.question_id || item.id || qIndex}>
                <div className="summary-item-head">
                  <strong>Q{(item.order ?? item.sort_order ?? qIndex) + 1}</strong>
                  <span>{item.difficulty}</span>
                  <span>{item.score ?? "pending"}</span>
                </div>
                <p>{item.question || item.text}</p>
                <small>{item.answer || "No answer submitted yet."}</small>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted-copy">Start interview and answer questions to build your history.</p>
      )}
    </article>
  );
}

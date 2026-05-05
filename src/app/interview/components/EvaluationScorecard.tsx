import React from "react";

interface EvaluationScorecardProps {
  session: { roundType: string; interviewId: number | null };
  lastEvaluation: any;
  summary: any;
}

export function EvaluationScorecard({
  session,
  lastEvaluation,
  summary,
}: EvaluationScorecardProps) {
  return (
    <article className="card stack-card">
      <div className="card-heading">
        <p className="eyebrow">Evaluation</p>
        <h2>Latest scorecard</h2>
      </div>
      {lastEvaluation ? (
        <>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <div className="score-orb" style={{ flex: 1, padding: "16px", textAlign: "center" }}>
              <span>Current Answer Score</span>
              <strong>{lastEvaluation.score} / {session.roundType === 'mcq' ? 1 : session.roundType === 'coding' ? 20 : 10}</strong>
            </div>
            {summary && (summary.interview_id === session.interviewId || (summary as any).id === session.interviewId) && (() => {
              const evaluatedQs = summary.questions.filter((q: any) => q.score != null);
              const totalScore = evaluatedQs.reduce((acc: number, q: any) => acc + q.score, 0);
              const maxPerQuestion = session.roundType === 'mcq' ? 1 : session.roundType === 'coding' ? 20 : 10;
              const maxScore = evaluatedQs.length * maxPerQuestion;
              if (maxScore === 0) return null;
              return (
                <div className="score-orb" style={{ flex: 1, padding: "16px", textAlign: "center", background: "linear-gradient(135deg, rgba(239,197,141,0.2), rgba(180,79,43,0.1))" }}>
                  <span>Cumulative Score</span>
                  <strong>{totalScore} / {maxScore}</strong>
                </div>
              );
            })()}
          </div>
          {session.roundType === "mcq" ? (
            <div className="list-block">
              <h3>Explanation</h3>
              <ul>
                {lastEvaluation.strengths.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="list-block">
                <h3>Strengths</h3>
                <ul>
                  {lastEvaluation.strengths.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="list-block">
                <h3>Weaknesses</h3>
                <ul>
                  {lastEvaluation.weaknesses.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="list-block">
                <h3>Improvements</h3>
                <ul>
                  {lastEvaluation.improvements.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </>
      ) : (
        <p className="muted-copy">
          The backend currently falls back when no LLM key is configured. Once you provide your
          purchased model details, this panel will start showing real model-generated feedback.
        </p>
      )}
    </article>
  );
}

import React, { FormEvent, RefObject } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

type CoachChatMessage = {
  id: number;
  question: string;
  answer: string;
  pending: boolean;
};

interface CoachEvaluationProps {
  score: number | null;
  feedback: string;
  strengths: string[];
  gaps: string[];
  coachChat: CoachChatMessage[];
  chatThreadRef: RefObject<HTMLDivElement | null>;
  explainerQuestion: string;
  setExplainerQuestion: (val: string) => void;
  handleExplainQuestion: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  coachSessionId: number | null;
  busyLabel: string;
}

export function CoachEvaluation({
  score,
  feedback,
  strengths,
  gaps,
  coachChat,
  chatThreadRef,
  explainerQuestion,
  setExplainerQuestion,
  handleExplainQuestion,
  coachSessionId,
  busyLabel,
}: CoachEvaluationProps) {
  return (
    <article className="card stack-card coach-side-panel">
      <div className="card-heading">
        <p className="eyebrow">4. Feedback + Doubts</p>
        <h2>Coach Evaluation</h2>
      </div>

      <div className="coach-evaluation-compact">
        {score !== null ? (
          <>
            <div className="coach-evaluation-score-row">
              <div className="coach-score-pill">
                <span>Score</span>
                <strong>{score}</strong>
              </div>
              <p className="muted-copy coach-feedback">{feedback || "Coach feedback will appear here."}</p>
            </div>
            <div className="coach-evaluation-columns">
              <article className="summary-item coach-summary-mini">
                <div className="summary-item-head">
                  <strong>Strengths</strong>
                </div>
                <ul>
                  {strengths.length ? strengths.map((item) => <li key={item}>{item}</li>) : <li>No strengths yet</li>}
                </ul>
              </article>
              <article className="summary-item coach-summary-mini">
                <div className="summary-item-head">
                  <strong>Gaps</strong>
                </div>
                <ul>
                  {gaps.length ? gaps.map((item) => <li key={item}>{item}</li>) : <li>No gaps yet</li>}
                </ul>
              </article>
            </div>
          </>
        ) : (
          <p className="muted-copy">Submit an answer to receive coach feedback and next steps.</p>
        )}
      </div>

      <div className="coach-chat-panel">
        <div className="coach-chat-header">
          <p className="muted-copy coach-explainer-title">Cross-question and doubt clear chat</p>
        </div>
        <div className="coach-chat-thread" ref={chatThreadRef} role="log" aria-live="polite">
          {coachChat.length ? (
            coachChat.map((entry) => (
              <div className="coach-chat-entry" key={entry.id}>
                <div className="coach-chat-bubble coach-chat-user">
                  <strong>You</strong>
                  <p>{entry.question}</p>
                </div>
                <div className="coach-chat-bubble coach-chat-coach">
                  <strong>Coach</strong>
                  {entry.pending ? (
                    <p className="muted-copy">Thinking...</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
                      {entry.answer}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="muted-copy">Ask any terminology, syntax, or follow-up question after each evaluation.</p>
          )}
        </div>
        <form className="stack-card coach-chat-input" onSubmit={handleExplainQuestion}>
          <label className="field">
            <span>Ask coach</span>
            <textarea
              rows={3}
              value={explainerQuestion}
              onChange={(event) => setExplainerQuestion(event.target.value)}
              placeholder="Example: Why is my answer weak on tradeoffs?"
            />
          </label>
          <button
            className="ghost-button"
            type="submit"
            disabled={!coachSessionId || !explainerQuestion.trim() || Boolean(busyLabel)}
          >
            {busyLabel === "Explain Concept" ? "Explaining..." : "Send to coach"}
          </button>
        </form>
      </div>
    </article>
  );
}

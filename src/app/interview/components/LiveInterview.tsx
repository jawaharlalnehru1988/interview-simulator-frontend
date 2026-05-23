import React, { FormEvent, Dispatch, SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-light.css";

interface LiveInterviewProps {
  session: { roundType: string; interviewId: number | null };
  currentQuestion: any;
  busyLabel: string;
  showSuggestedAnswer: boolean;
  setShowSuggestedAnswer: Dispatch<SetStateAction<boolean>>;
  timeLeft: string;
  answerText: string;
  setAnswerText: (val: string) => void;
  handleSubmitAnswer: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  handleNextQuestion: () => Promise<void>;
}

function extractCleanedQuestion(text: string) {
  return text.replace(/^Question:\s*/i, "");
}

export function LiveInterview({
  session,
  currentQuestion,
  busyLabel,
  showSuggestedAnswer,
  setShowSuggestedAnswer,
  timeLeft,
  answerText,
  setAnswerText,
  handleSubmitAnswer,
  handleNextQuestion,
}: LiveInterviewProps) {
  return (
    <article className="card stack-card tall-card">
      <div className="card-heading">
        <p className="eyebrow">Live Interview</p>
        <h2>Question and answer flow</h2>
      </div>
      <div className="button-row">
        <button
          className="ghost-button"
          disabled={!currentQuestion || Boolean(busyLabel)}
          onClick={() => setShowSuggestedAnswer((current) => !current)}
          type="button"
        >
          {showSuggestedAnswer ? "Hide answer" : "Show answer"}
        </button>
      </div>
      <div className="question-panel">
        <div className="question-meta">
          <span>Question</span>
          <strong>{currentQuestion?.question_number ?? "--"}</strong>
          <span>Difficulty</span>
          <strong>{currentQuestion?.difficulty ?? "--"}</strong>
          {timeLeft && (
            <>
              <span>Time Left</span>
              <strong style={{ color: "var(--accent)" }}>{timeLeft}</strong>
            </>
          )}
        </div>
        <div className="question-text markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeHighlight, { detect: true }]]}
          >
            {extractCleanedQuestion(
              currentQuestion?.question ?? "Fetch a question to begin."
            )}
          </ReactMarkdown>
        </div>
      </div>

      {showSuggestedAnswer ? (
        <div className="coach-suggestion">
          <p className="mcq-label">Suggested answer</p>
          <div className="question-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeHighlight, { detect: true }]]}
            >
              {currentQuestion?.suggested_answer?.trim() ||
                "Suggested answer is not available for this question yet. Please fetch the next question."}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}

      <form className="stack-card" onSubmit={handleSubmitAnswer}>
        <label className="field">
          <span>Your answer</span>
          <textarea
            rows={6}
            value={answerText}
            onChange={(event) => setAnswerText(event.target.value)}
            placeholder="Describe your design, tradeoffs, and production strategy."
          />
        </label>
        <div className="button-row">
          <button
            className="primary-button"
            disabled={!currentQuestion || !answerText.trim() || Boolean(busyLabel)}
            type="submit"
          >
            Submit answer
          </button>
          <button
            className="secondary-button"
            disabled={!session.interviewId || Boolean(busyLabel)}
            onClick={handleNextQuestion}
            type="button"
          >
            Fetch next question
          </button>
        </div>
      </form>
    </article>
  );
}

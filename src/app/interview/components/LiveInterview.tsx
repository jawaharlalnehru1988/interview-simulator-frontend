import React, { FormEvent, Dispatch, SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LiveInterviewProps {
  session: { roundType: string; interviewId: number | null };
  currentQuestion: any;
  busyLabel: string;
  showSuggestedAnswer: boolean;
  setShowSuggestedAnswer: Dispatch<SetStateAction<boolean>>;
  timeLeft: string;
  selectedMcqOption: string;
  setSelectedMcqOption: (val: string) => void;
  answerText: string;
  setAnswerText: (val: string) => void;
  handleSubmitAnswer: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  handleNextQuestion: () => Promise<void>;
}

function extractCleanedQuestion(text: string, isMcq: boolean) {
  if (!isMcq) {
    return text.replace(/^Question:\s*/i, "");
  }
  let cleaned = text;
  cleaned = cleaned.replace(/^Question:\s*/i, "");
  const mcqPattern = /[\s?.!]\s*([A-D][).]|(?:\([A-D]\))|1[).])/;
  const match = cleaned.match(mcqPattern);

  if (match && match.index !== undefined) {
    cleaned = cleaned.substring(0, match.index + 1).trim();
  }

  return cleaned;
}

export function LiveInterview({
  session,
  currentQuestion,
  busyLabel,
  showSuggestedAnswer,
  setShowSuggestedAnswer,
  timeLeft,
  selectedMcqOption,
  setSelectedMcqOption,
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
        <p className="question-text">
          {extractCleanedQuestion(
            currentQuestion?.question ?? "Fetch a question to begin.",
            session.roundType === "mcq" && Boolean(currentQuestion?.mcq_options?.length),
          )}
        </p>
      </div>

      {showSuggestedAnswer ? (
        <div className="coach-suggestion">
          <p className="mcq-label">Suggested answer</p>
          <div className="question-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentQuestion?.suggested_answer?.trim() ||
                "Suggested answer is not available for this question yet. Please fetch the next question."}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}

      {session.roundType === "mcq" && currentQuestion?.mcq_options?.length ? (
        <div className="mcq-options-wrapper">
          <p className="mcq-label">Select the correct option:</p>
          <div className="mcq-options">
            {currentQuestion.mcq_options.map((option: string) => {
              const checked = selectedMcqOption === option;
              return (
                <button
                  key={option}
                  className={`mcq-option ${checked ? "mcq-option-selected" : ""}`}
                  onClick={() => {
                    setSelectedMcqOption(option);
                    setAnswerText(option);
                  }}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <form className="stack-card" onSubmit={handleSubmitAnswer}>
        {session.roundType !== "mcq" && (
          <label className="field">
            <span>Your answer</span>
            <textarea
              rows={6}
              value={answerText}
              onChange={(event) => {
                setAnswerText(event.target.value);
                if (selectedMcqOption) {
                  setSelectedMcqOption("");
                }
              }}
              placeholder="Describe your design, tradeoffs, and production strategy."
            />
          </label>
        )}
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

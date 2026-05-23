import React, { FormEvent, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

interface LearningLoopProps {
  lesson: string;
  selectedSubtopic: string;
  selectedLesson: string;
  handleSpeakSubtopic: () => void;
  ttsSupported: boolean;
  isSpeakingSubtopic: boolean;
  isSpeechPaused: boolean;
  question: string;
  answer: string;
  setAnswer: (val: string) => void;
  handleSubmitAnswer: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  busyLabel: string;
}

export function LearningLoop({
  lesson,
  selectedSubtopic,
  selectedLesson,
  handleSpeakSubtopic,
  ttsSupported,
  isSpeakingSubtopic,
  isSpeechPaused,
  question,
  answer,
  setAnswer,
  handleSubmitAnswer,
  busyLabel,
}: LearningLoopProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});

  let parsedQuestions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }> = [];

  let isMcq = false;
  try {
    if (question && (question.trim().startsWith("[") || question.trim().startsWith("{"))) {
      const parsed = JSON.parse(question.trim());
      parsedQuestions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      isMcq = parsedQuestions.length > 0;
    }
  } catch (e) {
    // Not a JSON MCQ array
  }

  useEffect(() => {
    setSelectedAnswers({});
  }, [question]);

  const handleOptionChange = (qIndex: number, option: string) => {
    const updated = { ...selectedAnswers, [qIndex]: option };
    setSelectedAnswers(updated);
    
    // Create an ordered array of user answers
    const answersList = parsedQuestions.map((_, idx) => updated[idx] || "");
    setAnswer(JSON.stringify(answersList));
  };

  const allAnswered = isMcq && parsedQuestions.length > 0 &&
    parsedQuestions.every((_, idx) => selectedAnswers[idx] !== undefined && selectedAnswers[idx] !== "");

  return (
    <article className="card stack-card tall-card">
      <div className="card-heading">
        <p className="eyebrow">3. Learn + Practice</p>
        <h2>AI Teaching Loop</h2>
      </div>

      {lesson ? (
        <div className="question-panel">
          <div className="question-meta">
            <div className="stack-card coach-subtopic-header">
              <span>Current Subtopic</span>
              <strong>{selectedSubtopic || "--"}</strong>
              <span>Current Lesson</span>
              <strong>{selectedLesson || "--"}</strong>
            </div>
            <button
              className="ghost-button coach-tts-button"
              type="button"
              onClick={handleSpeakSubtopic}
              disabled={!ttsSupported || !selectedSubtopic.trim()}
              aria-label="Read current subtopic aloud"
              title="Read current subtopic aloud"
            >
              <svg
                aria-hidden="true"
                className="coach-tts-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 11.5a6.5 6.5 0 1 0 13 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M12 18v3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M9 21h6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                {isSpeakingSubtopic
                  ? isSpeechPaused
                    ? "Resume"
                    : "Pause"
                  : "Read"}
              </span>
            </button>
          </div>
          <div className="coach-lesson">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
              {lesson}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}

      {question ? (
        <form className="stack-card" onSubmit={handleSubmitAnswer}>
          {isMcq ? (
            <div className="field">
              <span>Coach Questions</span>
              <div className="mcq-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '10px' }}>
                {parsedQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="mcq-item" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '20px' }}>
                    <p className="question-text" style={{ fontWeight: '600', marginBottom: '12px' }}>
                      Q{qIdx + 1}. {q.question}
                    </p>
                    <div className="mcq-options">
                      {q.options.map((option, optIdx) => {
                        const isSelected = selectedAnswers[qIdx] === option;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className={`mcq-option ${isSelected ? "mcq-option-selected" : ""}`}
                            onClick={() => handleOptionChange(qIdx, option)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <label className="field">
                <span>Coach Question</span>
                <p className="coach-question">{question}</p>
              </label>
              <label className="field">
                <span>Your Answer</span>
                <textarea
                  rows={6}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Write a structured answer with definition, example, and tradeoffs."
                />
              </label>
            </>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={!question || (isMcq ? !allAnswered : !answer.trim()) || Boolean(busyLabel)}
          >
            {busyLabel === "Evaluate Answer" ? "Evaluating..." : "Submit answer"}
          </button>
        </form>
      ) : (
        <p className="muted-copy">Choose a subtopic to start the teaching loop.</p>
      )}
    </article>
  );
}

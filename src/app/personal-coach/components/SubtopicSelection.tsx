import React, { FormEvent } from "react";

interface SubtopicSelectionProps {
  coachPrompt: string;
  subtopics: string[];
  selectedSubtopic: string;
  setSelectedSubtopic: (val: string) => void;
  practicedSubtopics: string[];
  handleChooseSubtopic: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  busyLabel: string;
  coachSessionId: number | null;
  lessons: string[];
  selectedLesson: string;
  setSelectedLesson: (val: string) => void;
  practicedLessonsMap: Record<string, string[]>;
  handleChooseLesson: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  topicProgressPercent: number;
  topicProgressMeta: {
    totalSubtopics: number;
    practicedSubtopicsCount: number;
    totalLessons: number;
    practicedLessonsCount: number;
  };
  completedLessonsForCurrentSubtopic: string[];
  suggestedNextSubtopic: string;
  applySuggestedSubtopic: () => void;
}

export function SubtopicSelection({
  coachPrompt,
  subtopics,
  selectedSubtopic,
  setSelectedSubtopic,
  practicedSubtopics,
  handleChooseSubtopic,
  busyLabel,
  coachSessionId,
  lessons,
  selectedLesson,
  setSelectedLesson,
  practicedLessonsMap,
  handleChooseLesson,
  topicProgressPercent,
  topicProgressMeta,
  completedLessonsForCurrentSubtopic,
  suggestedNextSubtopic,
  applySuggestedSubtopic,
}: SubtopicSelectionProps) {
  return (
    <article className="card stack-card tall-card">
      <div className="card-heading">
        <p className="eyebrow">2. Subtopic Choice</p>
        <h2>Select What To Learn</h2>
      </div>
      <p className="muted-copy">{coachPrompt || "AI will suggest subtopics after you start."}</p>

      <form className="stack-card" onSubmit={handleChooseSubtopic}>
        <label className="field">
          <span>Subtopic</span>
          <select
            value={selectedSubtopic}
            onChange={(event) => setSelectedSubtopic(event.target.value)}
            disabled={!Array.isArray(subtopics) || !subtopics.length || Boolean(busyLabel)}
          >
            <option value="">Choose a subtopic</option>
            {(Array.isArray(subtopics) ? subtopics : []).map((subtopic) => (
              <option key={subtopic} value={subtopic}>
                {practicedSubtopics.some((item) => item.toLowerCase() === subtopic.toLowerCase())
                  ? `${subtopic} (Practiced)`
                  : subtopic}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          type="submit"
          disabled={!coachSessionId || !selectedSubtopic || Boolean(busyLabel)}
        >
          {busyLabel === "Choose Subtopic" ? "Loading lessons..." : "Load lessons"}
        </button>
      </form>

      <form className="stack-card" onSubmit={handleChooseLesson}>
        <label className="field">
          <span>Lesson</span>
          <select
            value={selectedLesson}
            onChange={(event) => setSelectedLesson(event.target.value)}
            disabled={!lessons.length || !selectedSubtopic || Boolean(busyLabel)}
          >
            <option value="">Choose a lesson</option>
            {lessons.map((lessonItem) => (
              <option key={lessonItem} value={lessonItem}>
                {(practicedLessonsMap[selectedSubtopic] ?? []).some(
                  (item) => item.toLowerCase() === lessonItem.toLowerCase(),
                )
                  ? `${lessonItem} (Practiced)`
                  : lessonItem}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          type="submit"
          disabled={!coachSessionId || !selectedSubtopic || !selectedLesson || Boolean(busyLabel)}
        >
          {busyLabel === "Choose Lesson" ? "Preparing lesson..." : "Load lesson and practice"}
        </button>
      </form>

      {(practicedSubtopics.length || completedLessonsForCurrentSubtopic.length || topicProgressPercent > 0) ? (
        <div className="coach-progress-panel">
          <div className="coach-progress-header">
            <strong>Topic Progress</strong>
            <span>{topicProgressPercent.toFixed(0)}%</span>
          </div>
          <div className="coach-progress-bar" aria-hidden="true">
            <span style={{ width: `${topicProgressPercent}%` }} />
          </div>
          <p className="muted-copy coach-progress-copy">
            Completed subtopics: {topicProgressMeta.practicedSubtopicsCount}/{topicProgressMeta.totalSubtopics} · Completed lessons: {topicProgressMeta.practicedLessonsCount}/{topicProgressMeta.totalLessons}
          </p>

          {practicedSubtopics.length ? (
            <div className="coach-chip-block">
              <span className="coach-chip-title">Completed subtopics</span>
              <div className="coach-chip-list">
                {practicedSubtopics.map((item) => (
                  <span className="coach-chip" key={item}>{item}</span>
                ))}
              </div>
            </div>
          ) : null}

          {completedLessonsForCurrentSubtopic.length ? (
            <div className="coach-chip-block">
              <span className="coach-chip-title">Completed lessons</span>
              <div className="coach-chip-list">
                {completedLessonsForCurrentSubtopic.map((item) => (
                  <span className="coach-chip coach-chip-soft" key={item}>{item}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {suggestedNextSubtopic ? (
        <div className="coach-suggestion">
          <p className="muted-copy">
            Suggested next subtopic: <strong>{suggestedNextSubtopic}</strong>
          </p>
          <button className="ghost-button" type="button" onClick={applySuggestedSubtopic}>
            Use suggested subtopic
          </button>
        </div>
      ) : null}

    </article>
  );
}

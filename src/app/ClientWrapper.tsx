"use client";

import { ReactNode, useState, useEffect } from "react";
import TopNavbar from "./TopNavbar";
import { ThemeProvider } from "@/lib/useTheme";
import { TopicProvider, useTopics } from "@/context/TopicContext";

function AddTopicModal() {
  const { isAddTopicOpen, setIsAddTopicOpen, addTopic } = useTopics();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAddTopicOpen) {
      setName("");
      setDescription("");
      setError("");
    }
  }, [isAddTopicOpen]);

  if (!isAddTopicOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Topic name is required");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await addTopic(name.trim(), description.trim());
      setIsAddTopicOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create topic");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setIsAddTopicOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card-heading">
          <p className="eyebrow">Custom Topic</p>
          <h2>Add New Topic</h2>
        </div>
        
        {error && <p className="banner error">{error}</p>}

        <form onSubmit={handleSubmit} className="stack-card">
          <label className="field">
            <span>Topic Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Advanced Java Concurrency"
              required
              disabled={busy}
            />
          </label>

          <label className="field">
            <span>Description / AI Instructions</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Focus on memory model, locks, fork-join, and reactive streams."
              rows={3}
              disabled={busy}
            />
          </label>

          <div className="button-row" style={{ marginTop: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsAddTopicOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={busy}
            >
              {busy ? "Creating..." : "Create Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SiteWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <TopNavbar />
      {children}
      <AddTopicModal />
    </div>
  );
}

export default function ClientWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TopicProvider>
        <SiteWrapper>{children}</SiteWrapper>
      </TopicProvider>
    </ThemeProvider>
  );
}

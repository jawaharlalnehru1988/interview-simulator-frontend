"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { loadClientSession } from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080";

const MEDIA_BASE = DEFAULT_API_BASE_URL.replace(/\/api$/, "");

const DOC_TYPES = ["PDF", "IMAGE", "WORD", "EXCEL", "POWERPOINT", "TEXT", "OTHER"];

interface DocumentItem {
  id: number;
  name: string;
  file: string;
  documentType: string;
  oldOrNew: string;
  description: string | null;
  createdAt: string;
}

function getFileIcon(type: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (type === "IMAGE" || ext === "jpg" || ext === "jpeg" || ext === "png") return "🖼️";
  if (type === "PDF" || ext === "pdf") return "📄";
  if (type === "WORD" || ext === "doc" || ext === "docx") return "📝";
  if (type === "EXCEL" || ext === "xls" || ext === "xlsx") return "📊";
  return "📁";
}

function getMediaUrl(filePath: string): string {
  return `${MEDIA_BASE}/media/${filePath}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Upload Modal ────────────────────────────────────────────────────────────
interface UploadModalProps {
  accessToken: string;
  onClose: () => void;
  onUploaded: () => void;
}

function UploadModal({ accessToken, onClose, onUploaded }: UploadModalProps) {
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("PDF");
  const [oldOrNew, setOldOrNew] = useState("NEW");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file."); return; }
    if (!name.trim()) { setError("Please enter a document name."); return; }

    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name.trim());
    fd.append("document_type", docType);
    fd.append("old_or_new", oldOrNew);
    if (description.trim()) fd.append("description", description.trim());

    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/upload/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
  };
  const panelStyle: React.CSSProperties = {
    background: "var(--surface, #12121e)", border: "1px solid var(--border, #2a2a40)",
    borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "480px",
    display: "flex", flexDirection: "column", gap: "20px",
  };
  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };
  const labelStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" };
  const inputStyle: React.CSSProperties = {
    padding: "10px 12px", borderRadius: "8px",
    border: "1px solid var(--border, #2a2a40)",
    background: "var(--surface-2, #1a1a2e)", color: "inherit",
    fontSize: "0.9rem", width: "100%", boxSizing: "border-box",
  };
  const selectStyle = { ...inputStyle };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Upload Document</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", opacity: 0.6, color: "inherit" }}>✕</button>
        </div>

        {error && <p style={{ margin: 0, color: "#f87171", fontSize: "0.85rem", background: "rgba(248,113,113,0.1)", padding: "10px 14px", borderRadius: "8px" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* File picker */}
          <div style={fieldStyle}>
            <label style={labelStyle}>File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed var(--border, #2a2a40)", borderRadius: "10px",
                padding: "20px", textAlign: "center", cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              {file ? (
                <span style={{ fontSize: "0.9rem" }}>📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              ) : (
                <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>Click to browse or drag & drop</span>
              )}
            </div>
            <input ref={fileRef} type="file" onChange={handleFile} style={{ display: "none" }} />
          </div>

          {/* Name */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Document Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aadhaar Card" />
          </div>

          {/* Type + Old/New in a row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Type</label>
              <select style={selectStyle} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Status</label>
              <select style={selectStyle} value={oldOrNew} onChange={(e) => setOldOrNew(e.target.value)}>
                <option value="NEW">New</option>
                <option value="OLD">Old</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description…"
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="primary-button" disabled={uploading} style={{ flex: 1 }}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button type="button" className="secondary-button" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showUpload, setShowUpload] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const session = loadClientSession(DEFAULT_API_BASE_URL);
    setAccessToken(session.accessToken);
  }, []);

  async function fetchDocs() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDocs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    void fetchDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (!accessToken) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">My Documents</p>
            <h1>This route needs an authenticated session.</h1>
          </div>
          <div className="hero-links">
            <Link className="primary-button link-button" href="/auth">Go to auth route</Link>
          </div>
        </section>
      </main>
    );
  }

  const docTypes = ["ALL", ...Array.from(new Set(docs.map((d) => d.documentType)))];
  const filtered = filter === "ALL" ? docs : docs.filter((d) => d.documentType === filter);

  return (
    <main className="shell route-shell">
      {showUpload && (
        <UploadModal
          accessToken={accessToken}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { void fetchDocs(); }}
        />
      )}

      {/* Hero */}
      <section className="route-hero">
        <div>
          <p className="eyebrow">Secure Vault</p>
          <h1>My Documents</h1>
          <p className="hero-copy">All your uploaded documents — PDFs, images, certificates, and more — in one place.</p>
        </div>
        <div className="hero-links">
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowUpload(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>＋</span> Add Document
          </button>
        </div>
      </section>

      {error && <p className="banner error">{error}</p>}

      {/* Toolbar: Filter tabs + View toggle */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {docTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              style={{
                padding: "6px 16px", borderRadius: "999px",
                border: "1px solid var(--border, #334)",
                background: filter === type ? "var(--accent, #6366f1)" : "transparent",
                color: filter === type ? "#fff" : "inherit",
                cursor: "pointer", fontSize: "0.82rem", fontWeight: 500,
                transition: "all 0.15s ease",
              }}
            >
              {type} ({type === "ALL" ? docs.length : docs.filter((d) => d.documentType === type).length})
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: "4px", border: "1px solid var(--border, #334)", borderRadius: "8px", overflow: "hidden" }}>
          {(["table", "grid"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              title={mode === "table" ? "List view" : "Card view"}
              style={{
                padding: "6px 14px", border: "none", cursor: "pointer",
                background: viewMode === mode ? "var(--accent, #6366f1)" : "transparent",
                color: viewMode === mode ? "#fff" : "inherit",
                fontSize: "1rem", transition: "background 0.15s",
              }}
            >
              {mode === "table" ? "☰" : "⊞"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <article className="card full-card"><p className="muted-copy">Loading documents…</p></article>
      ) : filtered.length === 0 ? (
        <article className="card full-card">
          <p className="muted-copy">No documents found. Click <strong>Add Document</strong> to upload one.</p>
        </article>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ── */
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #2a2a40)", textAlign: "left" }}>
                {["#", "Type", "Name", "Description", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontWeight: 700, opacity: 0.6, whiteSpace: "nowrap", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, idx) => {
                const fileName = doc.file.split("/").pop() ?? doc.name;
                const mediaUrl = getMediaUrl(doc.file);
                const icon = getFileIcon(doc.documentType, fileName);
                return (
                  <tr
                    key={doc.id}
                    style={{ borderBottom: "1px solid var(--border, #1e1e30)", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.07)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 14px", opacity: 0.4 }}>{idx + 1}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span title={doc.documentType} style={{ fontSize: "1.2rem" }}>{icon}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, maxWidth: "200px" }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                      <div style={{ fontSize: "0.72rem", opacity: 0.45, marginTop: "2px" }}>{fileName}</div>
                    </td>
                    <td style={{ padding: "12px 14px", maxWidth: "220px" }}>
                      <span style={{ opacity: 0.6, fontSize: "0.82rem" }}>{doc.description ?? "—"}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 600, padding: "2px 10px",
                        borderRadius: "999px", border: "1px solid var(--border, #334)",
                        opacity: 0.7, whiteSpace: "nowrap",
                      }}>{doc.oldOrNew}</span>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", opacity: 0.55, fontSize: "0.8rem" }}>
                      {formatDate(doc.createdAt)}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                          className="primary-button"
                          style={{ padding: "5px 14px", fontSize: "0.78rem", textDecoration: "none" }}>
                          Open
                        </a>
                        <a href={mediaUrl} download={fileName}
                          className="secondary-button"
                          style={{ padding: "5px 14px", fontSize: "0.78rem", textDecoration: "none" }}>
                          ↓
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <section className="route-grid">
          {filtered.map((doc) => {
            const fileName = doc.file.split("/").pop() ?? doc.name;
            const mediaUrl = getMediaUrl(doc.file);
            const icon = getFileIcon(doc.documentType, fileName);
            const isImage = doc.documentType === "IMAGE" || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
            return (
              <article key={doc.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "2rem" }}>{icon}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 10px", borderRadius: "999px", background: "var(--accent, #6366f1)", color: "#fff", textTransform: "uppercase" }}>
                    {doc.documentType}
                  </span>
                </div>
                {isImage && (
                  <div style={{ width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", background: "var(--surface-2, #1a1a2e)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl} alt={doc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: 0 }}>
                  <h2 style={{ fontSize: "1rem", margin: 0 }}>{doc.name}</h2>
                  {doc.description && <p className="muted-copy" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>{doc.description}</p>}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <span className="muted-copy" style={{ fontSize: "0.75rem" }}>{formatDate(doc.createdAt)}</span>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", border: "1px solid var(--border, #334)", opacity: 0.7 }}>{doc.oldOrNew}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="primary-button"
                    style={{ flex: 1, textAlign: "center", padding: "8px", fontSize: "0.85rem", textDecoration: "none" }}>Open</a>
                  <a href={mediaUrl} download={fileName} className="secondary-button"
                    style={{ flex: 1, textAlign: "center", padding: "8px", fontSize: "0.85rem", textDecoration: "none" }}>Download</a>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

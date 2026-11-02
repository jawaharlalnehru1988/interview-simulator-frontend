"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/lib/useSession";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080";

const MEDIA_BASE = DEFAULT_API_BASE_URL.replace(/\/api$/, "");

const DOC_TYPES = ["PDF", "IMAGE", "WORD", "EXCEL", "POWERPOINT", "TEXT", "OTHER"];

const DEFAULT_CATEGORIES = [
  "Household Appliance Bills and Warranty",
  "Government Related Documents",
  "Medical Documents",
  "Academic Certificates",
  "Professional or Career Related Documents",
];

interface CategoryItem {
  id: number;
  name: string;
}

interface FamilyMemberItem {
  id: number;
  name: string;
  relationship?: string | null;
}

interface DocumentItem {
  id: number;
  name: string;
  file: string;
  documentType: string;
  oldOrNew: string;
  description: string | null;
  familyMember?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  createdAt: string;
}

function getFileIcon(type: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (type === "IMAGE" || ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") return "🖼️";
  if (type === "PDF" || ext === "pdf") return "📄";
  if (type === "WORD" || ext === "doc" || ext === "docx") return "📝";
  if (type === "EXCEL" || ext === "xls" || ext === "xlsx") return "📊";
  return "📁";
}

function getMediaUrl(filePath: string): string {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  if (cleanPath.startsWith("media/")) {
    return `${MEDIA_BASE}/${cleanPath}`;
  }
  return `${MEDIA_BASE}/media/${cleanPath}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Reusable Modal Styles ──────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.65)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

const panelStyle: React.CSSProperties = {
  background: "var(--surface-strong, #1e1e2d)",
  border: "1px solid var(--line, rgba(255,255,255,0.12))",
  borderRadius: "16px",
  padding: "28px",
  width: "100%",
  maxWidth: "520px",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  color: "inherit",
};

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  opacity: 0.75,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid var(--line, rgba(255,255,255,0.16))",
  background: "rgba(0,0,0,0.15)",
  color: "inherit",
  fontSize: "0.9rem",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Upload Modal ────────────────────────────────────────────────────────────
interface UploadModalProps {
  accessToken: string;
  categories: CategoryItem[];
  familyMembers: string[];
  initialCategory?: string;
  initialFamilyMember?: string;
  onClose: () => void;
  onUploaded: () => void;
  onCategoryCreated: (newCat: CategoryItem) => void;
  onFamilyMemberCreated: (newMember: string) => void;
}

function UploadModal({
  accessToken,
  categories,
  familyMembers,
  initialCategory,
  initialFamilyMember,
  onClose,
  onUploaded,
  onCategoryCreated,
  onFamilyMemberCreated,
}: UploadModalProps) {
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("PDF");
  const [oldOrNew, setOldOrNew] = useState("NEW");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState(
    initialCategory && initialCategory !== "ALL"
      ? initialCategory
      : categories[0]?.name ?? DEFAULT_CATEGORIES[0]
  );
  const [familyMember, setFamilyMember] = useState(
    initialFamilyMember && initialFamilyMember !== "ALL" ? initialFamilyMember : "Self"
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Inline custom inputs
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showNewMemberInput, setShowNewMemberInput] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const saved: CategoryItem = await res.json();
      onCategoryCreated(saved);
      setCategoryName(saved.name);
      setNewCatName("");
      setShowNewCatInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    }
  }

  async function handleAddMember() {
    if (!newMemberName.trim()) return;
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/family-members/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newMemberName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add family member");
      onFamilyMemberCreated(newMemberName.trim());
      setFamilyMember(newMemberName.trim());
      setNewMemberName("");
      setShowNewMemberInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add family member");
    }
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
    fd.append("family_member", familyMember.trim() || "Self");

    // Match category ID if available
    const matched = categories.find((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase());
    if (matched) {
      fd.append("category_id", String(matched.id));
    } else {
      fd.append("category_name", categoryName.trim());
    }

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

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Upload Document</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", opacity: 0.65 }}>
              Add a document with category and family member assignment
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", opacity: 0.6, color: "inherit" }}>✕</button>
        </div>

        {error && <p style={{ margin: 0, color: "#f87171", fontSize: "0.85rem", background: "rgba(248,113,113,0.12)", padding: "10px 14px", borderRadius: "8px" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* File picker */}
          <div style={fieldStyle}>
            <label style={labelStyle}>File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed var(--line, rgba(255,255,255,0.2))", borderRadius: "10px",
                padding: "18px", textAlign: "center", cursor: "pointer",
                background: "rgba(0,0,0,0.08)",
              }}
            >
              {file ? (
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              ) : (
                <span style={{ opacity: 0.65, fontSize: "0.85rem" }}>Click to browse or drag & drop</span>
              )}
            </div>
            <input ref={fileRef} type="file" onChange={handleFile} style={{ display: "none" }} />
          </div>

          {/* Name */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Document Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Microwave Oven Bill & Warranty" />
          </div>

          {/* Family Member & Category (Grid) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Family Member */}
            <div style={fieldStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={labelStyle}>Family Member</label>
                <button
                  type="button"
                  onClick={() => setShowNewMemberInput(!showNewMemberInput)}
                  style={{ background: "none", border: "none", color: "var(--accent, #b44f2b)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                >
                  {showNewMemberInput ? "Select" : "+ New"}
                </button>
              </div>
              {showNewMemberInput ? (
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    style={{ ...inputStyle, padding: "8px 10px" }}
                    placeholder="New member…"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <button type="button" onClick={handleAddMember} className="primary-button" style={{ padding: "8px 12px", fontSize: "0.75rem" }}>
                    Add
                  </button>
                </div>
              ) : (
                <select style={inputStyle} value={familyMember} onChange={(e) => setFamilyMember(e.target.value)}>
                  {familyMembers.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Category */}
            <div style={fieldStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={labelStyle}>Category</label>
                <button
                  type="button"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  style={{ background: "none", border: "none", color: "var(--accent, #b44f2b)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                >
                  {showNewCatInput ? "Select" : "+ New"}
                </button>
              </div>
              {showNewCatInput ? (
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    style={{ ...inputStyle, padding: "8px 10px" }}
                    placeholder="New category…"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <button type="button" onClick={handleAddCategory} className="primary-button" style={{ padding: "8px 12px", fontSize: "0.75rem" }}>
                    Add
                  </button>
                </div>
              ) : (
                <select style={inputStyle} value={categoryName} onChange={(e) => setCategoryName(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Type + Status in a row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Document Type</label>
              <select style={inputStyle} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={oldOrNew} onChange={(e) => setOldOrNew(e.target.value)}>
                <option value="NEW">New</option>
                <option value="OLD">Old</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: "68px" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description or warranty expiration notes…"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button type="submit" className="primary-button" disabled={uploading} style={{ flex: 1 }}>
              {uploading ? "Uploading…" : "Upload Document"}
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

// ─── Edit Document Modal ─────────────────────────────────────────────────────
interface EditModalProps {
  document: DocumentItem;
  accessToken: string;
  categories: CategoryItem[];
  familyMembers: string[];
  onClose: () => void;
  onSaved: () => void;
}

function EditDocumentModal({
  document: doc,
  accessToken,
  categories,
  familyMembers,
  onClose,
  onSaved,
}: EditModalProps) {
  const [name, setName] = useState(doc.name);
  const [description, setDescription] = useState(doc.description ?? "");
  const [familyMember, setFamilyMember] = useState(doc.familyMember ?? "Self");
  const [categoryId, setCategoryId] = useState<number | null>(
    doc.categoryId ?? (categories.find((c) => c.name === doc.categoryName)?.id ?? null)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name cannot be empty."); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/${doc.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          familyMember: familyMember.trim() || "Self",
          categoryId: categoryId,
        }),
      });
      if (!res.ok) throw new Error("Failed to update document");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Edit Document</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", opacity: 0.65 }}>
              Modify category, family member assignment, or details
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", opacity: 0.6, color: "inherit" }}>✕</button>
        </div>

        {error && <p style={{ margin: 0, color: "#f87171", fontSize: "0.85rem", background: "rgba(248,113,113,0.12)", padding: "10px 14px", borderRadius: "8px" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Document Name</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Family Member</label>
              <select style={inputStyle} value={familyMember} onChange={(e) => setFamilyMember(e.target.value)}>
                {familyMembers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Category</label>
              <select
                style={inputStyle}
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">(No Category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: "68px" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button type="submit" className="primary-button" disabled={saving} style={{ flex: 1 }}>
              {saving ? "Saving…" : "Save Changes"}
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

// ─── Add Category Modal ──────────────────────────────────────────────────────
interface AddCategoryModalProps {
  accessToken: string;
  onClose: () => void;
  onCreated: (cat: CategoryItem) => void;
}

function AddCategoryModal({ accessToken, onClose, onCreated }: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Category name is required."); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const created: CategoryItem = await res.json();
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Add Document Category</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", opacity: 0.6, color: "inherit" }}>✕</button>
        </div>

        {error && <p style={{ margin: 0, color: "#f87171", fontSize: "0.85rem", background: "rgba(248,113,113,0.12)", padding: "10px 14px", borderRadius: "8px" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Category Name *</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tax & Investment Records"
              autoFocus
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button type="submit" className="primary-button" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? "Adding…" : "Add Category"}
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

// ─── Add Family Member Modal ─────────────────────────────────────────────────
interface AddMemberModalProps {
  accessToken: string;
  onClose: () => void;
  onCreated: (name: string) => void;
}

function AddFamilyMemberModal({ accessToken, onClose, onCreated }: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Spouse");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const RELATIONS = ["Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Other"];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Family member name is required."); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/family-members/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: name.trim(), relationship }),
      });
      if (!res.ok) throw new Error("Failed to add family member");
      onCreated(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Add Family Member</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", opacity: 0.65 }}>
              Manage documents for each member of your family
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", opacity: 0.6, color: "inherit" }}>✕</button>
        </div>

        {error && <p style={{ margin: 0, color: "#f87171", fontSize: "0.85rem", background: "rgba(248,113,113,0.12)", padding: "10px 14px", borderRadius: "8px" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Member Name *</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John / Father / Sarah"
              autoFocus
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Relationship</label>
            <select style={inputStyle} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button type="submit" className="primary-button" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? "Adding…" : "Add Member"}
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
  const { session, isLoggedIn } = useSession();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<string[]>(["Self"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & view
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showUpload, setShowUpload] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  const accessToken = session.accessToken;

  // Fetch all documents
  async function fetchDocs() {
    if (!accessToken) return;
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DocumentItem[] = await res.json();
      setDocs(data);

      // Extract unique family members from documents as well
      const docMembers = data
        .map((d) => d.familyMember?.trim())
        .filter((m): m is string => Boolean(m && m.length > 0));
      setFamilyMembers((prev) => Array.from(new Set(["Self", ...prev, ...docMembers])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }

  // Fetch categories
  async function fetchCategories() {
    if (!accessToken) return;
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/categories/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data: CategoryItem[] = await res.json();
        // Ensure defaults exist in list
        const existingNames = new Set(data.map((c) => c.name.toLowerCase()));
        const merged = [...data];
        DEFAULT_CATEGORIES.forEach((defName, idx) => {
          if (!existingNames.has(defName.toLowerCase())) {
            merged.push({ id: 9000 + idx, name: defName });
          }
        });
        setCategories(merged);
      }
    } catch (e) {
      console.error("Categories fetch error:", e);
    }
  }

  // Fetch family members
  async function fetchFamilyMembers() {
    if (!accessToken) return;
    try {
      const res = await fetch(`${DEFAULT_API_BASE_URL}/api/documents/family-members/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data: FamilyMemberItem[] = await res.json();
        const names = data.map((m) => m.name.trim()).filter(Boolean);
        setFamilyMembers((prev) => Array.from(new Set(["Self", ...prev, ...names])));
      }
    } catch (e) {
      console.error("Family members fetch error:", e);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([fetchDocs(), fetchCategories(), fetchFamilyMembers()]).finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Derived filtered documents
  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      // 1. Family member filter
      const member = (doc.familyMember?.trim() || "Self");
      if (selectedMember !== "ALL" && member.toLowerCase() !== selectedMember.toLowerCase()) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== "ALL") {
        const catName = doc.categoryName?.trim() || "";
        if (catName.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 3. Document type filter
      if (selectedType !== "ALL" && doc.documentType !== selectedType) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesDesc = (doc.description ?? "").toLowerCase().includes(q);
        const matchesCat = (doc.categoryName ?? "").toLowerCase().includes(q);
        const matchesMem = (doc.familyMember ?? "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat && !matchesMem) {
          return false;
        }
      }

      return true;
    });
  }, [docs, selectedMember, selectedCategory, selectedType, searchQuery]);

  // Unique document types in current member's documents
  const availableDocTypes = useMemo(() => {
    const subset = selectedMember === "ALL"
      ? docs
      : docs.filter((d) => (d.familyMember?.trim() || "Self").toLowerCase() === selectedMember.toLowerCase());
    return ["ALL", ...Array.from(new Set(subset.map((d) => d.documentType)))];
  }, [docs, selectedMember]);

  // Document counts per category under the selected family member
  const categoryCounts = useMemo(() => {
    const memberDocs = selectedMember === "ALL"
      ? docs
      : docs.filter((d) => (d.familyMember?.trim() || "Self").toLowerCase() === selectedMember.toLowerCase());

    const counts: Record<string, number> = {};
    for (const d of memberDocs) {
      const c = d.categoryName?.trim();
      if (c) {
        counts[c.toLowerCase()] = (counts[c.toLowerCase()] ?? 0) + 1;
      }
    }
    return counts;
  }, [docs, selectedMember]);

  // Document counts per family member
  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of docs) {
      const m = (d.familyMember?.trim() || "Self").toLowerCase();
      counts[m] = (counts[m] ?? 0) + 1;
    }
    return counts;
  }, [docs]);

  if (!isLoggedIn && !accessToken) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">My Documents</p>
            <h1>This route needs an authenticated session.</h1>
          </div>
          <div className="hero-links">
            <Link className="primary-button link-button" href="/auth?redirect=/documents">Go to auth route</Link>
          </div>
        </section>
      </main>
    );
  }

  const isFiltered = selectedMember !== "ALL" || selectedCategory !== "ALL" || selectedType !== "ALL" || Boolean(searchQuery.trim());

  return (
    <main className="shell route-shell">
      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          accessToken={accessToken}
          categories={categories}
          familyMembers={familyMembers}
          initialCategory={selectedCategory}
          initialFamilyMember={selectedMember}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { void fetchDocs(); }}
          onCategoryCreated={(newCat) => {
            setCategories((prev) => [...prev, newCat]);
          }}
          onFamilyMemberCreated={(newMember) => {
            setFamilyMembers((prev) => Array.from(new Set([...prev, newMember])));
          }}
        />
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <EditDocumentModal
          document={editingDoc}
          accessToken={accessToken}
          categories={categories}
          familyMembers={familyMembers}
          onClose={() => setEditingDoc(null)}
          onSaved={() => { void fetchDocs(); }}
        />
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <AddCategoryModal
          accessToken={accessToken}
          onClose={() => setShowAddCategory(false)}
          onCreated={(cat) => {
            setCategories((prev) => [...prev, cat]);
            setSelectedCategory(cat.name);
          }}
        />
      )}

      {/* Add Family Member Modal */}
      {showAddMember && (
        <AddFamilyMemberModal
          accessToken={accessToken}
          onClose={() => setShowAddMember(false)}
          onCreated={(name) => {
            setFamilyMembers((prev) => Array.from(new Set([...prev, name])));
            setSelectedMember(name);
          }}
        />
      )}

      {/* Hero */}
      <section className="route-hero" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">Secure Vault</p>
          <h1>My Documents</h1>
          <p className="hero-copy">
            Organize personal & family documents with categorized folders, instant search, and secure downloads.
          </p>
        </div>
        <div className="hero-links" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowAddCategory(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>📁</span> Add Category
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowAddMember(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>👥</span> Add Family Member
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowUpload(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>＋</span> Upload Document
          </button>
        </div>
      </section>

      {error && <p className="banner error">{error}</p>}

      {/* ── Filter Section Card ── */}
      <div
        style={{
          background: "var(--surface, rgba(255, 250, 243, 0.78))",
          border: "1px solid var(--line, rgba(45, 34, 28, 0.12))",
          borderRadius: "16px",
          padding: "18px 22px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        {/* Row 1: Family Member Selector */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.7, display: "flex", alignItems: "center", gap: "6px" }}>
              👥 Family Members
            </span>
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent, #b44f2b)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
              }}
            >
              + Add Member
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setSelectedMember("ALL")}
              style={{
                padding: "6px 16px",
                borderRadius: "999px",
                border: "1px solid " + (selectedMember === "ALL" ? "var(--accent, #b44f2b)" : "var(--line, rgba(45,34,28,0.18))"),
                background: selectedMember === "ALL" ? "var(--accent, #b44f2b)" : "rgba(0,0,0,0.03)",
                color: selectedMember === "ALL" ? "#ffffff" : "inherit",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              All Family ({docs.length})
            </button>

            {familyMembers.map((member) => {
              const count = memberCounts[member.toLowerCase()] ?? 0;
              const isSelected = selectedMember.toLowerCase() === member.toLowerCase();
              return (
                <button
                  key={member}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "999px",
                    border: "1px solid " + (isSelected ? "var(--accent, #b44f2b)" : "var(--line, rgba(45,34,28,0.18))"),
                    background: isSelected ? "var(--accent, #b44f2b)" : "rgba(0,0,0,0.03)",
                    color: isSelected ? "#ffffff" : "inherit",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>👤</span>
                  <span>{member}</span>
                  <span style={{ opacity: isSelected ? 0.9 : 0.6, fontSize: "0.76rem" }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--line, rgba(45, 34, 28, 0.1))" }} />

        {/* Row 2: Category Filter */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.7, display: "flex", alignItems: "center", gap: "6px" }}>
              📁 Categories
            </span>
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent, #b44f2b)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
              }}
            >
              + Add Category
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid " + (selectedCategory === "ALL" ? "var(--accent, #b44f2b)" : "var(--line, rgba(45,34,28,0.18))"),
                background: selectedCategory === "ALL" ? "var(--accent, #b44f2b)" : "rgba(0,0,0,0.03)",
                color: selectedCategory === "ALL" ? "#ffffff" : "inherit",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              All Categories ({
                selectedMember === "ALL"
                  ? docs.length
                  : docs.filter((d) => (d.familyMember?.trim() || "Self").toLowerCase() === selectedMember.toLowerCase()).length
              })
            </button>

            {categories.map((cat) => {
              const count = categoryCounts[cat.name.toLowerCase()] ?? 0;
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: "1px solid " + (isSelected ? "var(--accent, #b44f2b)" : "var(--line, rgba(45,34,28,0.18))"),
                    background: isSelected ? "var(--accent, #b44f2b)" : "rgba(0,0,0,0.03)",
                    color: isSelected ? "#ffffff" : "inherit",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{cat.name}</span>
                  <span style={{ opacity: isSelected ? 0.9 : 0.6, fontSize: "0.76rem" }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Search, File Type Filter, and View Toggle */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
          {/* File Types */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6, marginRight: "4px" }}>
              Type:
            </span>
            {availableDocTypes.map((type) => {
              const count = type === "ALL"
                ? (selectedMember === "ALL"
                    ? docs.length
                    : docs.filter((d) => (d.familyMember?.trim() || "Self").toLowerCase() === selectedMember.toLowerCase()).length)
                : docs.filter(
                    (d) =>
                      d.documentType === type &&
                      (selectedMember === "ALL" || (d.familyMember?.trim() || "Self").toLowerCase() === selectedMember.toLowerCase())
                  ).length;
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "999px",
                    border: "1px solid " + (isSelected ? "var(--accent, #b44f2b)" : "var(--line, rgba(45,34,28,0.18))"),
                    background: isSelected ? "var(--accent, #b44f2b)" : "transparent",
                    color: isSelected ? "#ffffff" : "inherit",
                    cursor: "pointer",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    transition: "all 0.12s ease",
                  }}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>

          {/* Search box & View toggles */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: "1 1 auto", justifyContent: "flex-end" }}>
            <div style={{ position: "relative", minWidth: "220px", maxWidth: "340px", flex: 1 }}>
              <input
                type="text"
                placeholder="🔍 Search documents…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  padding: "6px 28px 6px 12px",
                  fontSize: "0.82rem",
                  borderRadius: "999px",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: 0.5,
                    fontSize: "0.85rem",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", border: "1px solid var(--line, rgba(45,34,28,0.18))", borderRadius: "8px", overflow: "hidden" }}>
              {(["table", "grid"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  title={mode === "table" ? "List view" : "Card view"}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    cursor: "pointer",
                    background: viewMode === mode ? "var(--accent, #b44f2b)" : "transparent",
                    color: viewMode === mode ? "#ffffff" : "inherit",
                    fontSize: "0.95rem",
                    transition: "background 0.15s",
                  }}
                >
                  {mode === "table" ? "☰" : "⊞"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        {isFiltered && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "rgba(180, 79, 43, 0.08)",
              border: "1px dashed var(--accent, #b44f2b)",
              borderRadius: "8px",
              fontSize: "0.78rem",
            }}
          >
            <span>
              Showing <strong>{filteredDocs.length}</strong> matching document{filteredDocs.length === 1 ? "" : "s"}
              {selectedMember !== "ALL" && <> • Member: <strong>{selectedMember}</strong></>}
              {selectedCategory !== "ALL" && <> • Category: <strong>{selectedCategory}</strong></>}
              {selectedType !== "ALL" && <> • Type: <strong>{selectedType}</strong></>}
              {searchQuery.trim() && <> • Query: <em>"{searchQuery.trim()}"</em></>}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedMember("ALL");
                setSelectedCategory("ALL");
                setSelectedType("ALL");
                setSearchQuery("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent, #b44f2b)",
                fontWeight: 700,
                cursor: "pointer",
                padding: "2px 6px",
                textDecoration: "underline",
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Content Area ── */}
      {loading ? (
        <article className="card full-card"><p className="muted-copy">Loading documents…</p></article>
      ) : filteredDocs.length === 0 ? (
        <article className="card full-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📂</div>
          <h3 style={{ margin: "0 0 8px" }}>No documents match the active filters</h3>
          <p className="muted-copy" style={{ margin: "0 0 16px", fontSize: "0.9rem" }}>
            {isFiltered
              ? "Try resetting your category or family member filter, or upload a new document."
              : "Click 'Upload Document' to add your first file."}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            {isFiltered && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSelectedMember("ALL");
                  setSelectedCategory("ALL");
                  setSelectedType("ALL");
                  setSearchQuery("");
                }}
              >
                Reset All Filters
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowUpload(true)}
            >
              ＋ Upload Document
            </button>
          </div>
        </article>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ── */
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line, rgba(45, 34, 28, 0.16))", textAlign: "left" }}>
                {["#", "Type", "Name", "Category", "Family Member", "Description", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontWeight: 700, opacity: 0.65, whiteSpace: "nowrap", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc, idx) => {
                const fileName = doc.file.split("/").pop() ?? doc.name;
                const mediaUrl = getMediaUrl(doc.file);
                const icon = getFileIcon(doc.documentType, fileName);
                const member = doc.familyMember?.trim() || "Self";
                const category = doc.categoryName?.trim() || "Uncategorized";

                return (
                  <tr
                    key={doc.id}
                    style={{ borderBottom: "1px solid var(--line, rgba(45, 34, 28, 0.08))", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180, 79, 43, 0.05)")}
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
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "999px",
                          background: "rgba(180, 79, 43, 0.1)",
                          color: "var(--accent, #b44f2b)",
                          border: "1px solid rgba(180, 79, 43, 0.25)",
                        }}
                      >
                        🏷️ {category}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "999px",
                          background: "rgba(0, 0, 0, 0.05)",
                          border: "1px solid var(--line, rgba(45, 34, 28, 0.16))",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        👤 {member}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", maxWidth: "200px" }}>
                      <span style={{ opacity: 0.65, fontSize: "0.82rem" }}>{doc.description ?? "—"}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px",
                        borderRadius: "999px", border: "1px solid var(--line, rgba(45, 34, 28, 0.2))",
                        opacity: 0.75, whiteSpace: "nowrap",
                      }}>{doc.oldOrNew}</span>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", opacity: 0.55, fontSize: "0.8rem" }}>
                      {formatDate(doc.createdAt)}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                          className="primary-button"
                          style={{ padding: "4px 12px", fontSize: "0.76rem", textDecoration: "none" }}>
                          Open
                        </a>
                        <a href={mediaUrl} download={fileName}
                          className="secondary-button"
                          title="Download"
                          style={{ padding: "4px 10px", fontSize: "0.76rem", textDecoration: "none" }}>
                          ↓
                        </a>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setEditingDoc(doc)}
                          title="Edit Document"
                          style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                        >
                          ✎
                        </button>
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
          {filteredDocs.map((doc) => {
            const fileName = doc.file.split("/").pop() ?? doc.name;
            const mediaUrl = getMediaUrl(doc.file);
            const icon = getFileIcon(doc.documentType, fileName);
            const isImage = doc.documentType === "IMAGE" || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
            const member = doc.familyMember?.trim() || "Self";
            const category = doc.categoryName?.trim() || "Uncategorized";

            return (
              <article key={doc.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "2rem" }}>{icon}</span>
                  <span style={{
                    fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
                    background: "var(--accent, #b44f2b)", color: "#fff", textTransform: "uppercase"
                  }}>
                    {doc.documentType}
                  </span>
                </div>

                {isImage && (
                  <div style={{ width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", background: "rgba(0,0,0,0.05)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl} alt={doc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}

                <div style={{ padding: 0 }}>
                  <h2 style={{ fontSize: "1rem", margin: 0, fontWeight: 700 }}>{doc.name}</h2>
                  {doc.description && <p className="muted-copy" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>{doc.description}</p>}
                </div>

                {/* Category & Member Chips */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "rgba(180, 79, 43, 0.1)",
                      color: "var(--accent, #b44f2b)",
                      border: "1px solid rgba(180, 79, 43, 0.25)",
                    }}
                  >
                    🏷️ {category}
                  </span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "rgba(0,0,0,0.05)",
                      border: "1px solid var(--line, rgba(45,34,28,0.16))",
                    }}
                  >
                    👤 {member}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <span className="muted-copy" style={{ fontSize: "0.75rem" }}>{formatDate(doc.createdAt)}</span>
                  <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "999px", border: "1px solid var(--line, rgba(45,34,28,0.16))", opacity: 0.75 }}>
                    {doc.oldOrNew}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="primary-button"
                    style={{ flex: 1, textAlign: "center", padding: "6px", fontSize: "0.8rem", textDecoration: "none" }}>Open</a>
                  <a href={mediaUrl} download={fileName} className="secondary-button"
                    style={{ padding: "6px 12px", fontSize: "0.8rem", textDecoration: "none" }}>↓</a>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setEditingDoc(doc)}
                    title="Edit Document"
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    ✎
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const MAX_MB = 10;

export default function UploadForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validation: check before sending anything
    if (!file && !text.trim()) {
      setError("Choose a contract file or paste the contract text.");
      return;
    }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is larger than ${MAX_MB} MB.`);
      return;
    }

    const form = new FormData();
    if (title.trim()) form.append("title", title.trim());
    if (file) form.append("file", file);
    else form.append("text", text);

    setBusy(true);
    try {
      const result = await api("/api/contracts", { method: "POST", body: form });
      navigate(`/contracts/${result.contractId}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Add a contract</h3>

      <label htmlFor="title">Title (optional)</label>
      <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />

      <label htmlFor="file">Contract file (PDF, DOCX or TXT)</label>
      <input id="file" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files[0] || null)} disabled={busy} />

      <label htmlFor="text">Or paste the contract text</label>
      <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} disabled={busy || Boolean(file)} />
      {file && <p className="muted">A file is chosen, so the pasted text will be ignored.</p>}

      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={busy}>{busy ? "Analyzing..." : "Analyze contract"}</button>
      </div>

      {busy && (
        <div className="info">Reading the contract and extracting items. This can take up to a minute. Please keep this page open.</div>
      )}
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
    </form>
  );
}
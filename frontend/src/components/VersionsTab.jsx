import { useState } from "react";
import { api } from "../api.js";
import { TYPE_LABELS } from "./ItemCard.jsx";

const MAX_MB = 10;

export default function VersionsTab({ contractId, versions, items, onChanged, onGoReview }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(null); // version number whose items are shown

  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file && !text.trim()) {
      setError("Choose the new version of the contract or paste its text.");
      return;
    }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is larger than ${MAX_MB} MB.`);
      return;
    }

    const form = new FormData();
    if (file) form.append("file", file);
    else form.append("text", text);

    setBusy(true);
    try {
      const res = await api(`/api/contracts/${contractId}/versions`, { method: "POST", body: form });
      setResult(res);
      setFile(null);
      setText("");
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3>Versions</h3>
      {sorted.length === 0 && <p className="muted">No versions found.</p>}
      {sorted.map((v) => {
        const mine = items.filter((i) => i.versionNumber === v.versionNumber);
        const approved = mine.filter((i) => i.reviewStatus === "approved").length;
        const stale = mine.filter((i) => i.stale).length;
        const isLatest = v.versionNumber === sorted[0].versionNumber;
        return (
          <div className="card" key={v._id || v.versionNumber}>
            <div className="version-row">
              <div>
                <b>Version {v.versionNumber}</b>
                {isLatest && <span className="badge approved" style={{ marginLeft: 8 }}>latest</span>}
                <div className="muted">
                  {v.fileName}
                  {v.createdAt ? ` · ${new Date(v.createdAt).toLocaleString()}` : ""}
                </div>
                <div className="muted">
                  {mine.length} items · {approved} approved{stale > 0 ? ` · ${stale} potentially stale` : ""}
                </div>
              </div>
              <button className="secondary" onClick={() => setOpen(open === v.versionNumber ? null : v.versionNumber)}>
                {open === v.versionNumber ? "Hide items" : "Show items"}
              </button>
            </div>
            {open === v.versionNumber && (
              <div style={{ marginTop: 8 }}>
                {mine.map((i) => (
                  <div className="mini" key={i._id}>
                    <span className="badge">{TYPE_LABELS[i.type] || i.type}</span>
                    <span className={`badge ${i.reviewStatus}`}>{i.reviewStatus}</span>
                    {i.stale && <span className="badge stale">potentially stale</span>}
                    <b>{i.title}</b>: {i.value}
                    {i.sources && i.sources[0] && <span className="muted"> [{i.sources[0].section}]</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <form className="card" onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Upload a new version</h3>
        <p className="muted">
          The new version is analyzed on its own. Items you approved on older versions are marked potentially stale until you approve them again.
        </p>

        <label htmlFor="vfile">New version file (PDF, DOCX or TXT)</label>
        <input id="vfile" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files[0] || null)} disabled={busy} />

        <label htmlFor="vtext">Or paste the new version text</label>
        <textarea id="vtext" value={text} onChange={(e) => setText(e.target.value)} disabled={busy || Boolean(file)} />
        {file && <p className="muted">A file is chosen, so the pasted text will be ignored.</p>}

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy}>{busy ? "Analyzing..." : "Upload new version"}</button>
        </div>

        {busy && <div className="info">Reading the new version and extracting items. This can take up to a minute. Please keep this page open.</div>}
        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
        {result && (
          <div className="success">
            Version {result.versionNumber} was added with {result.itemCount} items.{" "}
            {result.staleCount > 0
              ? `${result.staleCount} item(s) you approved earlier are now marked potentially stale.`
              : "No earlier approved items needed to be marked stale."}
            <div style={{ marginTop: 8 }}>
              <button onClick={onGoReview} type="button">Review the new items</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
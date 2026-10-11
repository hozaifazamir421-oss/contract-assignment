import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function SummaryTab({ contractId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api(`/api/contracts/${contractId}/summary`)
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [contractId]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(summary.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copying was blocked by the browser. Use Download instead.");
    }
  }

  function downloadText() {
    const blob = new Blob([summary.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.contract?.title || "contract"}-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="muted">Building summary...</p>;
  if (error && !summary) return <div className="error">Could not build the summary: {error}</div>;
  if (!summary) return null;

  const counts = summary.counts || {};

  return (
    <div>
      <h3>Reviewed summary</h3>
      <p className="muted">
        Version {summary.versionNumber}, generated on {summary.generatedOn}. Based on {counts.approved} approved item(s).{" "}
        {counts.pending} not yet reviewed, {counts.rejected} rejected.
      </p>

      {counts.staleFromEarlierVersions > 0 && (
        <div className="info" style={{ marginBottom: 12 }}>
          {counts.staleFromEarlierVersions} item(s) approved on earlier versions are potentially stale and are not included. Approve the matching items on the latest version to include them.
        </div>
      )}

      {summary.sections.length === 0 && (
        <p className="muted">No items have been approved yet. Approve items in the Review tab and the summary will fill in.</p>
      )}

      {summary.sections.map((section) => (
        <div className="card" key={section.heading}>
          <h4 style={{ marginTop: 0 }}>{section.heading}</h4>
          {section.lines.map((line) => (
            <div className="summary-line" key={line.itemId}>
              <div><b>{line.title}</b>: {line.text}</div>
              {line.responsibleParty && <div className="muted">Responsible: {line.responsibleParty}</div>}
              {line.deadline && <div className="muted">Date: {line.deadline.date} ({line.deadline.how})</div>}
              {line.question && <div><b>Question to clarify:</b> {line.question}</div>}
              <div className="muted">
                {line.source && `Source: ${line.source}`}
                {line.edited && " · edited by reviewer"}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="actions">
        <button onClick={copyText} disabled={summary.sections.length === 0}>{copied ? "Copied!" : "Copy as text"}</button>
        <button className="secondary" onClick={downloadText} disabled={summary.sections.length === 0}>Download .txt</button>
      </div>
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

      <p className="muted" style={{ marginTop: 16 }}>{summary.disclaimer}</p>
    </div>
  );
}
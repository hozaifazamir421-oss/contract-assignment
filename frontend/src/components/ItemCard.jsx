import { useState } from "react";
import { api } from "../api.js";

export const TYPE_LABELS = {
  party: "Party",
  effective_date: "Effective date",
  expiry: "Expiry",
  renewal: "Renewal",
  termination: "Termination",
  notice: "Notice",
  obligation: "Obligation",
  unclear_term: "Unclear term",
  conflict: "Conflict",
};

export default function ItemCard({ item, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Sends one change to the backend, then reloads the contract
  async function send(body) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/contracts/items/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setForm({
      title: item.title || "",
      value: item.value || "",
      responsibleParty: item.responsibleParty || "",
      date: item.date || "",
      days: item.days == null ? "" : String(item.days),
      relativeTo: item.relativeTo || "",
      direction: item.direction || "",
    });
    setError("");
    setEditing(true);
  }

  async function saveEdit() {
    if (!form.title.trim() || !form.value.trim()) {
      setError("Title and value cannot be empty.");
      return;
    }
    if (form.date && !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError("Date must look like 2027-02-28.");
      return;
    }
    if (form.days && !/^\d+$/.test(form.days)) {
      setError("Days must be a whole number.");
      return;
    }

    // Send only the fields that really changed
    const changes = {};
    for (const key of Object.keys(form)) {
      const before = key === "days" ? (item.days == null ? "" : String(item.days)) : item[key] || "";
      if (form[key] !== before) {
        changes[key] = key === "days" ? (form.days === "" ? null : Number(form.days)) : form[key];
      }
    }
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    if (await send(changes)) setEditing(false);
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="card">
      <div>
        <span className="badge">{TYPE_LABELS[item.type] || item.type}</span>
        <span className={`badge ${item.status}`}>{item.status}</span>
        <span className={`badge ${item.reviewStatus}`}>{item.reviewStatus}</span>
        {item.edited && <span className="badge">edited</span>}
        {item.stale && <span className="badge stale">potentially stale</span>}
      </div>

      {!editing && (
        <>
          <h4 style={{ margin: "8px 0 4px" }}>{item.title}</h4>
          <div>{item.value}</div>
          {item.responsibleParty && <div className="muted">Responsible: {item.responsibleParty}</div>}
          {item.date && <div className="muted">Date: {item.date}</div>}
          {item.days != null && (
            <div className="muted">
              {item.days} days {item.direction || ""} {item.relativeTo || ""}
            </div>
          )}
          {item.question && <div style={{ marginTop: 6 }}><b>Question to clarify:</b> {item.question}</div>}

          {(item.sources || []).map((s, i) => (
            <div className="quote" key={i}>
              <b>{s.section}</b>
              <div>"{s.quote}"</div>
            </div>
          ))}
          {item.citationWarning && <div className="warn">Citation warning: {item.citationWarning}</div>}

          <div className="actions">
            <button className="approve" disabled={busy || item.reviewStatus === "approved"} onClick={() => send({ reviewStatus: "approved" })}>Approve</button>
            <button className="reject" disabled={busy || item.reviewStatus === "rejected"} onClick={() => send({ reviewStatus: "rejected" })}>Reject</button>
            <button className="secondary" disabled={busy} onClick={startEdit}>Edit</button>
            {item.reviewStatus !== "pending" && (
              <button className="secondary" disabled={busy} onClick={() => send({ reviewStatus: "pending" })}>Back to pending</button>
            )}
          </div>
        </>
      )}

      {editing && (
        <div>
          <label>Title</label>
          <input type="text" value={form.title} onChange={set("title")} />
          <label>Value (what the contract says)</label>
          <textarea value={form.value} onChange={set("value")} />
          <label>Responsible party</label>
          <input type="text" value={form.responsibleParty} onChange={set("responsibleParty")} />
          <div className="field-row">
            <div>
              <label>Exact date (YYYY-MM-DD)</label>
              <input type="text" value={form.date} onChange={set("date")} />
            </div>
            <div>
              <label>Number of days</label>
              <input type="text" value={form.days} onChange={set("days")} />
            </div>
            <div>
              <label>Counted from</label>
              <select value={form.relativeTo} onChange={set("relativeTo")}>
                <option value="">(none)</option>
                <option value="expiry">expiry date</option>
                <option value="effective_date">effective date</option>
                <option value="other">other</option>
              </select>
            </div>
            <div>
              <label>Before or after</label>
              <select value={form.direction} onChange={set("direction")}>
                <option value="">(default)</option>
                <option value="before">before</option>
                <option value="after">after</option>
              </select>
            </div>
          </div>
          <div className="actions">
            <button disabled={busy} onClick={saveEdit}>{busy ? "Saving..." : "Save changes"}</button>
            <button className="secondary" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { TYPE_LABELS } from "./ItemCard.jsx";

function dueLabel(entry) {
  if (entry.overdue || entry.daysLeft < 0) return { text: `Overdue by ${Math.abs(entry.daysLeft)} days`, cls: "overdue" };
  if (entry.daysLeft === 0) return { text: "Due today", cls: "overdue" };
  if (entry.daysLeft <= 30) return { text: `In ${entry.daysLeft} days`, cls: "soon" };
  return { text: `In ${entry.daysLeft} days`, cls: "" };
}

function Sources({ sources }) {
  return (sources || []).map((s, i) => (
    <div className="quote" key={i}>
      <b>{s.section}</b>
      <div>"{s.quote}"</div>
    </div>
  ));
}

function Badges({ entry }) {
  return (
    <>
      <span className="badge">{TYPE_LABELS[entry.type] || entry.type}</span>
      <span className="badge">version {entry.versionNumber}</span>
      {entry.edited && <span className="badge">edited</span>}
      {entry.stale && <span className="badge stale">potentially stale</span>}
    </>
  );
}

export default function DashboardTab({ contractId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/contracts/${contractId}/dashboard`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [contractId]);

  if (loading) return <p className="muted">Loading dashboard...</p>;
  if (error) return <div className="error">Could not load the dashboard: {error}</div>;
  if (!data) return null;

  const upcoming = data.upcoming || [];
  const noDate = data.noDate || [];

  return (
    <div>
      <p className="muted">
        Dates are worked out by the app from approved items, as of {data.today}. Version {data.latestVersion} is the latest.
      </p>

      {data.pendingCount > 0 && (
        <div className="info" style={{ marginBottom: 12 }}>
          {data.pendingCount} item(s) in the latest version are still waiting for review and are not shown here. Approve them in the Review tab.
        </div>
      )}

      <h3>Upcoming dates</h3>
      {upcoming.length === 0 && (
        <p className="muted">No approved items with a date yet. Approve items in the Review tab and they will appear here.</p>
      )}
      {upcoming.map((u) => {
        const due = dueLabel(u);
        return (
          <div className="card" key={u.itemId}>
            <div className="date-line">
              <div><b style={{ fontSize: 18 }}>{u.deadline}</b></div>
              <div className={`due ${due.cls}`}>{due.text}</div>
            </div>
            <div style={{ margin: "6px 0" }}><Badges entry={u} /></div>
            <h4 style={{ margin: "6px 0 4px" }}>{u.title}</h4>
            <div>{u.value}</div>
            {u.responsibleParty && <div className="muted">Responsible: {u.responsibleParty}</div>}
            <div className="muted">How this date was worked out: {u.how}</div>
            {u.stale && (
              <div className="warn">
                This item was approved on an earlier version of the contract and may be out of date. Re-approve it in the Review tab if it is still correct.
              </div>
            )}
            <Sources sources={u.sources} />
          </div>
        );
      })}

      <h3>Approved items without a calendar date</h3>
      {noDate.length === 0 && <p className="muted">None.</p>}
      {noDate.map((u) => (
        <div className="card" key={u.itemId}>
          <div><Badges entry={u} /></div>
          <h4 style={{ margin: "6px 0 4px" }}>{u.title}</h4>
          <div>{u.value}</div>
          {u.responsibleParty && <div className="muted">Responsible: {u.responsibleParty}</div>}
          <div className="muted">{u.reason}</div>
          <Sources sources={u.sources} />
        </div>
      ))}
    </div>
  );
}
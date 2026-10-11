import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import ItemCard, { TYPE_LABELS } from "../components/ItemCard.jsx";
import DashboardTab from "../components/DashboardTab.jsx";
import VersionsTab from "../components/VersionsTab.jsx";
import SummaryTab from "../components/SummaryTab.jsx";


export default function ContractPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("review");

  async function reload() {
    try {
      setData(await api(`/api/contracts/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Loading contract...</p>;
  if (error) return <div className="error">Could not load this contract: {error}</div>;
  if (!data) return null;

  const items = data.items || [];
  const latest = Math.max(1, ...items.map((i) => i.versionNumber || 1));
  const current = items.filter((i) => (i.versionNumber || 1) === latest);
  const count = (s) => current.filter((i) => i.reviewStatus === s).length;

  const tabButton = (key, label) => (
    <button className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
      {label}
    </button>
  );

  return (
    <div>
      <p><Link to="/">&larr; All contracts</Link></p>
      <h2>{data.contract?.title}</h2>
      <p className="muted">
        Version {latest} &middot; {current.length} items &middot; {count("pending")} to review &middot;{" "}
        {count("approved")} approved &middot; {count("rejected")} rejected
      </p>

      <div className="tabs">
        {tabButton("review", "Review")}
        {tabButton("dashboard", "Dashboard")}
        {tabButton("versions", "Versions")}
        {tabButton("summary", "Summary")}
      </div>

      {tab === "dashboard" && <DashboardTab contractId={id} />}
            {tab === "summary" && <SummaryTab contractId={id} />}
      {tab === "versions" && (
        <VersionsTab
          contractId={id}
          versions={data.versions || []}
          items={items}
          onChanged={reload}
          onGoReview={() => setTab("review")}
        />
      )}

      {tab === "review" && (
        <>
          {current.length === 0 && <p className="muted">No items were extracted for this version.</p>}
          {Object.keys(TYPE_LABELS).map((type) => {
            const group = current.filter((i) => i.type === type);
            if (group.length === 0) return null;
            return (
              <section key={type}>
                <h3>{TYPE_LABELS[type]}</h3>
                {group.map((item) => <ItemCard key={item._id} item={item} onChanged={reload} />)}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
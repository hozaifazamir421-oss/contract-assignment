import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import UploadForm from "../components/UploadForm.jsx";

export default function Home() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/contracts")
      .then((data) => setContracts(Array.isArray(data) ? data : data.contracts || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <UploadForm />
      <h2>Your contracts</h2>
      {loading && <p className="muted">Loading contracts...</p>}
      {error && <div className="error">Could not load contracts: {error}</div>}
      {!loading && !error && contracts.length === 0 && (
        <p className="muted">No contracts yet. Add one above.</p>
      )}
      {contracts.map((c) => (
        <div className="card" key={c._id}>
          <Link to={`/contracts/${c._id}`}>{c.title}</Link>
        </div>
      ))}
    </div>
  );
}
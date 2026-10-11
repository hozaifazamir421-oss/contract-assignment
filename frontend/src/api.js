export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Every screen calls the backend through this function.
// It adds the base address and turns error replies into normal JavaScript errors.
export async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
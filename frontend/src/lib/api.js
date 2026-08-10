import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Map a stored episode video_url to a browser-playable URL.
// - Absolute http(s) URLs are used as-is.
// - Relative library paths ("/media/videos/..." or "media/videos/...") are
//   routed to the backend streaming endpoint that supports Range/seek.
export function resolveVideoUrl(p) {
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  const clean = String(p).replace(/^\/+/, ""); // drop leading slashes
  if (clean.startsWith("media/videos/")) {
    return `${API}/${clean}`; // -> {BACKEND}/api/media/videos/...
  }
  if (clean.startsWith("api/")) {
    return `${BACKEND_URL}/${clean}`;
  }
  // Fallback: assume it lives in the external library
  return `${API}/media/videos/${clean}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cx_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "A apărut o eroare. Încearcă din nou.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

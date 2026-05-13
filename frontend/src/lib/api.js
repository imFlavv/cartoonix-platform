import axios from "axios";

// All API calls go through nginx proxy
export const API_BASE = "/api";

// Axios instance
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cartoonix_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Global auth handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem("cartoonix_token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

/**
 * Converts backend media paths to usable URLs
 * Works with FastAPI StaticFiles mounted on /api/uploads
 */
export function mediaUrl(path) {
  if (!path) return "";

  // already absolute
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // ensure correct /api prefix
  if (path.startsWith("/api")) {
    return path;
  }

  return `/api${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Normalized error handler for FastAPI responses
 */
export function getErrorMessage(err, fallback = "Something went wrong") {
  const detail = err?.response?.data?.detail;

  if (!detail) return err?.message || fallback;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "string" ? d : d?.msg || JSON.stringify(d)))
      .join(", ");
  }

  if (typeof detail === "object") {
    return detail.msg || JSON.stringify(detail);
  }

  return fallback;
}

export default api;

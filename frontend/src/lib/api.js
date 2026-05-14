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
    const url = error?.config?.url || "";

    // Only auto-redirect on 401 for AUTHENTICATED requests (i.e. we had a token
    // attached). Login/register/verify failures must reach the page handler so
    // it can display an error toast — we MUST NOT force a page reload for those.
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify") ||
      url.includes("/auth/resend") ||
      url.includes("/early-access/");

    if (status === 401 && !isAuthEndpoint) {
      const hadToken = !!localStorage.getItem("cartoonix_token");
      localStorage.removeItem("cartoonix_token");
      // Only force a hard reload to /login if we previously had a token
      // (i.e. session expired). Guests landing on a 401 don't need a redirect.
      if (hadToken && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
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

import { api } from "@/lib/api";

/**
 * Thin REST wrapper around the /api/watch-parties endpoints. The WebSocket
 * side lives in useWatchPartySocket.js.
 */
export const watchPartyApi = {
  create: (payload = {}) => api.post("/watch-parties", payload).then((r) => r.data),
  active: () => api.get("/watch-parties/active/me").then((r) => r.data),
  invitations: () => api.get("/watch-parties/invitations/me").then((r) => r.data),
  get: (code) => api.get(`/watch-parties/${code}`).then((r) => r.data),
  end: (code) => api.delete(`/watch-parties/${code}`).then((r) => r.data),
  invite: (code, payload) =>
    api.post(`/watch-parties/${code}/invite`, payload).then((r) => r.data),
  acceptInvitation: (code, invitationId) =>
    api
      .post(`/watch-parties/${code}/invitations/${invitationId}/accept`)
      .then((r) => r.data),
  declineInvitation: (code, invitationId) =>
    api
      .post(`/watch-parties/${code}/invitations/${invitationId}/decline`)
      .then((r) => r.data),
  revokeInvitation: (code, invitationId) =>
    api
      .delete(`/watch-parties/${code}/invitations/${invitationId}`)
      .then((r) => r.data),
  join: (code) => api.post(`/watch-parties/${code}/join`).then((r) => r.data),
  leave: (code) => api.post(`/watch-parties/${code}/leave`).then((r) => r.data),
  queueAdd: (code, payload) =>
    api.post(`/watch-parties/${code}/queue`, payload).then((r) => r.data),
  queueRemove: (code, itemId) =>
    api.delete(`/watch-parties/${code}/queue/${itemId}`).then((r) => r.data),
  queueReorder: (code, itemIds) =>
    api
      .patch(`/watch-parties/${code}/queue`, { item_ids: itemIds })
      .then((r) => r.data),
  kick: (code, userId) =>
    api.post(`/watch-parties/${code}/kick/${userId}`).then((r) => r.data),
  transferHost: (code, userId) =>
    api.post(`/watch-parties/${code}/transfer-host/${userId}`).then((r) => r.data),
};

/**
 * Resolve an episode video path (mirrors CartoonDetailPage logic so the same
 * relative paths play identically in both surfaces).
 */
export function resolveVideoUrl(p) {
  if (!p) return "";
  const s = String(p).trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/api/")) return s;
  const idx = s.toLowerCase().indexOf("media/videos");
  if (idx >= 0) {
    const rel = s.slice(idx + "media/videos".length).replace(/^\/+/, "");
    return `/api/media/videos/${rel}`;
  }
  if (s.startsWith("/uploads")) return `/api${s}`;
  if (s.startsWith("/")) return s;
  return `/api/media/videos/${s}`;
}

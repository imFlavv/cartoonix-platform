// Lightweight playback queue stored in sessionStorage so the Watch page can
// play through a user's playlist / favorites continuously (across shows).
const KEY = "cx_queue";

export function setQueue(q) {
  try { sessionStorage.setItem(KEY, JSON.stringify(q)); } catch (_) { /* no-op */ }
}

export function getQueue() {
  try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (_) { return null; }
}

export function clearQueue() {
  try { sessionStorage.removeItem(KEY); } catch (_) { /* no-op */ }
}

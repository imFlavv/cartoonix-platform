import React, { useState, useEffect, useCallback } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { watchPartyApi } from "@/lib/watchparty";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, UserPlus, X, Send, AlertCircle, Loader2 } from "lucide-react";

/**
 * Invite modal — search by nickname, send invitation.
 * The list is intentionally short (the host can call it multiple times).
 */
export default function WatchPartyInviteModal({ party, open, onClose, onChanged }) {
  const { user } = useAuth() || {};
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState({});

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get("/admin/users", {
        params: { q, page_size: 10, page: 1 },
      });
      setResults(Array.isArray(data?.items) ? data.items : []);
    } catch {
      // Fallback for non-admin users — backend doesn't expose a public search
      // so we ask the host to type the exact nickname instead.
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query.trim()), 320);
    return () => clearTimeout(t);
  }, [query, search]);

  if (!open) return null;

  const invitedIds = new Set(
    (party?.invitations || [])
      .filter((i) => i.status !== "declined" && i.status !== "revoked")
      .map((i) => i.user_id)
  );
  invitedIds.add(party?.host_user_id);

  const sendInvite = async (target) => {
    setBusy((b) => ({ ...b, [target.user_id || target.nickname]: true }));
    try {
      await watchPartyApi.invite(party.public_code, {
        user_id: target.id || target.user_id,
        nickname: target.nickname,
      });
      toast.success(`Invitație trimisă către ${target.nickname}`);
      onChanged && onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut trimite invitația."));
    } finally {
      setBusy((b) => ({ ...b, [target.user_id || target.nickname]: false }));
    }
  };

  const inviteByExactNickname = async () => {
    const nick = query.trim();
    if (!nick) return;
    await sendInvite({ nickname: nick });
  };

  return (
    <div
      data-testid="wp-invite-modal"
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Închide"
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <div
        className="relative w-full max-w-[460px] rounded-2xl overflow-hidden border border-white/[0.10]"
        style={{
          background: "linear-gradient(180deg,#1a1226 0%,#0d0816 100%)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
          aria-label="Închide"
          data-testid="wp-invite-close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="px-6 pt-6 pb-5 border-b border-white/[0.06]">
          <div className="text-[11px] uppercase tracking-[0.32em] text-pink-200/85 font-semibold mb-1.5">
            Invită prieteni PLUS
          </div>
          <h2 className="font-display text-2xl text-white tracking-tight">
            Caută după nickname
          </h2>
          <p className="text-[12.5px] text-white/55 mt-1">
            Doar membrii PLUS pot intra. Max {party?.max_guests || 5} invitați.
          </p>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              data-testid="wp-invite-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: testercrx"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.10] text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Direct invite by exact nickname when search isn't available */}
          {user?.role !== "admin" && query.length >= 2 && (
            <button
              type="button"
              onClick={inviteByExactNickname}
              data-testid="wp-invite-by-nickname"
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-black bg-amber-300 hover:bg-amber-200"
            >
              <Send className="h-4 w-4" /> Invită „{query.trim()}"
            </button>
          )}

          {/* Admin-style results list if /admin/users works */}
          {searching && (
            <div className="mt-4 flex items-center gap-2 text-white/55 text-[12.5px]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Se caută...
            </div>
          )}
          {results.length > 0 && (
            <ul className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
              {results.map((u) => {
                const isPlusOrAdmin = u.subscription === "plus" || u.role === "admin";
                const already = invitedIds.has(u.id);
                return (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg p-2 border border-white/[0.06] bg-white/[0.02]"
                  >
                    <img
                      src={mediaUrl(u.avatar_url)}
                      alt={u.nickname}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-white truncate">
                        {u.nickname}
                      </div>
                      <div className="text-[10.5px] text-white/45">
                        {isPlusOrAdmin ? "PLUS / Admin" : "Free"}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isPlusOrAdmin || already || !!busy[u.id]}
                      onClick={() => sendInvite(u)}
                      data-testid={`wp-invite-send-${u.nickname}`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-black bg-amber-300 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {already ? "Invitat" : "Invită"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!searching && query.length >= 2 && results.length === 0 && user?.role === "admin" && (
            <p className="mt-4 inline-flex items-start gap-2 text-[12px] text-white/55">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5" /> Niciun rezultat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

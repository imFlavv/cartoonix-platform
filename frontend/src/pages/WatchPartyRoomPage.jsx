import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { watchPartyApi, resolveVideoUrl } from "@/lib/watchparty";
import useWatchPartySocket from "@/hooks/useWatchPartySocket";
import { toast } from "sonner";
import {
  Play, Pause, SkipForward, Copy, Check, Users, X, Send,
  Heart, Laugh, Smile, Frown, Trophy, LogOut, ListPlus,
  Crown, Loader2, Search, Trash2, ArrowLeft, Wifi, WifiOff,
} from "lucide-react";
import WatchPartyInviteModal from "@/components/watchparty/WatchPartyInviteModal";

const SYNC_THRESHOLD_HARD = 1.5;
const SYNC_THRESHOLD_SOFT = 0.75;
const HEARTBEAT_MS = 5000;

/**
 * /watch-party/:public_code
 * Independent page that hosts the entire Watch Party experience.
 * Renders inside PublicLayout for nav consistency.
 */
export default function WatchPartyRoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const [party, setParty] = useState(null);
  const [loadingParty, setLoadingParty] = useState(true);
  const [error, setError] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatRateLimit, setChatRateLimit] = useState(0);
  const [tab, setTab] = useState("participants"); // mobile tabs
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Refs for the player & sync coordination
  const videoRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const lastHeartbeatRef = useRef(0);

  const { status: wsStatus, lastMessage, send } = useWatchPartySocket(code);

  // ---------- Helpers ----------
  const isHost = user && party && party.host_user_id === user.id;
  const isCoHost = user && party && (party.co_host_user_ids || []).includes(user.id);
  const canControl = isHost || isCoHost;

  const currentItem = useMemo(() => {
    if (!party) return null;
    const q = party.queue || [];
    const idx = Math.min(Math.max(0, party.current_queue_index || 0), Math.max(0, q.length - 1));
    return q[idx] || null;
  }, [party]);

  const videoSrc = useMemo(() => {
    return currentItem ? resolveVideoUrl(currentItem.video_url || `${currentItem.cartoon_id}/${currentItem.episode_id}`) : "";
  }, [currentItem]);

  // We'll fetch the real video_url for the current episode (queue items don't
  // carry it for security). Cache by episode_id.
  const [episodeVideoUrl, setEpisodeVideoUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!currentItem?.episode_id) {
      setEpisodeVideoUrl("");
      return;
    }
    (async () => {
      try {
        const { data } = await api.get(`/cartoons/${currentItem.cartoon_id}`);
        if (cancelled) return;
        const ep = (data?.episodes || []).find((e) => e.id === currentItem.episode_id);
        if (ep) setEpisodeVideoUrl(resolveVideoUrl(ep.video_url));
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [currentItem?.episode_id, currentItem?.cartoon_id]);

  // ---------- Initial load ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { party: p } = await watchPartyApi.get(code);
        if (!cancelled) setParty(p);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Camera nu poate fi accesată."));
      } finally {
        if (!cancelled) setLoadingParty(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  // ---------- Apply websocket messages ----------
  useEffect(() => {
    if (!lastMessage) return;
    const { type, payload } = lastMessage;
    if (type === "party.snapshot") {
      setParty((prev) => ({ ...prev, ...payload }));
      if (Array.isArray(payload?.chat_history)) {
        setChat(payload.chat_history);
      }
    } else if (type === "party.updated") {
      setParty((prev) => prev ? { ...prev, ...payload } : payload);
    } else if (type === "player.state" || type === "episode.changed") {
      // Apply to local player.
      setParty((prev) => prev ? { ...prev, player_state: payload, current_queue_index: payload.queue_index ?? prev.current_queue_index } : prev);
      applyRemotePlayerState(payload);
    } else if (type === "player.sync") {
      applyRemotePlayerState(payload);
    } else if (type === "chat.message") {
      setChat((c) => [...c.slice(-199), payload]);
    } else if (type === "reaction.received") {
      const id = `r${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setReactions((r) => [...r, { id, ...payload }]);
      setTimeout(() => {
        setReactions((r) => r.filter((x) => x.id !== id));
      }, 2200);
    } else if (type === "participant.kicked") {
      if (payload?.user_id === user?.id) {
        toast.error("Ai fost eliminat din această cameră.");
        navigate("/lobby");
      }
    } else if (type === "party.ended") {
      toast.message("Watch Party a fost încheiat.");
      navigate("/lobby");
    } else if (type === "error") {
      if (payload?.reason === "chat_rate_limited") {
        setChatRateLimit(Date.now() + 800);
      } else if (payload?.reason === "not_authorized") {
        toast.error("Redarea este controlată de organizator.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  // ---------- Apply remote player state ----------
  const applyRemotePlayerState = useCallback((state) => {
    const v = videoRef.current;
    if (!v || !state) return;
    applyingRemoteRef.current = true;
    try {
      const targetPos = Number(state.position_seconds || 0);
      if (Number.isFinite(targetPos)) {
        const diff = Math.abs((v.currentTime || 0) - targetPos);
        if (diff > SYNC_THRESHOLD_HARD) {
          try { v.currentTime = targetPos; } catch { /* ignore */ }
        }
      }
      if (state.is_playing && v.paused) {
        v.play().catch(() => setAutoplayBlocked(true));
      } else if (!state.is_playing && !v.paused) {
        try { v.pause(); } catch { /* ignore */ }
      }
    } finally {
      // Let pending media events flush before clearing the flag
      setTimeout(() => { applyingRemoteRef.current = false; }, 60);
    }
  }, []);

  // ---------- Local player handlers (host emits commands) ----------
  const onPlay = () => {
    if (applyingRemoteRef.current) return;
    if (!canControl) {
      // Force pause; we cannot control playback.
      try { videoRef.current && videoRef.current.pause(); } catch { /* ignore */ }
      toast.message("Redarea este controlată de organizator.");
      return;
    }
    send("player.play", {
      position_seconds: videoRef.current?.currentTime || 0,
      episode_id: currentItem?.episode_id,
    });
  };
  const onPause = () => {
    if (applyingRemoteRef.current) return;
    if (!canControl) return;
    send("player.pause", {
      position_seconds: videoRef.current?.currentTime || 0,
    });
  };
  const onSeeked = () => {
    if (applyingRemoteRef.current) return;
    if (!canControl) return;
    send("player.seek", { position_seconds: videoRef.current?.currentTime || 0 });
  };
  const onEnded = () => {
    if (!canControl) return;
    if (!party?.settings?.autoplay_next) return;
    const queue = party?.queue || [];
    const next = (party?.current_queue_index || 0) + 1;
    if (next < queue.length) {
      send("episode.change", {
        episode_id: queue[next].episode_id,
        autoplay: true,
      });
    }
  };
  const onTimeUpdate = () => {
    if (!canControl) return;
    if (applyingRemoteRef.current) return;
    const now = Date.now();
    if (now - lastHeartbeatRef.current < HEARTBEAT_MS) return;
    lastHeartbeatRef.current = now;
    send("player.heartbeat", {
      position_seconds: videoRef.current?.currentTime || 0,
      is_playing: !videoRef.current?.paused,
      playback_rate: videoRef.current?.playbackRate || 1.0,
      episode_id: currentItem?.episode_id,
    });
  };

  // ---------- Actions ----------
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/watch-party/${code}`);
      setCopied(true);
      toast.success("Link copiat în clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Nu am putut copia link-ul");
    }
  };

  const leaveRoom = async () => {
    try {
      await watchPartyApi.leave(code);
    } catch { /* ignore */ }
    navigate("/lobby");
  };

  const endParty = async () => {
    try { await watchPartyApi.end(code); } catch { /* ignore */ }
    navigate("/lobby");
  };

  const sendChat = (e) => {
    e?.preventDefault();
    const txt = chatInput.trim();
    if (!txt) return;
    if (Date.now() < chatRateLimit) return;
    send("chat.message", { text: txt });
    setChatInput("");
  };

  const sendReaction = (emoji) => send("reaction.send", { emoji });

  const requestControl = () => send("control.request");

  const removeQueueItem = async (itemId) => {
    try {
      await watchPartyApi.queueRemove(code, itemId);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut șterge."));
    }
  };

  const setCurrentEpisode = (queueItem) => {
    if (!canControl) return;
    send("episode.change", { episode_id: queueItem.episode_id });
  };

  const kickParticipant = async (uid) => {
    if (!isHost || uid === user?.id) return;
    try {
      await watchPartyApi.kick(code, uid);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut elimina utilizatorul."));
    }
  };

  // ---------- Render ----------
  if (loadingParty) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] grid place-items-center text-white/70 gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Se încarcă camera...</span>
        </div>
      </PublicLayout>
    );
  }

  if (error || !party) {
    return (
      <PublicLayout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl text-white mb-3">Camera nu este disponibilă</h1>
          <p className="text-white/70 text-[14px]">{error || "Camera nu poate fi accesată."}</p>
          <Link to="/lobby" className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white text-sm">
            <ArrowLeft className="h-4 w-4" /> Înapoi la Lobby
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const participants = party.participants || [];
  const acceptedInvites = (party.invitations || []).filter((i) => i.status === "accepted");
  const pendingInvites = (party.invitations || []).filter((i) => i.status === "pending");
  const participantCount = participants.length;

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-5 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.32em] text-pink-200/85 font-semibold mb-1.5 inline-flex items-center gap-2">
              <Crown className="h-3 w-3" /> Watch Party · {wsStatus === "open" ? (
                <span className="inline-flex items-center gap-1 text-emerald-300"><Wifi className="h-3 w-3" /> conectat</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-white/55"><WifiOff className="h-3 w-3" /> {wsStatus}</span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-white tracking-tight truncate" data-testid="wp-title">
              {party.title || "Watch Party"}
            </h1>
            <div className="mt-1.5 inline-flex items-center gap-2 text-[12px] text-white/55">
              <Users className="h-3.5 w-3.5" /> {participantCount}/{party.max_participants || 6}
              <span className="opacity-30">·</span>
              <span>Cod: <span className="text-white/80 font-mono">{code}</span></span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLink}
              data-testid="wp-copy-link"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] text-white/85"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiat" : "Copiază link"}
            </button>
            {isHost && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                data-testid="wp-open-invite"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-black bg-amber-300 hover:bg-amber-200"
              >
                <ListPlus className="h-3.5 w-3.5" /> Invită
              </button>
            )}
            {isHost ? (
              <button
                type="button"
                onClick={endParty}
                data-testid="wp-end"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white bg-red-500/85 hover:bg-red-500"
              >
                <X className="h-3.5 w-3.5" /> Încheie
              </button>
            ) : (
              <button
                type="button"
                onClick={leaveRoom}
                data-testid="wp-leave"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white/85 border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08]"
              >
                <LogOut className="h-3.5 w-3.5" /> Părăsește
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* PLAYER + REACTIONS */}
          <div className="lg:col-span-8 space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/[0.08]" style={{ aspectRatio: "16/9" }}>
              {episodeVideoUrl ? (
                <video
                  ref={videoRef}
                  src={episodeVideoUrl}
                  controls={canControl}
                  playsInline
                  onPlay={onPlay}
                  onPause={onPause}
                  onSeeked={onSeeked}
                  onEnded={onEnded}
                  onTimeUpdate={onTimeUpdate}
                  data-testid="wp-video"
                  className="w-full h-full"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-center px-6">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.32em] text-white/45 mb-2">
                      Niciun episod în coadă
                    </div>
                    <p className="text-white/70 text-[14px]">
                      {canControl
                        ? "Adaugă un episod din panoul Playlist."
                        : "Aștepți ca organizatorul să aleagă un episod."}
                    </p>
                  </div>
                </div>
              )}

              {/* floating reactions */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {reactions.map((r) => (
                  <div
                    key={r.id}
                    className="absolute bottom-3 animate-[reactionRise_2.2s_ease-out_forwards]"
                    style={{ left: `${10 + Math.random() * 70}%` }}
                  >
                    <div className="text-3xl drop-shadow-lg">
                      {reactionEmoji(r.emoji)}
                    </div>
                  </div>
                ))}
              </div>

              {autoplayBlocked && (
                <button
                  type="button"
                  onClick={() => {
                    setAutoplayBlocked(false);
                    videoRef.current?.play().catch(() => {});
                  }}
                  className="absolute inset-0 grid place-items-center bg-black/55 text-white text-sm font-semibold"
                  data-testid="wp-resume-blocked"
                >
                  <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-amber-300 text-black">
                    <Play className="h-4 w-4" /> Pornește redarea sincronizată
                  </span>
                </button>
              )}
            </div>

            {/* current episode + reactions bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45 mb-0.5">
                  Acum se vizionează
                </div>
                <div className="text-white text-[14.5px] font-semibold truncate" data-testid="wp-now-playing">
                  {currentItem ? `${currentItem.cartoon_title} — ${currentItem.title}` : "—"}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { e: "heart", I: Heart },
                  { e: "laugh", I: Laugh },
                  { e: "wow", I: Smile },
                  { e: "sad", I: Frown },
                  { e: "clap", I: Trophy },
                ].map(({ e, I }) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => sendReaction(e)}
                    data-testid={`wp-react-${e}`}
                    className="grid place-items-center h-9 w-9 rounded-full border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.10] text-white/85"
                  >
                    <I className="h-4 w-4" />
                  </button>
                ))}
                {!canControl && (
                  <button
                    type="button"
                    onClick={requestControl}
                    data-testid="wp-request-control"
                    className="ml-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200 border border-amber-200/30 hover:bg-amber-200/10"
                  >
                    Solicită controlul
                  </button>
                )}
              </div>
            </div>

            {/* Mobile tabs */}
            <div className="lg:hidden flex items-center gap-1 mt-2">
              {["participants", "queue", "chat"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] ${
                    tab === t ? "bg-white/[0.10] text-white" : "text-white/55 hover:bg-white/[0.04]"
                  }`}
                  data-testid={`wp-tab-${t}`}
                >
                  {t === "participants" && "Participanți"}
                  {t === "queue" && "Playlist"}
                  {t === "chat" && "Chat"}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <aside className="lg:col-span-4 space-y-3">
            <Panel title={`Participanți · ${participantCount}/${party.max_participants || 6}`} testid="wp-participants" hideOnMobile={tab !== "participants"}>
              <ul className="space-y-1.5">
                {participants.map((p) => {
                  const isParticipantHost = p.user_id === party.host_user_id;
                  const isParticipantCoHost = (party.co_host_user_ids || []).includes(p.user_id);
                  return (
                    <li
                      key={p.user_id}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-white/[0.03] border border-white/[0.06]"
                    >
                      <img
                        src={mediaUrl(p.avatar_url)}
                        alt={p.nickname}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-white truncate">
                          {p.nickname}
                          {isParticipantHost && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9.5px] uppercase tracking-[0.18em] text-amber-300 font-bold align-middle">
                              <Crown className="h-2.5 w-2.5" /> Host
                            </span>
                          )}
                          {!isParticipantHost && isParticipantCoHost && (
                            <span className="ml-1.5 text-[9.5px] uppercase tracking-[0.18em] text-pink-300 font-bold align-middle">
                              Co-host
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/45">
                          {p.connected ? "online" : "offline"}
                          {p.ready ? " · pregătit" : ""}
                        </div>
                      </div>
                      {isHost && p.user_id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => kickParticipant(p.user_id)}
                          data-testid={`wp-kick-${p.nickname}`}
                          className="grid place-items-center h-7 w-7 rounded-md text-white/55 hover:text-white hover:bg-white/[0.06]"
                          title="Elimină"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
                {pendingInvites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-white/[0.02] border border-dashed border-white/[0.10] opacity-80"
                  >
                    <img
                      src={mediaUrl(inv.avatar_url)}
                      alt={inv.nickname}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-white/70 truncate">
                        {inv.nickname}
                      </div>
                      <div className="text-[10px] text-white/40">invitat — în așteptare</div>
                    </div>
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => {
                          watchPartyApi.revokeInvitation(code, inv.id).catch(() => {});
                        }}
                        className="text-[10px] text-white/45 hover:text-white/80"
                      >
                        anulează
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title={`Playlist · ${(party.queue || []).length}`} testid="wp-queue" hideOnMobile={tab !== "queue"}>
              <QueueAdder code={code} canControl={canControl} />
              <ul className="mt-2 space-y-1.5">
                {(party.queue || []).map((q, i) => {
                  const active = i === (party.current_queue_index || 0);
                  return (
                    <li
                      key={q.id}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 border ${
                        active
                          ? "border-amber-300/40 bg-amber-300/10"
                          : "border-white/[0.06] bg-white/[0.03]"
                      }`}
                    >
                      <span className="text-[11px] tabular-nums text-white/45 w-5 text-right">
                        {i + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-white truncate">
                          {q.title}
                        </div>
                        <div className="text-[10px] text-white/45 truncate">
                          {q.cartoon_title}
                        </div>
                      </div>
                      {canControl && !active && (
                        <button
                          type="button"
                          onClick={() => setCurrentEpisode(q)}
                          data-testid={`wp-play-${q.id}`}
                          className="grid place-items-center h-6 w-6 rounded-md text-white/65 hover:text-white hover:bg-white/[0.08]"
                          title="Redă acum"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canControl && (
                        <button
                          type="button"
                          onClick={() => removeQueueItem(q.id)}
                          className="grid place-items-center h-6 w-6 rounded-md text-white/45 hover:text-red-300 hover:bg-white/[0.06]"
                          title="Șterge"
                          data-testid={`wp-remove-${q.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </li>
                  );
                })}
                {(party.queue || []).length === 0 && (
                  <li className="text-[12px] text-white/45 text-center py-3">
                    Playlist gol.
                  </li>
                )}
              </ul>
            </Panel>

            <Panel title="Chat" testid="wp-chat" hideOnMobile={tab !== "chat"}>
              <div className="h-64 overflow-y-auto space-y-1.5 pr-1" data-testid="wp-chat-history">
                {chat.length === 0 && (
                  <div className="text-[12px] text-white/45 text-center py-3">
                    Niciun mesaj.
                  </div>
                )}
                {chat.map((m) => (
                  <div key={m.id} className="text-[12.5px] leading-snug">
                    <span className={`font-semibold ${m.role === "host" ? "text-amber-300" : "text-pink-200"}`}>
                      {m.nickname}:
                    </span>{" "}
                    <span className="text-white/85">{m.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={sendChat} className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={500}
                  placeholder="Scrie un mesaj..."
                  className="flex-1 rounded-lg bg-black/30 border border-white/[0.10] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  data-testid="wp-chat-input"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || Date.now() < chatRateLimit}
                  className="grid place-items-center h-9 w-9 rounded-lg bg-amber-300 text-black hover:bg-amber-200 disabled:opacity-50"
                  data-testid="wp-chat-send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </Panel>
          </aside>
        </div>
      </div>

      <WatchPartyInviteModal
        party={party}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onChanged={async () => {
          try {
            const { party: p } = await watchPartyApi.get(code);
            setParty(p);
          } catch { /* ignore */ }
        }}
      />

      <style>{`
        @keyframes reactionRise {
          0%   { opacity: 0; transform: translateY(0) scale(0.9); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-220px) scale(1.15); }
        }
      `}</style>
    </PublicLayout>
  );
}

function Panel({ title, testid, children, hideOnMobile = false }) {
  return (
    <div
      data-testid={testid}
      className={`rounded-2xl border border-white/[0.08] p-3.5 ${
        hideOnMobile ? "hidden lg:block" : ""
      }`}
      style={{ background: "linear-gradient(180deg, rgba(18,12,28,0.55), rgba(8,4,18,0.7))" }}
    >
      <div className="text-[10.5px] uppercase tracking-[0.32em] text-white/55 font-semibold mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function QueueAdder({ code, canControl }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const term = q.trim();
      if (term.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const { data } = await api.get(`/cartoons`, { params: { q: term, limit: 12 } });
        setResults(Array.isArray(data?.items) ? data.items : data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!canControl) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="wp-queue-toggle"
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] text-white/85"
      >
        <ListPlus className="h-3.5 w-3.5" /> {open ? "Închide căutarea" : "Adaugă episod"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-white/[0.08] p-2.5 bg-black/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="caută cartoon..."
              className="w-full pl-7 pr-2 py-1.5 rounded-md bg-black/35 border border-white/[0.10] text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              data-testid="wp-queue-search"
            />
          </div>
          {searching && (
            <div className="mt-2 text-[11px] text-white/45 inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Se caută...
            </div>
          )}
          {results.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {results.map((c) => (
                <CartoonRow key={c.id} cartoon={c} code={code} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CartoonRow({ cartoon, code }) {
  const [expanded, setExpanded] = useState(false);
  const [eps, setEps] = useState(null);

  const loadEps = async () => {
    setExpanded(true);
    if (eps) return;
    try {
      const { data } = await api.get(`/cartoons/${cartoon.id}`);
      setEps(data?.episodes || []);
    } catch {
      setEps([]);
    }
  };

  const addEp = async (ep) => {
    try {
      await watchPartyApi.queueAdd(code, {
        episode_id: ep.id,
        cartoon_id: cartoon.id,
      });
      toast.success(`Adăugat: ${ep.title}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut adăuga."));
    }
  };

  return (
    <li className="rounded-md bg-white/[0.03] p-1.5">
      <button
        type="button"
        onClick={() => (expanded ? setExpanded(false) : loadEps())}
        className="w-full flex items-center gap-2 text-left"
      >
        <img
          src={mediaUrl(cartoon.thumbnail_url)}
          alt={cartoon.title}
          className="h-9 w-12 rounded object-cover bg-black/30"
          onError={(e) => { e.target.style.opacity = "0"; }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-white truncate">{cartoon.title}</div>
          <div className="text-[10px] text-white/45">{cartoon.episode_count || 0} ep</div>
        </div>
      </button>
      {expanded && eps && (
        <ul className="mt-1.5 pl-3 border-l border-white/[0.06] space-y-1">
          {eps.map((ep) => (
            <li key={ep.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => addEp(ep)}
                data-testid={`wp-add-ep-${ep.id}`}
                className="text-[11.5px] text-white/80 hover:text-amber-300 truncate flex-1 text-left"
              >
                S{ep.season}E{ep.episode_number} — {ep.title}
              </button>
              <span className="text-[9.5px] text-white/35">
                +
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function reactionEmoji(name) {
  return {
    heart: "❤️",
    laugh: "😂",
    wow: "😮",
    sad: "😢",
    clap: "👏",
  }[name] || "✨";
}

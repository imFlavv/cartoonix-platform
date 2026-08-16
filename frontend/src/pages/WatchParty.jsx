import { useEffect, useRef, useState, useCallback } from "react";
import { NavBar } from "@/components/NavBar";
import { api, resolveVideoUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Tv, Users, UserPlus, Play, SkipForward, SkipBack, Plus, X, LogOut, Crown, Trash2, ListVideo, Search,
} from "lucide-react";

const POLL_MS = 2000;

const ShowPicker = ({ shows, onClose, onAdd }) => {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? shows.filter((s) => (s.title || "").toLowerCase().includes(query))
    : shows;
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="font-display text-2xl flex items-center gap-2"><ListVideo className="h-6 w-6 text-[#06b6d4]" /> Alege un desen</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            data-testid="wp-picker-search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută un desen..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4]"
          />
        </div>
        <div className="space-y-4 overflow-y-auto min-h-0">
          {filtered.map((s) => (
            <div key={s.id}>
              <p className="font-semibold mb-2">{s.title}</p>
              <div className="flex flex-wrap gap-2">
                {(s.episodes || []).map((ep) => (
                  <button key={ep.number} onClick={() => onAdd(s, ep)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#06b6d4]/30 text-xs border border-white/10">
                    {ep.season ? `${ep.season} · ` : ""}Ep {ep.number}
                  </button>
                ))}
                {(!s.episodes || s.episodes.length === 0) && <span className="text-xs text-white/30">fără episoade</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-white/40 text-sm text-center py-6">Niciun desen găsit.</p>}
        </div>
      </div>
    </div>
  );
};

const PlaylistList = ({ items, editable, room, isOwner, control, removePlaylist }) => (
  <div className="space-y-2">
    {items.map((p, i) => (
      <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${room && i === room.current_index ? "bg-[#06b6d4]/15 border-[#06b6d4]/40" : "bg-white/5 border-white/10"}`}>
        {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-9 w-14 object-cover rounded" /> : <div className="h-9 w-14 rounded bg-white/10" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{p.show_title}</p>
          <p className="text-xs text-white/40 truncate">Ep {p.episode_number} · {p.episode_title}</p>
        </div>
        {room && isOwner && i !== room.current_index && (
          <button onClick={() => control({ action: "select", index: i })} className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 font-bold uppercase">Redă</button>
        )}
        {editable && (
          <button onClick={() => removePlaylist(i)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#ec1c24]/20 text-white/50 hover:text-[#ec1c24]"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
    ))}
    {items.length === 0 && <p className="text-white/40 text-sm">Lista e goală. Adaugă desene.</p>}
  </div>
);

const WatchParty = () => {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inviteName, setInviteName] = useState("");
  const [shows, setShows] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftPlaylist, setDraftPlaylist] = useState([]);

  const videoRef = useRef(null);
  const applyingRemote = useRef(false);
  const isOwner = room && user && room.owner_id && (room.is_owner);

  const loadRoom = useCallback(async () => {
    try {
      const { data } = await api.get("/watchparty/current");
      setRoom(data);
      if (!data) {
        const { data: inv } = await api.get("/watchparty/invitations");
        setInvites(inv || []);
      } else {
        setInvites([]);
      }
    } catch (e) {
      // ignore transient
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoom();
    const t = setInterval(loadRoom, POLL_MS);
    return () => clearInterval(t);
  }, [loadRoom]);

  useEffect(() => {
    api.get("/shows").then((r) => setShows(r.data || [])).catch(() => {});
  }, []);

  // Apply remote room state to the <video> (sync for everyone)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !room || !room.playlist.length) return;
    const cur = room.playlist[room.current_index];
    if (!cur) return;
    const targetSrc = resolveVideoUrl(cur.video_url);
    if (!v.src.endsWith(encodeURI(cur.video_url)) && v.dataset.idx !== String(room.current_index)) {
      v.dataset.idx = String(room.current_index);
      v.src = targetSrc;
    }
    // Compute target position with server drift
    let target = room.position || 0;
    if (room.is_playing && room.updated_at && room.server_time) {
      target += Math.max(0, (Date.parse(room.server_time) - Date.parse(room.updated_at)) / 1000);
    }
    applyingRemote.current = true;
    if (Math.abs((v.currentTime || 0) - target) > 1.8) {
      try { v.currentTime = target; } catch (_) { /* not ready */ }
    }
    if (room.is_playing && v.paused) v.play().catch(() => {});
    if (!room.is_playing && !v.paused) v.pause();
    setTimeout(() => { applyingRemote.current = false; }, 300);
  }, [room]);

  const control = async (payload) => {
    if (!room) return;
    try {
      const { data } = await api.post(`/watchparty/${room.id}/control`, payload);
      setRoom(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare");
    }
  };

  // Owner native-control handlers -> push to server
  const onVideoPlay = () => { if (isOwner && !applyingRemote.current) control({ action: "play", position: videoRef.current?.currentTime || 0 }); };
  const onVideoPause = () => { if (isOwner && !applyingRemote.current) control({ action: "pause", position: videoRef.current?.currentTime || 0 }); };
  const onVideoSeeked = () => { if (isOwner && !applyingRemote.current) control({ action: "seek", position: videoRef.current?.currentTime || 0 }); };
  const onVideoEnded = () => { if (isOwner && room.current_index < room.playlist.length - 1) control({ action: "next" }); };

  const createRoom = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/watchparty/create", { playlist: draftPlaylist.map((p) => ({ show_id: p.show_id, episode_number: p.episode_number })) });
      setRoom(data);
      setDraftPlaylist([]);
      toast.success("Watch party creat!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare la creare");
    } finally {
      setCreating(false);
    }
  };

  const invite = async () => {
    if (!inviteName.trim()) return;
    try {
      const { data } = await api.post(`/watchparty/${room.id}/invite`, { username: inviteName.trim() });
      setRoom(data);
      setInviteName("");
      toast.success("Invitație trimisă!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare la invitare");
    }
  };

  const [responding, setResponding] = useState(false);
  const respond = async (roomId, accept) => {
    if (responding) return;
    setResponding(true);
    try {
      await api.post(`/watchparty/${roomId}/respond`, { accept });
      toast.success(accept ? "Te-ai alăturat!" : "Invitație refuzată");
      await loadRoom();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare");
      await loadRoom();
    } finally {
      setResponding(false);
    }
  };

  const addToPlaylist = async (show, ep) => {
    if (room) {
      try {
        const { data } = await api.post(`/watchparty/${room.id}/playlist`, { action: "add", show_id: show.id, episode_number: ep.number });
        setRoom(data);
        toast.success("Adăugat în listă");
      } catch (e) { toast.error(e.response?.data?.detail || "Eroare"); }
    } else {
      setDraftPlaylist((d) => [...d, { show_id: show.id, episode_number: ep.number, show_title: show.title, episode_title: ep.title, thumbnail: show.thumbnail }]);
    }
    setPickerOpen(false);
  };

  const removePlaylist = async (idx) => {
    if (room) {
      const { data } = await api.post(`/watchparty/${room.id}/playlist`, { action: "remove", index: idx });
      setRoom(data);
    } else {
      setDraftPlaylist((d) => d.filter((_, i) => i !== idx));
    }
  };

  const endParty = async () => {
    await api.post(`/watchparty/${room.id}/end`);
    setRoom(null);
    loadRoom();
    toast.success("Watch party încheiat");
  };

  const leaveParty = async () => {
    await api.post(`/watchparty/${room.id}/leave`);
    setRoom(null);
    loadRoom();
  };

  const Header = () => (
    <div className="flex items-center gap-3 mb-6">
      <Tv className="h-8 w-8 text-[#06b6d4]" />
      <h1 className="font-display italic text-4xl">Watch Party</h1>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white"><NavBar /><div className="pt-24 text-center text-white/50">Se încarcă...</div></div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      {pickerOpen && <ShowPicker shows={shows} onClose={() => setPickerOpen(false)} onAdd={addToPlaylist} />}
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-6xl mx-auto">
        <Header />

        {/* ---- No active room: invitations + create ---- */}
        {!room && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Invitations */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
              <h2 className="font-display text-2xl mb-4">Invitații primite</h2>
              {invites.length === 0 ? (
                <p className="text-white/40 text-sm">Nu ai nicio invitație în așteptare.</p>
              ) : (
                <div className="space-y-3" data-testid="wp-invites">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <img src={inv.owner_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{inv.owner_name} te-a invitat</p>
                        <p className="text-xs text-white/40">{inv.playlist_count} desene în listă</p>
                      </div>
                      <button onClick={() => respond(inv.id, true)} disabled={responding} className="px-3 py-1.5 rounded-lg bg-[#22c55e] text-black text-xs font-bold disabled:opacity-50">Acceptă</button>
                      <button onClick={() => respond(inv.id, false)} disabled={responding} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold disabled:opacity-50">Refuză</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create room */}
            <div className="bg-[#141414] border border-[#06b6d4]/30 rounded-2xl p-6">
              <h2 className="font-display text-2xl mb-1">Creează un Watch Party</h2>
              <p className="text-sm text-white/50 mb-4">
                {user?.plus ? "Ca membru PLUS poți invita până la 4 persoane." : "Ca membru FREE poți invita 1 persoană. Treci la PLUS pentru 4."}
              </p>
              <button onClick={() => setPickerOpen(true)} className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 font-semibold flex items-center justify-center gap-2 mb-4">
                <Plus className="h-4 w-4" /> Adaugă desene în listă
              </button>
              <PlaylistList items={draftPlaylist} editable room={room} isOwner={isOwner} control={control} removePlaylist={removePlaylist} />
              <button data-testid="wp-create" onClick={createRoom} disabled={creating || draftPlaylist.length === 0} className="mt-4 w-full py-3 rounded-lg bg-[#06b6d4] text-black font-bold hover:brightness-110 disabled:opacity-50">
                {creating ? "Se creează..." : "Începe Watch Party"}
              </button>
            </div>
          </div>
        )}

        {/* ---- Active room ---- */}
        {room && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Player */}
            <div className="lg:col-span-2">
              <video
                ref={videoRef}
                controls={!!isOwner}
                playsInline
                onPlay={onVideoPlay}
                onPause={onVideoPause}
                onSeeked={onVideoSeeked}
                onEnded={onVideoEnded}
                className="w-full aspect-video rounded-xl bg-black"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {room.playlist[room.current_index]?.show_title || "Fără desene"}
                    {room.playlist[room.current_index] ? ` · Ep ${room.playlist[room.current_index].episode_number}` : ""}
                  </p>
                  <p className="text-xs text-white/40">{isOwner ? "Controlezi redarea" : "Redare sincronizată de owner"}</p>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => control({ action: "prev" })} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><SkipBack className="h-4 w-4" /></button>
                    <button onClick={() => control({ action: room.is_playing ? "pause" : "play", position: videoRef.current?.currentTime || 0 })} className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#06b6d4] text-black"><Play className="h-4 w-4 fill-black" /></button>
                    <button onClick={() => control({ action: "next" })} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><SkipForward className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Participants */}
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-xl flex items-center gap-2"><Users className="h-5 w-5 text-[#06b6d4]" /> Participanți</h3>
                  <span className="text-xs text-white/40">{room.participants.length}/{room.max_others + 1}</span>
                </div>
                <div className="space-y-2">
                  {room.participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <img src={p.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      <span className="text-sm font-semibold flex items-center gap-1">{p.name} {p.id === room.owner_id && <Crown className="h-3.5 w-3.5 text-[#ffcc00]" />}</span>
                    </div>
                  ))}
                  {room.invited.filter((i) => i.status === "pending").map((i) => (
                    <div key={i.id} className="flex items-center gap-2 opacity-50">
                      <img src={i.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      <span className="text-sm">{i.name} <span className="text-[10px] text-white/40">(în așteptare)</span></span>
                    </div>
                  ))}
                </div>
                {isOwner && (
                  <div className="flex gap-2 mt-4">
                    <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="nume utilizator" className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4]" />
                    <button data-testid="wp-invite" onClick={invite} className="px-3 rounded-lg bg-[#06b6d4] text-black font-bold flex items-center gap-1 text-sm"><UserPlus className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              {/* Playlist */}
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-xl flex items-center gap-2"><ListVideo className="h-5 w-5 text-[#06b6d4]" /> Listă</h3>
                  {isOwner && <button onClick={() => setPickerOpen(true)} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Adaugă</button>}
                </div>
                <PlaylistList items={room.playlist} editable={isOwner} room={room} isOwner={isOwner} control={control} removePlaylist={removePlaylist} />
              </div>

              {/* Actions */}
              {isOwner ? (
                <button data-testid="wp-end" onClick={endParty} className="w-full py-3 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] flex items-center justify-center gap-2"><X className="h-4 w-4" /> Încheie Watch Party</button>
              ) : (
                <button onClick={leaveParty} className="w-full py-3 rounded-lg bg-white/10 font-bold hover:bg-white/20 flex items-center justify-center gap-2"><LogOut className="h-4 w-4" /> Părăsește</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchParty;

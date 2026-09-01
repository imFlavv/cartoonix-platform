import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api, resolveVideoUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Film, Crown, Info, Maximize, Send, Volume2, VolumeX, ArrowLeft, Lock, Ticket, Users, Heart, DoorOpen } from "lucide-react";

const rowLetter = (r) => String.fromCharCode(65 + r);

const CINEMA_BG = {
  backgroundImage:
    "linear-gradient(90deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.5) 45%, rgba(10,10,10,0.88) 100%), url('/cinema-hall-bg.webp')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

// ---------------- Hall chooser ----------------
const HallCard = ({ hall, onEnter }) => {
  const closed = hall.status === "closed";
  const live = hall.status === "live";
  return (
    <button
      data-testid={`cinema-hall-${hall.hall}`}
      onClick={() => !closed && onEnter(hall.hall)}
      disabled={closed}
      className={`group relative overflow-hidden rounded-3xl border p-8 text-left transition-all duration-300 ${
        closed ? "border-white/10 opacity-60 cursor-not-allowed" : "border-[#ffcc00]/40 hover:border-[#ffcc00] hover:-translate-y-1"
      }`}
      style={{ background: "linear-gradient(135deg,#1a1206 0%,#0f0f0f 60%)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <Film className="h-10 w-10 text-[#ffcc00]" />
        {closed ? (
          <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1"><Lock className="h-3 w-3" /> Închisă</span>
        ) : live ? (
          <span className="px-3 py-1 rounded-full bg-[#ec1c24] text-white text-xs font-bold uppercase tracking-widest animate-pulse">În transmisie</span>
        ) : (
          <span className="px-3 py-1 rounded-full bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 text-xs font-bold uppercase tracking-widest">Intrare deschisă</span>
        )}
      </div>
      <h2 className="font-display text-4xl mb-1">{hall.name}</h2>
      <p className="text-white/50 text-sm">{closed ? "Această sală nu este disponibilă momentan." : `${hall.occupied}/${hall.capacity} locuri ocupate`}</p>
      {!closed && (
        <div className="mt-5 inline-flex items-center gap-2 text-[#ffcc00] font-bold text-sm group-hover:gap-3 transition-all">
          <DoorOpen className="h-4 w-4" /> Intră în sală
        </div>
      )}
    </button>
  );
};

// ---------------- Seat map ----------------
const SeatMap = ({ state, onPick, canPick }) => {
  const { rows, cols, plus_rows } = state;
  const occ = {};
  (state.seats || []).forEach((s) => { occ[s.seat_id] = s; });
  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        {Array.from({ length: rows }).map((_, r) => {
          const golden = r < plus_rows;
          return (
            <div key={r} className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
              <span className={`w-4 text-[10px] font-bold ${golden ? "text-[#ffcc00]" : "text-white/30"}`}>{rowLetter(r)}</span>
              {Array.from({ length: cols }).map((_, c) => {
                const id = `R${r}C${c}`;
                const s = occ[id];
                const mine = s?.mine;
                const taken = !!s && !mine;
                let cls = golden
                  ? "bg-[#ffcc00]/20 border-[#ffcc00]/50 hover:bg-[#ffcc00]/40"
                  : "bg-white/10 border-white/20 hover:bg-white/25";
                if (mine) cls = "bg-[#22c55e] border-[#22c55e] text-black";
                else if (taken) cls = golden ? "bg-[#ffcc00]/70 border-[#ffcc00] text-black cursor-default" : "bg-[#ec1c24]/70 border-[#ec1c24] text-white cursor-default";
                return (
                  <button
                    key={id}
                    data-testid={`seat-${id}`}
                    disabled={taken || (!canPick)}
                    onClick={() => !taken && canPick && onPick(id, r, c, golden)}
                    title={taken ? `Rezervat pentru ${s.nickname}` : golden ? "Loc PLUS" : `${rowLetter(r)}${c + 1}`}
                    className={`relative h-5 w-5 sm:h-6 sm:w-6 rounded-md border text-[8px] font-bold flex items-center justify-center transition-colors duration-150 ${cls}`}
                  >
                    {taken ? <Info className="h-3 w-3" /> : (mine ? "★" : "")}
                  </button>
                );
              })}
            </div>
          );
        })}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-white/50">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-white/10 border border-white/20" /> Liber</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[#ffcc00]/30 border border-[#ffcc00]/50" /> Loc PLUS (aur)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[#ec1c24]/70" /> Ocupat</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[#22c55e]" /> Locul tău</span>
        </div>
      </div>
    </div>
  );
};

// ---------------- Chat panel ----------------
const CinemaChat = ({ hall }) => {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const lastRef = useRef(null);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/cinema/${hall}/chat`, { params: lastRef.current ? { after: lastRef.current } : {} });
      if (data.length) {
        lastRef.current = data[data.length - 1].created_at;
        setMsgs((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const add = data.filter((m) => !seen.has(m.id));
          return add.length ? [...prev, ...add].slice(-200) : prev;
        });
      }
    } catch { /* ignore */ }
  }, [hall]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { boxRef.current?.scrollTo(0, boxRef.current.scrollHeight); }, [msgs]);

  const send = async () => {
    const v = text.trim();
    if (!v) return;
    setText("");
    try {
      await api.post(`/cinema/${hall}/chat`, { text: v });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Nu s-a putut trimite");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden" data-testid="cinema-chat">
      <div className="px-4 py-3 border-b border-white/10 font-display text-lg flex items-center gap-2"><Users className="h-4 w-4 text-[#ec1c24]" /> Chat sală</div>
      <div ref={boxRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
        {msgs.length === 0 && <p className="text-white/30 text-sm text-center py-6">Fii primul care scrie ceva. 🍿</p>}
        {msgs.map((m) => (
          <div key={m.id} data-testid={`cinema-msg-${m.id}`} className="text-sm">
            <span className={`font-bold ${m.role === "admin" ? "text-[#ec1c24]" : m.plus ? "text-[#ffcc00]" : "text-white/80"}`}>
              {m.name}
              {m.plus && <Crown className="inline h-3 w-3 ml-1 text-[#ffcc00]" />}
              {m.donor && <img src="/badge-donator.gif" alt="Donator" className="inline h-[15px] w-[15px] ml-0.5 -mt-0.5 object-contain" />}
            </span>
            <span className="text-white/70 ml-2 break-words">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-white/10 flex gap-2">
        <input
          data-testid="cinema-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={200}
          placeholder="Scrie un mesaj..."
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none text-sm"
        />
        <button data-testid="cinema-chat-send" onClick={send} className="px-3 rounded-lg bg-[#ec1c24] hover:bg-[#ff2d36] transition-colors"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

// ---------------- Screen (preshow / movie) ----------------
const CinemaScreen = ({ state }) => {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [adIdx, setAdIdx] = useState(0);
  const startRef = useRef(null);

  const isLive = state.status === "live";
  const ads = state.ads || [];

  // keep the synced live position locked (no pause / seek / rewind)
  useEffect(() => {
    if (!isLive) return;
    if (startRef.current == null && typeof state.position_sec === "number") {
      startRef.current = Date.now() - state.position_sec * 1000;
    }
  }, [isLive, state.position_sec]);

  const expected = () => (startRef.current == null ? 0 : (Date.now() - startRef.current) / 1000);

  const onLoaded = () => {
    const v = videoRef.current;
    if (isLive && v) { try { v.currentTime = expected(); } catch (_) {} v.play?.().catch(() => {}); }
  };
  const onTime = () => {
    if (!isLive) return;
    const v = videoRef.current;
    if (v && Math.abs(v.currentTime - expected()) > 2) { try { v.currentTime = expected(); } catch (_) {} }
  };
  const onSeeking = () => {
    if (!isLive) return;
    const v = videoRef.current;
    if (v && Math.abs(v.currentTime - expected()) > 1.2) { try { v.currentTime = expected(); } catch (_) {} }
  };
  const onPause = () => { if (isLive) videoRef.current?.play?.().catch(() => {}); };

  const goFullscreen = () => {
    const el = wrapRef.current;
    const v = videoRef.current;
    const req = el?.requestFullscreen || el?.webkitRequestFullscreen || el?.webkitRequestFullScreen;
    if (req) { try { req.call(el); return; } catch (_) {} }
    if (v?.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); } catch (_) {} }
  };

  const src = isLive ? resolveVideoUrl(state.movie_url) : (ads[adIdx] ? resolveVideoUrl(ads[adIdx].url) : "");

  return (
    <div ref={wrapRef} data-testid="cinema-screen" onClick={goFullscreen}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-black cursor-pointer border border-white/10 shadow-[0_0_80px_rgba(236,28,36,0.15)]">
      {src ? (
        <video
          ref={videoRef}
          data-testid="cinema-video"
          key={src}
          src={src}
          autoPlay
          playsInline
          muted={muted}
          controls={false}
          loop={!isLive}
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTime}
          onSeeking={onSeeking}
          onPause={onPause}
          onEnded={() => { if (!isLive && ads.length) setAdIdx((i) => (i + 1) % ads.length); }}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-contain bg-black pointer-events-none"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3">
          <Film className="h-12 w-12 animate-pulse" />
          <p>{isLive ? "Se pornește filmul..." : "În curând începe programul"}</p>
        </div>
      )}

      {/* live badge + pre-show label */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        {isLive ? (
          <span className="px-2.5 py-1 rounded-full bg-[#ec1c24] text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white animate-pulse" /> LIVE</span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-black/60 text-[#ffcc00] text-[11px] font-bold uppercase tracking-widest">Reclame</span>
        )}
      </div>

      {/* controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button data-testid="cinema-mute" onClick={() => setMuted((m) => !m)} className="h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button data-testid="cinema-fullscreen" onClick={goFullscreen} className="h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center">
          <Maximize className="h-4 w-4" />
        </button>
      </div>

      {/* donors overlay during pre-show */}
      {!isLive && (state.donors || []).length > 0 && (
        <div className="absolute bottom-3 left-3 max-w-[55%] bg-black/55 backdrop-blur rounded-xl px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] uppercase tracking-widest text-[#ffcc00] font-bold flex items-center gap-1 mb-1"><Heart className="h-3 w-3" /> Mulțumim susținătorilor</p>
          <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
            {state.donors.map((d) => d.name).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
};

// ---------------- Room (screen + seats + chat) ----------------
const CinemaRoom = ({ hall, state, onBack, onPick, onLeave }) => {
  const lightsOff = state.lights === "off";
  const hasSeat = !!state.my_seat;
  const canPick = state.status === "open"; // allow choosing and moving seats while entrance is open

  const mySeatLabel = () => {
    if (!state.my_seat) return null;
    const m = /^R(\d+)C(\d+)$/.exec(state.my_seat);
    return m ? `${rowLetter(+m[1])}${(+m[2]) + 1}` : state.my_seat;
  };

  return (
    <div className={`transition-colors duration-700 ${lightsOff ? "bg-black" : "bg-[#0a0a0a]"}`} data-testid="cinema-room">
      <div className="px-4 md:px-8 pt-20 pb-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button data-testid="cinema-room-back" onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" /> Săli
          </button>
          <div className="flex items-center gap-3">
            {hasSeat && (
              <span className="px-3 py-1 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/40 text-[#22c55e] text-xs font-bold" data-testid="cinema-my-seat">
                Locul tău: {mySeatLabel()}
              </span>
            )}
            <span className="font-display text-2xl">{state.name}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* main */}
          <div className={`lg:col-span-2 rounded-2xl p-4 transition-all duration-700 ${lightsOff ? "bg-black" : "bg-[#111]"}`}>
            <CinemaScreen state={state} />

            {/* status banner */}
            <div className="mt-4 mb-3 text-center">
              {state.status === "open" && !hasSeat && <p className="text-[#ffcc00] font-bold" data-testid="cinema-pick-banner">Alege-ți locul din sală 👇</p>}
              {state.status === "open" && hasSeat && <p className="text-white/60">Locul tău e rezervat. Poți alege alt loc liber sau aștepta începerea filmului. 🍿</p>}
              {state.status === "live" && <p className="text-[#ec1c24] font-bold">Transmisia este în desfășurare — vizionare plăcută!</p>}
            </div>

            {/* screen label */}
            <div className="mx-auto mb-4 h-1.5 w-2/3 rounded-full bg-gradient-to-r from-transparent via-[#ffcc00] to-transparent" />
            <p className="text-center text-white/30 text-xs uppercase tracking-[0.3em] mb-4">Ecran</p>

            <SeatMap state={state} onPick={onPick} canPick={canPick} />

            {hasSeat && state.status === "open" && (
              <div className="mt-4 text-center">
                <button data-testid="cinema-leave" onClick={onLeave} className="text-sm text-white/50 hover:text-[#ec1c24] transition-colors underline">
                  Renunță la loc
                </button>
              </div>
            )}
          </div>

          {/* chat */}
          <div className="lg:col-span-1 h-[520px] lg:h-auto">
            <CinemaChat hall={hall} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- Main ----------------
const Cinema = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const hallParam = params.get("hall") ? parseInt(params.get("hall"), 10) : null;
  const [halls, setHalls] = useState([]);
  const [state, setState] = useState(null);
  const [confirm, setConfirm] = useState(null); // {id,label,golden}

  // chooser
  useEffect(() => {
    if (hallParam) return;
    setState(null);
    api.get("/cinema").then((r) => setHalls(r.data.halls || [])).catch(() => {});
  }, [hallParam]);

  // hall detail polling
  const loadState = useCallback(async () => {
    if (!hallParam) return;
    try {
      const { data } = await api.get(`/cinema/${hallParam}`);
      setState(data);
    } catch { /* ignore */ }
  }, [hallParam]);

  useEffect(() => {
    if (!hallParam) return;
    loadState();
    const t = setInterval(loadState, 2500);
    return () => clearInterval(t);
  }, [hallParam, loadState]);

  // heartbeat while seated
  useEffect(() => {
    if (!hallParam || !state?.my_seat) return;
    const beat = () => api.post(`/cinema/${hallParam}/heartbeat`).catch(() => {});
    beat();
    const t = setInterval(beat, 60000);
    return () => clearInterval(t);
  }, [hallParam, state?.my_seat]);

  const enter = (h) => setParams({ hall: String(h) });
  const back = () => setParams({});

  const pick = (id, r, c, golden) => {
    if (golden && !state?.is_plus) { toast.error("Acest loc este rezervat exclusiv membrilor Cartoonix PLUS"); return; }
    setConfirm({ id, label: `${rowLetter(r)}${c + 1}`, golden });
  };

  const doConfirm = async () => {
    if (!confirm) return;
    try {
      const { data } = await api.post(`/cinema/${hallParam}/seat`, { seat_id: confirm.id });
      toast.success(`Loc confirmat: ${confirm.label}. Biletul e în profilul tău! 🎟️`);
      setConfirm(null);
      if (data.state) setState(data.state); else loadState();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Nu s-a putut rezerva locul");
      setConfirm(null);
      loadState();
    }
  };

  const leave = async () => {
    try { await api.post(`/cinema/${hallParam}/leave`); toast("Ai renunțat la loc"); loadState(); } catch { /* ignore */ }
  };

  // ----- render -----
  if (!hallParam) {
    return (
      <div className="min-h-screen text-white" style={CINEMA_BG}>
        <NavBar />
        <div className="pt-24 px-4 md:px-12 pb-16 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00] text-xs font-bold uppercase tracking-widest">
            <Film className="h-4 w-4" /> Cartoonix Cinema
          </div>
          <h1 className="font-display text-4xl md:text-6xl mb-2">Alege sala</h1>
          <p className="text-white/50 mb-8">Intră într-o sală, alege-ți locul și bucură-te de programul special alături de ceilalți.</p>
          <div className="grid sm:grid-cols-2 gap-5" data-testid="cinema-halls">
            {halls.map((h) => <HallCard key={h.hall} hall={h} onEnter={enter} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen text-white" style={CINEMA_BG}>
        <NavBar />
        <div className="pt-32 text-center text-white/50">Se încarcă sala...</div>
      </div>
    );
  }

  // Locked / closed / ended states
  const locked = state.status === "closed" || state.status === "ended" || (state.status === "live" && !state.my_seat);
  if (locked) {
    const msg = state.status === "closed" ? "Această sală este închisă momentan."
      : state.status === "ended" ? "Transmisia s-a încheiat. Mulțumim că ai fost alături de noi!"
      : "Sala este în transmisie. Nu se mai pot ocupa locuri.";
    return (
      <div className="min-h-screen text-white" style={CINEMA_BG}>
        <NavBar />
        <div className="pt-32 px-4 max-w-lg mx-auto text-center" data-testid="cinema-locked">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6"><Lock className="h-9 w-9 text-white/40" /></div>
          <h1 className="font-display text-3xl mb-3">{state.name}</h1>
          <p className="text-white/60 mb-6">{msg}</p>
          <button data-testid="cinema-locked-back" onClick={back} className="px-6 py-2.5 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors">Înapoi la săli</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <NavBar />
      <CinemaRoom hall={hallParam} state={state} onBack={back} onPick={pick} onLeave={leave} />

      {/* confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" data-testid="cinema-confirm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${confirm.golden ? "bg-[#ffcc00]/20 border border-[#ffcc00]/50" : "bg-white/10"}`}>
              {confirm.golden ? <Crown className="h-8 w-8 text-[#ffcc00]" /> : <Ticket className="h-8 w-8 text-[#ec1c24]" />}
            </div>
            <h3 className="font-display text-2xl mb-1">Confirmi locul {confirm.label}?</h3>
            <p className="text-white/50 text-sm mb-5">{confirm.golden ? "Loc PLUS (aur) 👑" : "Vei primi un bilet suvenir în profil."}</p>
            <div className="flex gap-3">
              <button data-testid="cinema-confirm-cancel" onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 font-bold transition-colors">Anulează</button>
              <button data-testid="cinema-confirm-ok" onClick={doConfirm} className="flex-1 py-2.5 rounded-lg bg-[#ec1c24] hover:bg-[#ff2d36] font-bold transition-colors">Confirmă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cinema;

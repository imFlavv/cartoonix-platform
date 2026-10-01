import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Send, PartyPopper, MessageSquareHeart } from "lucide-react";
import { NixCoin } from "@/components/NixCoin";
import { KeyIcon } from "@/components/KeyIcon";
import { FEEDBACK_SECTIONS } from "@/data/feedbackQuestions";

// Flatten all questions into a single ordered list, carrying section metadata.
const FLAT = FEEDBACK_SECTIONS.flatMap((s) =>
  s.questions.map((q) => ({ ...q, section: { title: s.title, emoji: s.emoji, accent: s.accent } }))
);
const TOTAL = FLAT.length;

const Feedback = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState("fwd");
  const advanceTimer = useRef(null);

  useEffect(() => {
    api.get("/feedback/status")
      .then((res) => setSubmitted(!!res.data?.submitted))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => advanceTimer.current && clearTimeout(advanceTimer.current);
  }, []);

  const q = FLAT[step];
  const val = answers[q?.id];
  const isLast = step === TOTAL - 1;
  const answered = q?.type === "multi" ? Array.isArray(val) && val.length > 0 : !!val;
  const canContinue = q?.type === "text" ? true : answered; // text is optional

  const goNext = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setDir("fwd");
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  };
  const goBack = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setDir("back");
    setStep((s) => Math.max(0, s - 1));
  };

  const pickSingle = (opt) => {
    setAnswers((a) => ({ ...a, [q.id]: opt }));
    if (!isLast) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => { setDir("fwd"); setStep((s) => Math.min(TOTAL - 1, s + 1)); }, 320);
    }
  };
  const toggleMulti = (opt) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[q.id]) ? a[q.id] : [];
      return { ...a, [q.id]: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] };
    });
  const setTextVal = (v) => setAnswers((a) => ({ ...a, [q.id]: v }));

  const submit = async () => {
    setSending(true);
    try {
      const { data } = await api.post("/feedback", { answers });
      setSubmitted(true);
      setJustDone(true);
      toast.success(`Mulțumim! Ai primit ${data.reward.points} NIX și ${data.reward.keys} cheie Mystery Box! 🎉`);
      refreshUser?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Eroare la trimitere");
      if (e?.response?.status === 400) setSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="feedback-loading">
        <NavBar />
        <div className="pt-24 flex items-center justify-center text-white/50">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Se încarcă...
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="feedback-done">
        <NavBar />
        <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
          <div className="relative max-w-lg w-full text-center">
            <div className="absolute inset-0 -z-10 opacity-40 blur-3xl" style={{ background: "radial-gradient(circle at 30% 20%, rgba(236,28,36,0.4), transparent 60%), radial-gradient(circle at 80% 90%, rgba(255,204,0,0.3), transparent 60%)" }} />
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
              <div className="mx-auto mb-6 h-20 w-20 rounded-3xl bg-[#ffcc00]/15 border border-[#ffcc00]/30 flex items-center justify-center">
                <PartyPopper className="h-10 w-10 text-[#ffcc00]" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl mb-3">
                {justDone ? "Mulțumim pentru feedback! ❤️" : "Ai completat deja formularul"}
              </h1>
              <p className="text-white/60 mb-6">
                {justDone
                  ? "Părerea ta ne ajută enorm să facem Cartoonix și mai bun. Recompensa ta a fost adăugată în cont."
                  : "Ai trimis deja feedbackul și ți-ai primit recompensa. Îți mulțumim! Fiecare utilizator poate completa acest formular o singură dată."}
              </p>
              {justDone && (
                <div className="flex items-center justify-center gap-3 mb-7" data-testid="feedback-reward-badges">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ec4899]/15 border border-[#ec4899]/40 text-[#f9a8d4] font-bold">
                    <NixCoin className="h-5 w-5" /> +10 NIX
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff7a18]/15 border border-[#ff7a18]/40 text-[#ffb37a] font-bold">
                    <KeyIcon className="h-5 w-5" /> +1 Cheie
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button data-testid="feedback-go-spin" onClick={() => navigate("/spin")} className="w-full px-6 py-3.5 rounded-2xl bg-[#ffcc00] text-black font-bold text-base hover:brightness-110 active:scale-[0.99] transition-all duration-200 inline-flex items-center justify-center gap-2.5 shadow-lg shadow-[#ffcc00]/20">
                  <KeyIcon className="h-5 w-5" /> Deschide Mystery Box
                </button>
                <button data-testid="feedback-go-lobby" onClick={() => navigate("/lobby")} className="w-full px-6 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white/70 font-semibold hover:bg-white/[0.08] hover:text-white transition-all duration-200">
                  Înapoi la Lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" data-testid="feedback-page">
      <NavBar />
      <div className="pt-20 pb-10 px-4 md:px-8 max-w-2xl w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <button data-testid="feedback-back-lobby" onClick={() => navigate("/lobby")} className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" /> Lobby
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/30 text-[#ffcc00] text-[11px] font-bold">
            <NixCoin className="h-3.5 w-3.5" /> 10 NIX <span className="text-white/30">·</span> <KeyIcon className="h-3.5 w-3.5" /> 1 Cheie
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareHeart className="h-3.5 w-3.5 text-[#ec1c24]" /> Feedback Cartoonix
            </span>
            <span data-testid="feedback-step-indicator">Întrebarea {step + 1} din {TOTAL}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#ec1c24] to-[#ffcc00] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1 flex flex-col justify-center">
          <div
            key={q.id}
            data-testid={`feedback-q-${q.id}`}
            className={`bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 ${dir === "fwd" ? "animate-in fade-in slide-in-from-right-4" : "animate-in fade-in slide-in-from-left-4"} duration-300`}
          >
            <div className="inline-flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: q.section.accent }}>
              <span aria-hidden>{q.section.emoji}</span> {q.section.title}
            </div>
            <p className="font-display text-2xl md:text-3xl leading-snug mb-6">
              <span className="text-white/35 mr-2">{step + 1}.</span>{q.q}
            </p>

            {q.type === "text" && (
              <textarea
                data-testid={`feedback-input-${q.id}`}
                value={val || ""}
                onChange={(e) => setTextVal(e.target.value)}
                placeholder={q.placeholder || "Răspunsul tău..."}
                rows={4}
                maxLength={1000}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none text-sm resize-y"
              />
            )}

            {q.type === "single" && (
              <div className="flex flex-col gap-2.5">
                {q.options.map((opt) => {
                  const active = val === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      data-testid={`feedback-opt-${q.id}-${opt.slice(0, 4)}`}
                      onClick={() => pickSingle(opt)}
                      className={`text-left px-4 py-3 rounded-xl border text-sm md:text-base transition-all duration-150 flex items-center gap-3 ${
                        active ? "bg-white/10 border-current font-semibold" : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/5"
                      }`}
                      style={active ? { color: q.section.accent, borderColor: q.section.accent } : undefined}
                    >
                      <span className={`h-5 w-5 rounded-full border-2 shrink-0 grid place-items-center ${active ? "border-current" : "border-white/30"}`}>
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                      </span>
                      <span className={active ? "" : "text-white/85"}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "multi" && (
              <div className="flex flex-col gap-2.5">
                {q.options.map((opt) => {
                  const active = Array.isArray(val) && val.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      data-testid={`feedback-opt-${q.id}-${opt.slice(0, 4)}`}
                      onClick={() => toggleMulti(opt)}
                      className={`text-left px-4 py-3 rounded-xl border text-sm md:text-base transition-all duration-150 flex items-center gap-3 ${
                        active ? "bg-white/10 border-current font-semibold" : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/5"
                      }`}
                      style={active ? { color: q.section.accent, borderColor: q.section.accent } : undefined}
                    >
                      <span className={`h-5 w-5 rounded-md border-2 shrink-0 grid place-items-center ${active ? "border-current bg-current" : "border-white/30"}`}>
                        {active && <Check className="h-3.5 w-3.5 text-black" />}
                      </span>
                      <span className={active ? "" : "text-white/85"}>{opt}</span>
                    </button>
                  );
                })}
                <p className="text-[11px] text-white/30 mt-0.5">Poți alege mai multe variante.</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 mt-7">
          <button
            data-testid="feedback-prev"
            onClick={goBack}
            disabled={step === 0}
            className="px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white/70 font-semibold hover:bg-white/10 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Înapoi
          </button>

          {q.type === "text" && !answered && !isLast && (
            <button data-testid="feedback-skip" onClick={goNext} className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Sari peste
            </button>
          )}

          {isLast ? (
            <button
              data-testid="feedback-submit"
              onClick={submit}
              disabled={sending}
              className="px-7 py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {sending ? "Se trimite..." : "Trimite & revendică"}
            </button>
          ) : (
            <button
              data-testid="feedback-next"
              onClick={goNext}
              disabled={!canContinue}
              className="px-7 py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              Continuă <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;

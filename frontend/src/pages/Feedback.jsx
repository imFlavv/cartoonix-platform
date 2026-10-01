import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Send, PartyPopper, MessageSquareHeart } from "lucide-react";
import { NixCoin } from "@/components/NixCoin";
import { KeyIcon } from "@/components/KeyIcon";
import { FEEDBACK_SECTIONS, REQUIRED_QUESTION_IDS } from "@/data/feedbackQuestions";

const Feedback = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    api.get("/feedback/status")
      .then((res) => setSubmitted(!!res.data?.submitted))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setSingle = (qid, value) => setAnswers((a) => ({ ...a, [qid]: value }));
  const setText = (qid, value) => setAnswers((a) => ({ ...a, [qid]: value }));
  const toggleMulti = (qid, value) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? a[qid] : [];
      return { ...a, [qid]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });

  const answeredRequired = useMemo(
    () => REQUIRED_QUESTION_IDS.filter((id) => {
      const v = answers[id];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length,
    [answers]
  );
  const allRequiredDone = answeredRequired === REQUIRED_QUESTION_IDS.length;
  const firstMissing = REQUIRED_QUESTION_IDS.find((id) => {
    const v = answers[id];
    return Array.isArray(v) ? v.length === 0 : !v;
  });

  const submit = async () => {
    if (!allRequiredDone) {
      toast.error("Te rugăm să răspunzi la toate întrebările cu variante.");
      const el = firstMissing && document.getElementById(`fb-${firstMissing}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
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
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button data-testid="feedback-go-spin" onClick={() => navigate("/spin")} className="px-6 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200 inline-flex items-center justify-center gap-2">
                  <KeyIcon className="h-5 w-5" /> Folosește cheia în Mystery Box
                </button>
                <button data-testid="feedback-go-lobby" onClick={() => navigate("/lobby")} className="px-6 py-3 rounded-full bg-white/5 border border-white/15 text-white font-bold hover:bg-white/10 transition-colors duration-200">
                  Înapoi la Lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="feedback-page">
      <NavBar />
      <div className="pt-20 pb-28 px-4 md:px-8 max-w-3xl mx-auto">
        <button data-testid="feedback-back" onClick={() => navigate("/lobby")} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-5 w-5" /> Lobby
        </button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-[#ec1c24]/30 bg-gradient-to-br from-[#1a0b0c] via-[#120a1e] to-[#0f0f0f] p-7 md:p-9 mb-8">
          <div className="pointer-events-none absolute -top-16 -right-10 h-52 w-52 rounded-full bg-[#ec1c24]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-[#ffcc00]/15 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00] text-xs font-bold uppercase tracking-widest">
              <MessageSquareHeart className="h-4 w-4" /> Feedback Cartoonix
            </div>
            <h1 className="font-display text-4xl md:text-5xl mb-3 leading-tight">Spune-ne ce crezi despre Cartoonix 🎯</h1>
            <p className="text-white/60 max-w-xl">Părerea ta contează cu adevărat. Completează formularul și primești drept mulțumire:</p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ec4899]/15 border border-[#ec4899]/40 text-[#f9a8d4] font-bold">
                <NixCoin className="h-5 w-5" /> 10 NIX
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff7a18]/15 border border-[#ff7a18]/40 text-[#ffb37a] font-bold">
                <KeyIcon className="h-5 w-5" /> 1 Cheie Mystery Box
              </span>
              <span className="text-xs text-white/40">· se completează o singură dată</span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {FEEDBACK_SECTIONS.map((section) => (
            <section key={section.key} data-testid={`feedback-section-${section.key}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl" aria-hidden>{section.emoji}</span>
                <h2 className="font-display text-2xl" style={{ color: section.accent }}>{section.title}</h2>
              </div>
              <div className="space-y-4">
                {section.questions.map((question, qi) => {
                  const globalIdx = FEEDBACK_SECTIONS
                    .slice(0, FEEDBACK_SECTIONS.indexOf(section))
                    .reduce((n, s) => n + s.questions.length, 0) + qi + 1;
                  const val = answers[question.id];
                  return (
                    <div
                      key={question.id}
                      id={`fb-${question.id}`}
                      data-testid={`feedback-q-${question.id}`}
                      className="bg-[#111] border border-white/10 rounded-2xl p-5 scroll-mt-24"
                    >
                      <p className="font-semibold mb-3 flex gap-2">
                        <span className="text-white/35 shrink-0">{globalIdx}.</span>
                        <span>{question.q}</span>
                      </p>

                      {question.type === "text" && (
                        <textarea
                          data-testid={`feedback-input-${question.id}`}
                          value={val || ""}
                          onChange={(e) => setText(question.id, e.target.value)}
                          placeholder={question.placeholder || "Răspunsul tău..."}
                          rows={3}
                          maxLength={1000}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none text-sm resize-y"
                        />
                      )}

                      {question.type === "single" && (
                        <div className="flex flex-col gap-2">
                          {question.options.map((opt) => {
                            const active = val === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                data-testid={`feedback-opt-${question.id}-${opt.slice(0, 4)}`}
                                onClick={() => setSingle(question.id, opt)}
                                className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all duration-150 flex items-center gap-3 ${
                                  active
                                    ? "bg-white/10 border-current font-semibold"
                                    : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/5"
                                }`}
                                style={active ? { color: section.accent, borderColor: section.accent } : undefined}
                              >
                                <span className={`h-4 w-4 rounded-full border-2 shrink-0 grid place-items-center ${active ? "border-current" : "border-white/30"}`}>
                                  {active && <span className="h-2 w-2 rounded-full bg-current" />}
                                </span>
                                <span className={active ? "" : "text-white/80"}>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {question.type === "multi" && (
                        <div className="flex flex-col gap-2">
                          {question.options.map((opt) => {
                            const active = Array.isArray(val) && val.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                data-testid={`feedback-opt-${question.id}-${opt.slice(0, 4)}`}
                                onClick={() => toggleMulti(question.id, opt)}
                                className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all duration-150 flex items-center gap-3 ${
                                  active
                                    ? "bg-white/10 border-current font-semibold"
                                    : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/5"
                                }`}
                                style={active ? { color: section.accent, borderColor: section.accent } : undefined}
                              >
                                <span className={`h-4 w-4 rounded-md border-2 shrink-0 grid place-items-center ${active ? "border-current bg-current" : "border-white/30"}`}>
                                  {active && <Check className="h-3 w-3 text-black" />}
                                </span>
                                <span className={active ? "" : "text-white/80"}>{opt}</span>
                              </button>
                            );
                          })}
                          <p className="text-[11px] text-white/30 mt-0.5">Poți alege mai multe variante.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1">
              <span>Întrebări cu variante completate</span>
              <span data-testid="feedback-progress">{answeredRequired}/{REQUIRED_QUESTION_IDS.length}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ec1c24] to-[#ffcc00] transition-all duration-300"
                style={{ width: `${(answeredRequired / REQUIRED_QUESTION_IDS.length) * 100}%` }}
              />
            </div>
          </div>
          <button
            data-testid="feedback-submit"
            onClick={submit}
            disabled={sending || !allRequiredDone}
            className="shrink-0 px-6 py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {sending ? "Se trimite..." : "Trimite & revendică"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Feedback;

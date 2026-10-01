import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { MessageSquareHeart, Star, Eye, X, Users } from "lucide-react";
import { FEEDBACK_SECTIONS } from "@/data/feedbackQuestions";

const QUESTION_INDEX = (() => {
  const map = {};
  let i = 1;
  FEEDBACK_SECTIONS.forEach((s) => s.questions.forEach((q) => { map[q.id] = { ...q, num: i++, section: s.title, emoji: s.emoji, accent: s.accent }; }));
  return map;
})();

const STAR_QUESTIONS = ["q13", "q19"]; // ⭐ 1-5 based
const GRADE_QUESTION = "q24";

const countStars = (str) => (typeof str === "string" ? (str.match(/⭐/g) || []).length : 0);
const parseGrade = (str) => {
  if (typeof str !== "string") return null;
  const m = str.match(/(\d+)\s*\/\s*10/);
  return m ? parseInt(m[1], 10) : null;
};

const fmtDate = (iso) => { try { return new Date(iso).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; } };

export const AdminFeedback = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/feedback");
      setItems(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    let ratingSum = 0, ratingN = 0, gradeSum = 0, gradeN = 0;
    items.forEach((f) => {
      const a = f.answers || {};
      STAR_QUESTIONS.forEach((qid) => { const n = countStars(a[qid]); if (n > 0) { ratingSum += n; ratingN += 1; } });
      const g = parseGrade(a[GRADE_QUESTION]); if (g != null) { gradeSum += g; gradeN += 1; }
    });
    return {
      count: items.length,
      avgRating: ratingN ? ratingSum / ratingN : 0,
      avgGrade: gradeN ? gradeSum / gradeN : 0,
    };
  }, [items]);

  return (
    <div className="space-y-6" data-testid="admin-feedback">
      <div>
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><MessageSquareHeart className="h-6 w-6 text-[#ec1c24]" /> Feedback utilizatori</h2>
        <p className="text-sm text-white/50">Mediile din formularul de feedback și răspunsurile fiecărui utilizator.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div data-testid="feedback-stat-rating" className="rounded-2xl border border-[#ffcc00]/30 bg-gradient-to-br from-[#1a1607] to-[#0f0f0f] p-5">
          <p className="text-xs uppercase tracking-wide text-white/50 font-semibold mb-1">Rating mediu (stele)</p>
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl text-[#ffcc00]">{stats.avgRating.toFixed(1)}</span>
            <span className="text-white/40 mb-1">/ 5</span>
          </div>
          <div className="flex gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-4 w-4 ${n <= Math.round(stats.avgRating) ? "text-[#ffcc00] fill-[#ffcc00]" : "text-white/15"}`} />
            ))}
          </div>
        </div>
        <div data-testid="feedback-stat-grade" className="rounded-2xl border border-[#ec4899]/30 bg-gradient-to-br from-[#1a0b14] to-[#0f0f0f] p-5">
          <p className="text-xs uppercase tracking-wide text-white/50 font-semibold mb-1">Notă medie</p>
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl text-[#ec4899]">{stats.avgGrade.toFixed(1)}</span>
            <span className="text-white/40 mb-1">/ 10</span>
          </div>
          <p className="text-xs text-white/40 mt-2">„Ce notă ai acorda Cartoonix"</p>
        </div>
        <div data-testid="feedback-stat-count" className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#121212] to-[#0f0f0f] p-5">
          <p className="text-xs uppercase tracking-wide text-white/50 font-semibold mb-1">Răspunsuri totale</p>
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl">{stats.count}</span>
            <Users className="h-5 w-5 text-white/40 mb-1.5" />
          </div>
          <p className="text-xs text-white/40 mt-2">utilizatori au completat</p>
        </div>
      </div>

      {/* Respondents */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5">
        <h3 className="font-display text-xl mb-3">Cine a completat</h3>
        {loading ? (
          <p className="text-white/40 text-sm py-6 text-center">Se încarcă...</p>
        ) : items.length === 0 ? (
          <p className="text-white/40 text-sm py-6 text-center">Niciun feedback încă.</p>
        ) : (
          <div className="space-y-2" data-testid="feedback-respondents">
            {items.map((f) => {
              const grade = parseGrade((f.answers || {})[GRADE_QUESTION]);
              return (
                <div key={f.user_id + f.created_at} data-testid={`feedback-row-${f.user_id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="h-9 w-9 rounded-lg bg-[#ec1c24]/15 border border-[#ec1c24]/30 flex items-center justify-center shrink-0 font-bold text-[#ec1c24] text-sm">
                    {(f.user_name || f.user_email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{f.user_name || f.user_email}</p>
                    <p className="text-xs text-white/40 truncate">{fmtDate(f.created_at)}</p>
                  </div>
                  {grade != null && <span className="text-xs font-bold text-[#ffcc00] shrink-0">{grade}/10</span>}
                  <button
                    data-testid={`feedback-view-${f.user_id}`}
                    onClick={() => setSelected(f)}
                    className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    title="Vezi răspunsurile"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Answers modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="feedback-modal">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111] border border-white/10 rounded-3xl shadow-2xl">
            <div className="sticky top-0 bg-[#111]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <div className="min-w-0">
                <p className="font-display text-xl truncate">{selected.user_name || selected.user_email}</p>
                <p className="text-xs text-white/40">{fmtDate(selected.created_at)}</p>
              </div>
              <button data-testid="feedback-modal-close" onClick={() => setSelected(null)} className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {FEEDBACK_SECTIONS.flatMap((s) => s.questions).map((q) => {
                const meta = QUESTION_INDEX[q.id];
                const ans = (selected.answers || {})[q.id];
                const display = Array.isArray(ans) ? (ans.length ? ans.join(", ") : null) : (ans || null);
                return (
                  <div key={q.id} className="border-b border-white/5 pb-3 last:border-0">
                    <p className="text-sm text-white/50 flex gap-2 mb-1">
                      <span className="text-white/30 shrink-0">{meta.num}.</span>
                      <span>{q.q}</span>
                    </p>
                    {display ? (
                      <p className="text-sm font-medium pl-5" style={{ color: meta.accent }}>{display}</p>
                    ) : (
                      <p className="text-sm text-white/25 italic pl-5">— fără răspuns —</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

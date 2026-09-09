import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RotateCw, Save, Percent } from "lucide-react";

export function AdminSpin() {
  const [weights, setWeights] = useState(null);
  const [labels, setLabels] = useState({});
  const [order, setOrder] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/admin/spin-config").then((res) => {
    setWeights(res.data.weights);
    setLabels(res.data.labels || {});
    setOrder(res.data.order || Object.keys(res.data.weights || {}));
  }).catch(() => {});

  useEffect(() => { load(); }, []);

  const total = weights ? Object.values(weights).reduce((a, b) => a + (Number(b) || 0), 0) : 0;

  const setW = (k, v) => setWeights((w) => ({ ...w, [k]: Math.max(0, parseInt(v || 0, 10) || 0) }));

  const save = async () => {
    if (total <= 0) return toast.error("Cel puțin un premiu trebuie să aibă șansă > 0");
    setSaving(true);
    try {
      await api.post("/admin/spin-config", { weights });
      toast.success("Șanse salvate");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Eroare"); }
    finally { setSaving(false); }
  };

  if (!weights) return <p className="text-white/40">Se încarcă...</p>;

  return (
    <div className="max-w-2xl">
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><RotateCw className="h-5 w-5 text-[#a855f7]" /> Roata norocului — șanse premii</h2>
        <p className="text-sm text-white/50 mb-6">Setează „greutatea" fiecărui premiu. Șansa reală = greutate ÷ suma tuturor greutăților. Nu trebuie să însumeze 100.</p>

        <div className="space-y-3">
          {order.map((k) => {
            const pct = total > 0 ? ((Number(weights[k]) || 0) / total) * 100 : 0;
            return (
              <div key={k} data-testid={`spin-weight-row-${k}`} className="flex items-center gap-4">
                <span className="w-40 shrink-0 font-semibold">{labels[k] || k}</span>
                <input
                  data-testid={`spin-weight-${k}`}
                  type="number" min="0"
                  value={weights[k]}
                  onChange={(e) => setW(k, e.target.value)}
                  className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                />
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#a855f7] to-[#ffcc00]" style={{ width: `${pct}%` }} />
                </div>
                <span data-testid={`spin-pct-${k}`} className="w-16 text-right text-sm font-mono text-white/70 flex items-center justify-end gap-0.5">
                  {pct.toFixed(1)}<Percent className="h-3 w-3" />
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <p className="text-sm text-white/50">Suma greutăților: <span className="font-bold text-white">{total}</span></p>
          <button data-testid="spin-config-save" onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Se salvează..." : "Salvează șansele"}
          </button>
        </div>
      </div>
    </div>
  );
}

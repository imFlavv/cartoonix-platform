import { useEffect, useState, useRef } from "react";
import { NavBar } from "@/components/NavBar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Inbox, Paperclip, Send, Loader2, X } from "lucide-react";

const STATUS_META = {
  open: { label: "DESCHISĂ", cls: "bg-blue-500/15 text-blue-300 border-blue-400/40" },
  in_progress: { label: "ÎN LUCRU", cls: "bg-orange-500/15 text-orange-300 border-orange-400/40" },
  resolved: { label: "REZOLVATĂ", cls: "bg-green-500/15 text-green-300 border-green-400/40" },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.open;
  return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${m.cls}`}>{m.label}</span>;
};

const MAX_BYTES = 3 * 1024 * 1024;

const MySupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null); // data URL
  const [busy, setBusy] = useState(false);
  const [replyText, setReplyText] = useState("");
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/tickets/my");
      setTickets(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const current = tickets.find((t) => t.status !== "resolved");
  const history = tickets.filter((t) => t.status === "resolved");

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Doar imagini sunt permise");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imaginea e prea mare (max 3MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/tickets", { subject, message, attachment });
      toast.success("Solicitarea a fost trimisă!");
      setSubject(""); setMessage(""); setAttachment(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !current) return;
    setBusy(true);
    try {
      await api.post(`/tickets/${current.id}/reply`, { text: replyText.trim() });
      setReplyText("");
      await load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-11 h-11 rounded-xl bg-[#ec1c24]/15 border border-[#ec1c24]/40 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-[#ec1c24]" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Solicitările mele</h1>
            <p className="text-white/50 text-sm">Deschide o solicitare către echipa Cartoonix.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-white/40 py-10 text-center">Se încarcă...</div>
        ) : current ? (
          <div data-testid="current-ticket" className="bg-[#141414] border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold">{current.subject}</h2>
              <StatusBadge status={current.status} />
            </div>
            <p className="text-white/80 whitespace-pre-wrap mb-4">{current.message}</p>
            {current.attachment && (
              <img src={current.attachment} alt="atașament" className="max-h-64 rounded-lg border border-white/10 mb-4" />
            )}

            <div className="space-y-3 border-t border-white/10 pt-4">
              {current.replies?.map((r, i) => (
                <div key={i} className={`flex ${r.from === "admin" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${r.from === "admin" ? "bg-[#ec1c24]/15 border border-[#ec1c24]/30" : "bg-white/10"}`}>
                    <p className="text-[11px] font-bold mb-1 opacity-70">{r.from === "admin" ? "Echipa Cartoonix" : "Tu"}</p>
                    <p className="whitespace-pre-wrap">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <input
                data-testid="ticket-reply-input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Scrie un răspuns..."
                className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
              />
              <button data-testid="ticket-reply-send" onClick={sendReply} disabled={busy} className="px-4 rounded-full bg-[#ffcc00] text-black font-bold flex items-center gap-1 disabled:opacity-60">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <form data-testid="ticket-form" onSubmit={submit} className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4">
            <input
              data-testid="ticket-subject"
              required minLength={3} maxLength={140}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subiect"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
            />
            <textarea
              data-testid="ticket-message"
              required minLength={5} maxLength={4000} rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descrie problema sau întrebarea ta..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] resize-none"
            />
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" id="ticket-file" />
              {attachment ? (
                <div className="relative inline-block">
                  <img src={attachment} alt="preview" className="max-h-40 rounded-lg border border-white/10" />
                  <button type="button" onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ""; }} className="absolute -top-2 -right-2 bg-[#ec1c24] rounded-full p-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label htmlFor="ticket-file" data-testid="ticket-attach" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 text-sm">
                  <Paperclip className="h-4 w-4" /> Atașează o imagine (opțional)
                </label>
              )}
            </div>
            <button data-testid="ticket-submit" type="submit" disabled={busy} className="w-full py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Se trimite...</> : "Trimite solicitarea"}
            </button>
          </form>
        )}

        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wide mb-3">Solicitări rezolvate</h3>
            <div className="space-y-2">
              {history.map((t) => (
                <div key={t.id} className="bg-[#141414]/60 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{t.subject}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySupport;

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Film, PlaySquare, Users, Crown, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl grid place-items-center" style={{ background: `${color}22`, color }}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
        <div className="font-display text-3xl tracking-wider" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data));
  }, []);
  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wider">Overview</h1>
        <p className="text-sm text-muted-foreground">A quick snapshot of your platform.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Users" value={stats.users_count} icon={Users} color="hsl(var(--brand-cn))" />
        <StatCard label="Cartoons" value={stats.cartoons_count} icon={Film} color="hsl(var(--primary))" />
        <StatCard label="Episodes" value={stats.episodes_count} icon={PlaySquare} color="hsl(var(--brand-minimax))" />
        <StatCard label="Plus users" value={stats.plus_count} icon={Crown} color="hsl(var(--accent))" />
        <StatCard label="Verified" value={stats.verified_count} icon={CheckCircle2} color="hsl(var(--brand-jetix))" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl tracking-wider">Recent cartoons</h3>
            <Link to="/admin/cartoons" className="text-xs text-[hsl(var(--primary))] hover:underline">Manage →</Link>
          </div>
          <div className="mt-3 space-y-2">
            {stats.recent_cartoons.length === 0 && <div className="text-sm text-muted-foreground">None yet.</div>}
            {stats.recent_cartoons.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.year || "—"} · {c.category_id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl tracking-wider">Recent episodes</h3>
            <Link to="/admin/episodes" className="text-xs text-[hsl(var(--primary))] hover:underline">Manage →</Link>
          </div>
          <div className="mt-3 space-y-2">
            {stats.recent_episodes.length === 0 && <div className="text-sm text-muted-foreground">None yet.</div>}
            {stats.recent_episodes.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">S{e.season} E{e.episode_number} · {e.source_type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

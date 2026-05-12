import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Crown, Users, ShieldCheck } from "lucide-react";

export default function AdminSubscriptions() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/admin/users").then(({ data }) => setUsers(data)); }, []);

  const { plus, free, breakdown } = useMemo(() => {
    const plus = users.filter((u) => u.subscription === "plus");
    const free = users.filter((u) => u.subscription !== "plus");
    return { plus, free, breakdown: { total: users.length, plus: plus.length, free: free.length } };
  }, [users]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-wider">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">View subscription distribution. Payments coming soon.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.25em]"><Users className="h-4 w-4" /> Total</div>
          <div className="font-display text-3xl tracking-wider mt-1">{breakdown.total}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.25em]"><ShieldCheck className="h-4 w-4" /> Free</div>
          <div className="font-display text-3xl tracking-wider mt-1" style={{ color: "hsl(var(--brand-cn))" }}>{breakdown.free}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.25em]"><Crown className="h-4 w-4" /> Plus</div>
          <div className="font-display text-3xl tracking-wider mt-1" style={{ color: "hsl(var(--accent))" }}>{breakdown.plus}</div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="font-display text-xl tracking-wider mb-3">Cartoonix Plus members</h3>
          {plus.length === 0 ? <div className="text-sm text-muted-foreground">No Plus members yet.</div> : (
            <ul className="space-y-2">
              {plus.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <div className="font-medium">{u.nickname}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <Badge className="rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Crown className="h-3 w-3 mr-1" /> Plus</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="font-display text-xl tracking-wider mb-3">Free members</h3>
          {free.length === 0 ? <div className="text-sm text-muted-foreground">No free members.</div> : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {free.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <div className="font-medium">{u.nickname}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">Free</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

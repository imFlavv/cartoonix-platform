import React, { useEffect, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Shield, ShieldCheck, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const { user: me } = useAuth();

  const load = async () => {
    const { data } = await api.get("/admin/users");
    setUsers(data);
  };
  useEffect(() => { load(); }, []);

  const updateUser = async (id, patch) => {
    try {
      await api.patch(`/admin/users/${id}`, patch);
      toast.success("Updated");
      load();
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Delete failed"));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-wider">Users</h1>
        <p className="text-sm text-muted-foreground">Manage accounts, roles and subscriptions.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3 hidden sm:table-cell">Email</th>
              <th className="text-left p-3 hidden md:table-cell">Role</th>
              <th className="text-left p-3 hidden md:table-cell">Subscription</th>
              <th className="text-left p-3 hidden lg:table-cell">Verified</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={mediaUrl(u.avatar_url)} alt="" className="h-8 w-8 rounded-md object-cover bg-secondary" />
                    <div>
                      <div className="font-medium">{u.nickname}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                <td className="p-3 hidden md:table-cell">
                  <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v })}>
                    <SelectTrigger className="h-9 w-28 rounded-lg" data-testid={`admin-user-role-${u.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <Select value={u.subscription} onValueChange={(v) => updateUser(u.id, { subscription: v })}>
                    <SelectTrigger className="h-9 w-28 rounded-lg" data-testid={`admin-user-sub-${u.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="plus">Plus</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  {u.email_verified ? <Badge className="rounded-full"><ShieldCheck className="h-3 w-3 mr-1" /> Yes</Badge> : <Badge variant="destructive" className="rounded-full">No</Badge>}
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)} disabled={u.id === me?.id} className="text-destructive" data-testid={`admin-user-delete-${u.id}`}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No users.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MaintenancePage } from "@/components/MaintenancePage";

export const MaintenanceGate = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [enabled, setEnabled] = useState(null);

  const check = () => api.get("/settings/maintenance").then((res) => setEnabled(res.data.enabled)).catch(() => setEnabled(false));

  useEffect(() => {
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  // re-check when user logs in/out
  useEffect(() => { check(); }, [user]);

  if (loading || enabled === null) return children;

  const isAdmin = user?.role === "admin";
  if (enabled && !isAdmin) {
    // allow admins to reach the login page
    if (location.pathname === "/login") return children;
    return <MaintenancePage />;
  }
  return children;
};

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MaintenancePage } from "@/components/MaintenancePage";
import { VisionPage } from "@/components/VisionPage";

export const MaintenanceGate = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [enabled, setEnabled] = useState(null);
  const [vision, setVision] = useState(false);

  const check = () => {
    api.get("/settings/maintenance").then((res) => setEnabled(res.data.enabled)).catch(() => setEnabled(false));
    api.get("/settings/vision-page").then((res) => setVision(res.data.enabled)).catch(() => setVision(false));
  };

  useEffect(() => {
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  // re-check when user logs in/out
  useEffect(() => { check(); }, [user]);

  if (loading || enabled === null) return children;

  const isAdmin = user?.role === "admin";
  if (vision && !isAdmin) {
    if (location.pathname === "/login") return children;
    return <VisionPage />;
  }
  if (enabled && !isAdmin) {
    // allow admins to reach the login page, and keep the public Wiki reachable during maintenance
    if (location.pathname === "/login" || location.pathname.startsWith("/wiki")) return children;
    return <MaintenancePage />;
  }
  return children;
};

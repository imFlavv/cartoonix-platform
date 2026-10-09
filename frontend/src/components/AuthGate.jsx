import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LockScreen from "@/pages/LockScreen";
import PendingAccount from "@/pages/PendingAccount";

// Paths reachable without being logged in.
const PUBLIC_PATHS = ["/login", "/register", "/reset-password", "/termeni", "/confidentialitate", "/regulament", "/cookies", "/cast-test", "/changelog"];
// Paths a pending/rejected user may still reach (so they can finish a PLUS payment).
const PENDING_ALLOWED = ["/register", "/payment/success", "/payment/cancel"];

export const AuthGate = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white/50">
        Se încarcă...
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.includes(location.pathname) || location.pathname.startsWith("/wiki");
  if (!user && !isPublic) {
    return <LockScreen />;
  }
  if (user && (user.status === "pending" || user.status === "rejected") && !PENDING_ALLOWED.includes(location.pathname)) {
    return <PendingAccount />;
  }
  return children;
};

import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LockScreen from "@/pages/LockScreen";

// Paths reachable without being logged in.
const PUBLIC_PATHS = ["/login", "/register"];

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

  const isPublic = PUBLIC_PATHS.includes(location.pathname);
  if (!user && !isPublic) {
    return <LockScreen />;
  }
  return children;
};

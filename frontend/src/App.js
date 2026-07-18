import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ShowDetail from "@/pages/ShowDetail";
import Watch from "@/pages/Watch";
import Plus from "@/pages/Plus";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import Admin from "@/pages/Admin";

function App() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("cx_splash_seen"));

  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => {
      sessionStorage.setItem("cx_splash_seen", "1");
      setShowSplash(false);
    }, 2800);
    return () => clearTimeout(t);
  }, [showSplash]);

  if (showSplash) return <SplashScreen />;

  return (
    <AuthProvider>
      <LibraryProvider>
        <Toaster position="top-center" theme="dark" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/plus" element={<Plus />} />
            <Route path="/help" element={<Help />} />
            <Route path="/show/:id" element={<ShowDetail />} />
            <Route path="/watch/:id/:ep" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </LibraryProvider>
    </AuthProvider>
  );
}

export default App;

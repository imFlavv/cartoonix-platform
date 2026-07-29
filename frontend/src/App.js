import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthGate } from "@/components/AuthGate";
import { MaintenanceGate } from "@/components/MaintenanceGate";
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
import Lobby from "@/pages/Lobby";
import ChatRoom from "@/pages/ChatRoom";
import Announcements from "@/pages/Announcements";
import Admin from "@/pages/Admin";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import MySupport from "@/pages/MySupport";

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
          <MaintenanceGate>
            <AuthGate>
            <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/plus" element={<Plus />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/help" element={<Help />} />
            <Route path="/support" element={<ProtectedRoute><MySupport /></ProtectedRoute>} />
            <Route path="/show/:id" element={<ShowDetail />} />
            <Route path="/watch/:id/:ep" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
            <Route path="/lobby/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
            <Route path="/lobby/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            </AuthGate>
          </MaintenanceGate>
        </BrowserRouter>
      </LibraryProvider>
    </AuthProvider>
  );
}

export default App;

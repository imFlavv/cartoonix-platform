import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import CategoryPage from "@/pages/CategoryPage";
import CartoonDetailPage from "@/pages/CartoonDetailPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RegisterPage from "@/pages/RegisterPage";
import VerifyPage from "@/pages/VerifyPage";
import TermsPage from "@/pages/TermsPage";
import GdprPage from "@/pages/GdprPage";
import ProfilePage from "@/pages/ProfilePage";
import PlaylistPlayerPage from "@/pages/PlaylistPlayerPage";
import PresentationPage from "@/pages/PresentationPage";
import MaintenancePage from "@/pages/MaintenancePage";
import EarlyAccessPage from "@/pages/EarlyAccessPage";
import EarlyAccessSuccessPage from "@/pages/EarlyAccessSuccessPage";
import UpgradeReturnPage from "@/pages/UpgradeReturnPage";
import LivePage from "@/pages/LivePage";
import WinnersPage from "@/pages/WinnersPage";
import GuestGatePage from "@/pages/GuestGatePage";
import CartoonixContestsPage from "@/pages/CartoonixContestsPage";
import AdminLayout from "@/components/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminCartoons from "@/pages/admin/AdminCartoons";
import AdminEpisodes from "@/pages/admin/AdminEpisodes";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminContests from "@/pages/admin/AdminContests";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminChat from "@/pages/admin/AdminChat";
import AdminStaff from "@/pages/admin/AdminStaff";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminLive from "@/pages/admin/AdminLive";
import SupportPage from "@/pages/SupportPage";
import StaffPage from "@/pages/StaffPage";
import { RequireAdmin, RequireAuth } from "@/components/RouteGuards";
import ChatWidget from "@/components/chat/ChatWidget";

/**
 * Routes that remain available even when presentation_mode is ON:
 *  - / (presentation page itself)
 *  - /register (let users sign up)
 *  - /verify (email verification flow)
 *  - /terms-and-conditions
 *  - /login (admins still need to log in)
 *  - /admin/* (handled inside element)
 */
const PRESENTATION_ALLOWED_PREFIXES = [
  "/register",
  "/verify",
  "/terms-and-conditions",
  "/gdpr",
  "/login",
  "/admin",
  "/concursuri",
  "/staff",
];

/**
 * Routes that remain available when maintenance_mode is ON.
 * We keep this very tight: only login + admin so admins can still get in
 * to disable maintenance. Everything else shows the maintenance screen.
 */
const MAINTENANCE_ALLOWED_PREFIXES = [
  "/login",
  "/admin",
  "/forgot-password",
  "/reset-password",
  "/verify",
];

function MaintenanceGate({ children }) {
  const { settings, loading: settingsLoading } = useSettings() || {};
  const { user, loading: authLoading } = useAuth() || {};
  const location = useLocation();

  if (settingsLoading || authLoading) return null;

  const maintenanceOn = !!settings?.maintenance_mode;
  if (!maintenanceOn) return children;

  // Admins always have full access.
  if (user?.role === "admin") return children;

  const path = location.pathname;
  const allowed = MAINTENANCE_ALLOWED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/")
  );
  if (allowed) return children;

  return <MaintenancePage />;
}

/**
 * Routes that remain available when early_access_mode is ON.
 *  - /early-access (the registration flow page itself)
 *  - /login, /admin (so admins can disable it)
 *  - /terms-and-conditions (linked from the form)
 *  - / (handled by RootRoute below — shows success or registration page)
 */
const EARLY_ACCESS_ALLOWED_PREFIXES = [
  "/early-access",
  "/login",
  "/admin",
  "/terms-and-conditions",
  "/concursuri-cartoonix",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/staff",
  "/live",
  "/castigatori",
];

function EarlyAccessGate({ children }) {
  const { settings, loading: settingsLoading } = useSettings() || {};
  const { user, loading: authLoading } = useAuth() || {};
  const location = useLocation();

  if (settingsLoading || authLoading) return null;

  const earlyOn = !!settings?.early_access_mode;
  if (!earlyOn) return children;

  // Admins always have full access.
  if (user?.role === "admin") return children;

  const path = location.pathname;
  // Root is handled by RootRoute (shows success or the early-access page).
  if (path === "/") return children;

  const allowed = EARLY_ACCESS_ALLOWED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/")
  );
  if (allowed) return children;

  // Redirect logged-in non-admin users to home (countdown), guests to /early-access.
  return <Navigate to={user ? "/" : "/early-access"} replace />;
}

function PublicRoute({ element }) {
  const { settings, loading: settingsLoading } = useSettings() || {};
  const { user, loading: authLoading } = useAuth() || {};
  const location = useLocation();

  if (settingsLoading || authLoading) return null;

  const presentationOn = !!settings?.presentation_mode;
  const isAdmin = user?.role === "admin";

  // If presentation mode is OFF, render normally.
  if (!presentationOn) return element;

  // Admins always have full access.
  if (isAdmin) return element;

  // Check if the current path is in the allow-list.
  const path = location.pathname;
  const allowed = PRESENTATION_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  if (allowed) return element;

  // Otherwise redirect to the presentation page.
  return <Navigate to="/" replace />;
}

function RootRoute() {
  const { settings, loading: settingsLoading } = useSettings() || {};
  const { user, loading: authLoading } = useAuth() || {};
  if (settingsLoading || authLoading) return null;

  // Early access: logged-in non-admin -> countdown success page;
  // guests/unverified -> EarlyAccessPage with the 3-step form.
  if (settings?.early_access_mode && user?.role !== "admin") {
    if (user) return <EarlyAccessSuccessPage />;
    return <EarlyAccessPage />;
  }

  if (settings?.presentation_mode) return <PresentationPage />;
  // Platform is exclusive to registered users. Guests get a beautiful welcome.
  if (!user) return <GuestGatePage />;
  return <HomePage />;
}

function EarlyAccessRoute() {
  const { settings, loading: settingsLoading } = useSettings() || {};
  const { user, loading: authLoading } = useAuth() || {};
  const location = useLocation();
  if (settingsLoading || authLoading) return null;

  // If the user is returning from Stripe with a `session_id` query, we must
  // handle the upgrade/registration confirmation BEFORE doing any redirect,
  // otherwise the `session_id` is lost when early-access mode is OFF.
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id");
  const hasSessionId = !!sessionId;
  if (hasSessionId) {
    // Case 1: Logged-in user returning from a FREE -> PLUS upgrade.
    if (user && user.role !== "admin") {
      // When early-access mode is OFF use the dedicated lightweight handler;
      // otherwise the success page already handles `session_id`.
      if (!settings?.early_access_mode) return <UpgradeReturnPage />;
      return <EarlyAccessSuccessPage />;
    }

    // Case 2: Guest returning from a PLUS registration payment.
    // Forward to /register (or to /early-access registration page when the
    // feature is ON), preserving `session_id` so the registration page can
    // call `/api/early-access/confirm-payment`.
    if (!user) {
      if (!settings?.early_access_mode) {
        return (
          <Navigate
            to={`/register?session_id=${encodeURIComponent(sessionId)}`}
            replace
          />
        );
      }
      // In early-access mode the EarlyAccessPage itself handles `session_id`.
      return <EarlyAccessPage />;
    }
  }

  // When the feature is OFF, /early-access redirects to home.
  if (!settings?.early_access_mode) return <Navigate to="/" replace />;
  // Logged-in non-admin users get the countdown.
  if (user && user.role !== "admin") return <EarlyAccessSuccessPage />;
  return <EarlyAccessPage />;
}

/**
 * Chat widget is rendered ONLY for logged-in users (not admins inside /admin)
 * and only when chat_enabled. It is hidden on maintenance/auth pages and inside
 * the admin panel (admins use /admin/chat).
 */
function ChatMount() {
  const { user, loading: authLoading } = useAuth() || {};
  const { settings, loading: settingsLoading } = useSettings() || {};
  const location = useLocation();
  if (authLoading || settingsLoading) return null;
  if (!user) return null;
  if (settings?.maintenance_mode && user.role !== "admin") return null;
  if (settings?.chat_enabled === false) return null;
  const path = location.pathname;
  // Hide on auth / verification flows and inside /admin
  const HIDDEN_PREFIXES = [
    "/admin",
    "/login",
    "/register",
    "/verify",
    "/reset-password",
    "/forgot-password",
    "/terms-and-conditions",
    "/gdpr",
    "/castigatori",
  ];
  if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return null;
  }
  return <ChatWidget />;
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <SettingsProvider>
              <MaintenanceGate>
                <EarlyAccessGate>
                <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/early-access" element={<EarlyAccessRoute />} />
                <Route path="/category/:slug" element={<RequireAuth redirectTo="/"><PublicRoute element={<CategoryPage />} /></RequireAuth>} />
                <Route path="/cartoon/:id" element={<RequireAuth redirectTo="/"><PublicRoute element={<CartoonDetailPage />} /></RequireAuth>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify" element={<VerifyPage />} />
                <Route path="/plans" element={<Navigate to="/" replace />} />
                <Route path="/terms-and-conditions" element={<TermsPage />} />
                <Route path="/gdpr" element={<GdprPage />} />
                <Route path="/concursuri" element={<Navigate to="/" replace />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route
                  path="/live"
                  element={
                    <RequireAuth>
                      <LivePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/castigatori"
                  element={
                    <RequireAuth>
                      <WinnersPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/concursuri-cartoonix"
                  element={
                    <RequireAuth>
                      <CartoonixContestsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <PublicRoute element={<ProfilePage />} />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/playlist/:id"
                  element={
                    <RequireAuth>
                      <PublicRoute element={<PlaylistPlayerPage />} />
                    </RequireAuth>
                  }
                />
                <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
                <Route
                  path="/support"
                  element={
                    <RequireAuth>
                      <PublicRoute element={<SupportPage />} />
                    </RequireAuth>
                  }
                />
                <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                  <Route index element={<AdminOverview />} />
                  <Route path="cartoons" element={<AdminCartoons />} />
                  <Route path="episodes" element={<AdminEpisodes />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="contests" element={<AdminContests />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="chat" element={<AdminChat />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="support" element={<AdminSupport />} />
                  <Route path="live" element={<AdminLive />} />
                </Route>
              </Routes>
              </EarlyAccessGate>
              </MaintenanceGate>
              <ChatMount />
              <Toaster position="top-right" />
            </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;

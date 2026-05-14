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
import RegisterPage from "@/pages/RegisterPage";
import VerifyPage from "@/pages/VerifyPage";
import PlansPage from "@/pages/PlansPage";
import TermsPage from "@/pages/TermsPage";
import DashboardPage from "@/pages/DashboardPage";
import PresentationPage from "@/pages/PresentationPage";
import MaintenancePage from "@/pages/MaintenancePage";
import EarlyAccessPage from "@/pages/EarlyAccessPage";
import EarlyAccessSuccessPage from "@/pages/EarlyAccessSuccessPage";
import ConcursuriPage from "@/pages/ConcursuriPage";
import AdminLayout from "@/components/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminCartoons from "@/pages/admin/AdminCartoons";
import AdminEpisodes from "@/pages/admin/AdminEpisodes";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminSettings from "@/pages/admin/AdminSettings";
import { RequireAdmin, RequireAuth } from "@/components/RouteGuards";

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
  "/login",
  "/admin",
  "/concursuri",
];

/**
 * Routes that remain available when maintenance_mode is ON.
 * We keep this very tight: only login + admin so admins can still get in
 * to disable maintenance. Everything else shows the maintenance screen.
 */
const MAINTENANCE_ALLOWED_PREFIXES = ["/login", "/admin"];

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
  return <HomePage />;
}

function EarlyAccessRoute() {
  const { settings, loading: settingsLoading } = useSettings() || {};
  const { user, loading: authLoading } = useAuth() || {};
  if (settingsLoading || authLoading) return null;
  // When the feature is OFF, /early-access redirects to home.
  if (!settings?.early_access_mode) return <Navigate to="/" replace />;
  // Logged-in non-admin users get the countdown.
  if (user && user.role !== "admin") return <EarlyAccessSuccessPage />;
  return <EarlyAccessPage />;
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
                <Route path="/category/:slug" element={<PublicRoute element={<CategoryPage />} />} />
                <Route path="/cartoon/:id" element={<PublicRoute element={<CartoonDetailPage />} />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify" element={<VerifyPage />} />
                <Route path="/plans" element={<PublicRoute element={<PlansPage />} />} />
                <Route path="/terms-and-conditions" element={<TermsPage />} />
                <Route path="/concursuri" element={<ConcursuriPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <PublicRoute element={<DashboardPage />} />
                    </RequireAuth>
                  }
                />
                <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                  <Route index element={<AdminOverview />} />
                  <Route path="cartoons" element={<AdminCartoons />} />
                  <Route path="episodes" element={<AdminEpisodes />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Routes>
              </EarlyAccessGate>
              </MaintenanceGate>
              <Toaster position="top-right" expand={false} />
            </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;

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
  const { loading: authLoading } = useAuth() || {};
  if (settingsLoading || authLoading) return null;
  if (settings?.presentation_mode) return <PresentationPage />;
  return <HomePage />;
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <SettingsProvider>
              <Routes>
                <Route path="/" element={<RootRoute />} />
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
              <Toaster position="top-right" expand={false} />
            </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;

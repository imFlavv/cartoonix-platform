import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
import AdminLayout from "@/components/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminCartoons from "@/pages/admin/AdminCartoons";
import AdminEpisodes from "@/pages/admin/AdminEpisodes";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import { RequireAdmin, RequireAuth } from "@/components/RouteGuards";

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/cartoon/:id" element={<CartoonDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/terms-and-conditions" element={<TermsPage />} />
              <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<AdminOverview />} />
                <Route path="cartoons" element={<AdminCartoons />} />
                <Route path="episodes" element={<AdminEpisodes />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
              </Route>
            </Routes>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;

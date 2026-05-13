import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const token = localStorage.getItem("cartoonix_token");
      if (!token) {
        setUser(null);
        return null;
      }
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch {
      localStorage.removeItem("cartoonix_token");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("cartoonix_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    // Backend now returns ONLY {success, email} — no token, no user.
    // The account is created on /auth/verify-email.
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  const verifyEmail = async (email, code) => {
    // Returns TokenResponse {access_token, user} now that user creation happens here.
    const { data } = await api.post("/auth/verify-email", { email, code });
    if (data?.access_token) {
      localStorage.setItem("cartoonix_token", data.access_token);
    }
    if (data?.user) {
      setUser(data.user);
    } else {
      await fetchMe();
    }
    return data;
  };

  const resendCode = async (email) => {
    const { data } = await api.post("/auth/resend-code", { email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("cartoonix_token");
    setUser(null);
  };

  const updateMe = async (updates) => {
    const { data } = await api.patch("/auth/me", updates);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, verifyEmail, resendCode, logout, updateMe, fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

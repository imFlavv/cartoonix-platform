import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cx_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("cx_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("cx_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("cx_token", data.token);
    setUser(data.user);
    return data.user;
  };

  // Step 1: trimite codul de verificare pe email
  const registerStart = async (payload) => {
    const { data } = await api.post("/auth/register/start", payload);
    return data;
  };

  // Step 2: verifică codul, creează contul și loghează automat
  const registerVerify = async (email, code) => {
    const { data } = await api.post("/auth/register/verify", { email, code });
    localStorage.setItem("cx_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("cx_token");
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  };

  // presence heartbeat + time tracking
  useEffect(() => {
    if (!user) return;
    const ping = () => api.post("/presence").catch(() => {});
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, registerStart, registerVerify, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

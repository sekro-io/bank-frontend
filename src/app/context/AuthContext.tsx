"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  // 🔁 Load token on app start
  useEffect(() => {
    const storedToken = localStorage.getItem("sekro_token");
    if (storedToken) {
      setTokenState(storedToken);
    }
  }, []);

  // ✅ Centralized setter
  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("sekro_token", newToken);
    } else {
      localStorage.removeItem("sekro_token");
    }
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem("sekro_token");
    setTokenState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}


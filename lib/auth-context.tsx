"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { subscribeToAuth, loginUser, registerUser, logoutUser } from "@/lib/auth";
import type { AppUser, UserRole } from "@/lib/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (correo: string, password: string) => Promise<void>;
  register: (nombre: string, correo: string, password: string, rol: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    async login(correo, password) {
      const u = await loginUser(correo, password);
      setUser(u);
    },
    async register(nombre, correo, password, rol) {
      const u = await registerUser(nombre, correo, password, rol);
      setUser(u);
    },
    async logout() {
      await logoutUser();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

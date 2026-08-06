"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getAccessToken, getRefreshToken, setTokens, clearAuthStorage } from "@/lib/api";
import { useRouter } from "next/navigation";

export interface User {
  id?: number;
  email: string;
  fullName: string;
  roles?: string[];
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Restore user session on initial load instantly
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      const refToken = getRefreshToken();

      if (token) {
        setAccessTokenState(token);
        setRefreshTokenState(refToken);
        
        // Restore cached user from storage instantly for 0ms initial render
        const cachedEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
        const cachedFullName = typeof window !== "undefined" ? localStorage.getItem("userFullName") : null;
        if (cachedEmail) {
          setUser({ email: cachedEmail, fullName: cachedFullName || "Streamly Creator" });
        }
        setIsLoading(false);

        // Revalidate in background asynchronously
        try {
          const res = await api.get<User>("/v1/auth/me");
          setUser(res.data);
        } catch (error) {
          clearAuthStorage();
          setUser(null);
          setAccessTokenState(null);
          setRefreshTokenState(null);
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/v1/auth/login", { email, password });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, id, email: userEmail, fullName } = response.data;

      setTokens(newAccessToken, newRefreshToken);
      setAccessTokenState(newAccessToken);
      setRefreshTokenState(newRefreshToken || null);

      const userObj: User = { id, email: userEmail, fullName };
      setUser(userObj);

      // Save name & email to storage for fallback UI display
      if (typeof window !== "undefined") {
        localStorage.setItem("userEmail", userEmail);
        localStorage.setItem("userFullName", fullName);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/v1/auth/register", {
        fullName,
        email,
        password,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, id, email: userEmail, fullName: name } = response.data;

      setTokens(newAccessToken, newRefreshToken);
      setAccessTokenState(newAccessToken);
      setRefreshTokenState(newRefreshToken || null);

      const userObj: User = { id, email: userEmail, fullName: name };
      setUser(userObj);

      if (typeof window !== "undefined") {
        localStorage.setItem("userEmail", userEmail);
        localStorage.setItem("userFullName", name);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const currentRefToken = getRefreshToken();
    if (currentRefToken) {
      try {
        await api.post("/v1/auth/logout", { refreshToken: currentRefToken });
      } catch (err) {
        // Silently swallow logout endpoint errors
      }
    }

    clearAuthStorage();
    setUser(null);
    setAccessTokenState(null);
    setRefreshTokenState(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!user || !!accessToken,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

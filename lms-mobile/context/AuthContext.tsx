import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "../types/user";
import { saveTokens, clearTokens, getAccessToken } from "../lib/storage/tokenStorage";
import { loginRequest, registerRequest, getMeRequest } from "../lib/api/auth";
import { setUnauthorizedHandler } from "../lib/api/client";

type AuthContextType = {
  user: User | null;
  isLoading: boolean; // true while checking for an existing session on app start
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void; // NEW — lets screens (e.g. profile edit) sync a fresh user object into context
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  // If any API call gets a 401, force logout so the app gate redirects to /login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
  }, []);

  // On app start: if we have a stored token, try to hydrate the user
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) {
        try {
          const me = await getMeRequest();
          setUser(me);
        } catch {
          await clearTokens();
          setUser(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest(email, password);
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    const me = await getMeRequest();
    setUser(me);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const tokens = await registerRequest(email, password, name);
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    const me = await getMeRequest();
    setUser(me);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
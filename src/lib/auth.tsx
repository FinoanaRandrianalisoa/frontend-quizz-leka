import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Utilisateur } from "./api";
import { GraphqlError } from "./graphql";

type AuthContextValue = {
  user: Utilisateur | null;
  loading: boolean;
  isAdmin: boolean;
  login: (identifiant: string, password: string) => Promise<void>;
  register: (
    email: string,
    pseudo: string,
    password: string,
    firstName?: string,
    lastName?: string,
    dateNaissance?: string,
    telephone?: string,
    villeOrigine?: string,
    photoProfil?: string,
    photoCouverture?: string,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: Utilisateur | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await api.moi();
      setUser(data.moi);
    } catch (err) {
      if (err instanceof GraphqlError && err.code === "PERMISSION_DENIED") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      }
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (identifiant: string, password: string) => {
    const data = await api.login(identifiant, password);
    localStorage.setItem("access_token", data.login.accessToken);
    localStorage.setItem("refresh_token", data.login.refreshToken);
    setUser(data.login.utilisateur);
  };

  const register = async (
    email: string,
    pseudo: string,
    password: string,
    firstName = "",
    lastName = "",
    dateNaissance = "",
    telephone = "",
    villeOrigine = "",
    photoProfil = "",
    photoCouverture = "",
  ) => {
    const data = await api.register(email, pseudo, password, firstName, lastName, dateNaissance, telephone, villeOrigine, photoProfil, photoCouverture);
    localStorage.setItem("access_token", data.register.accessToken);
    localStorage.setItem("refresh_token", data.register.refreshToken);
    setUser(data.register.utilisateur);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
      refreshUser,
      setUser,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}

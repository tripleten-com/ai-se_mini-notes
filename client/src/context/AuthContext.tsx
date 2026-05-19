import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../../../shared/types";

type AuthContextValue = {
  currentUser: User;
  token: string;
  setToken: (token: string) => void;
  lastActionRef: React.MutableRefObject<string | null>;
};

const demoUser: User = {
  id: "user-1",
  name: "Avery Stone",
  email: "avery@example.com"
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string>("demo-token");
  // TODO: Chapter 2 Lesson 2 - give this ref an explicit string-or-null type.
  const lastActionRef = useRef(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser: demoUser,
      token,
      setToken,
      lastActionRef
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}

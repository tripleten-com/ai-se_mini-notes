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
  email: "avery@example.com",
};

// TODO: Chapter 2 Lesson 4 - create Context with union type AuthContextValue | null
const AuthContext = createContext<any>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string>("demo-token");
  // TODO: Chapter 2 Lesson 3 - give this ref an explicit string-or-null type.
  const lastActionRef = useRef(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser: demoUser,
      token,
      setToken,
      lastActionRef,
    }),
    [token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// TODO: Chapter 2 Lesson 4 - implement the safe custom hook by checking for null
export function useAuth() {
  const value = useContext(AuthContext);
  return value;
}

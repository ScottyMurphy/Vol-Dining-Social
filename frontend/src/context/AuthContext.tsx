import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { getToken, saveToken, deleteToken } from "../lib/tokenStorage";
import { API_URL } from "../lib/config";

type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      let storedToken: string | null = null;

      try {
        storedToken = await getToken();
        if (storedToken) {
          const response = await fetch(`${API_URL}/api/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.status === 401) {
            storedToken = null;
            await deleteToken();
          } else if (!response.ok) {
            throw new Error(`Session validation failed with status ${response.status}`);
          }
        }
      } catch (error) {
        console.error("Failed to restore authentication session:", error);
        storedToken = null;
      } finally {
        if (isMounted) {
          setToken(storedToken);
          setIsLoading(false);
        }
      }
    };

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (newToken: string) => {
    await saveToken(newToken);
    setToken(newToken);
  }, []);

  const signOut = useCallback(async () => {
    await deleteToken();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
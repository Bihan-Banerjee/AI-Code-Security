import { useEffect, useState } from "react";
import { getUsername } from "@/lib/auth";

/** Reactive current-username, updates on login/logout in this or other tabs. */
export function useAuthUser(): string | null {
  const [user, setUser] = useState<string | null>(getUsername());

  useEffect(() => {
    const sync = () => setUser(getUsername());
    sync();
    window.addEventListener("auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}

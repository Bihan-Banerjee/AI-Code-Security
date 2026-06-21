import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { isAuthenticated } from "@/lib/auth";

/** Redirects unauthenticated users to /login, preserving where they came from. */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

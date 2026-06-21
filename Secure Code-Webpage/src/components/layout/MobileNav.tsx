import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, LogOut, UserPlus, X } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { clearAuth } from "@/lib/auth";

export default function MobileNav({
  open,
  onClose,
  username,
}: {
  open: boolean;
  onClose: () => void;
  username: string | null;
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    onClose();
    navigate("/");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            className="glass-strong absolute right-0 top-0 flex h-full w-[78%] max-w-sm flex-col gap-2 p-6"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-gradient">FortiScan</span>
              <button
                aria-label="Close menu"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 text-foreground hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {NAV_ITEMS.map((item, i) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <Link
                  to={item.to}
                  onClick={onClose}
                  className="block rounded-xl px-4 py-3 text-base font-semibold text-foreground/90 transition-colors hover:bg-secondary/60 hover:text-primary"
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}

            <div className="mt-auto flex flex-col gap-3 border-t border-border/50 pt-5">
              {username ? (
                <>
                  <span className="px-1 text-sm text-muted-foreground">
                    Signed in as <span className="font-semibold text-foreground">{username}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 rounded-xl border border-destructive/50 px-4 py-3 font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-semibold hover:border-primary hover:text-primary"
                  >
                    <LogIn className="h-4 w-4" /> Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow"
                  >
                    <UserPlus className="h-4 w-4" /> Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

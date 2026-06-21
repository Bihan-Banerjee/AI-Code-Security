import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "./navItems";
import MobileNav from "./MobileNav";
import ThemeToggle from "@/components/ThemeToggle";
import Magnetic from "@/components/effects/Magnetic";
import { useAuthUser } from "@/hooks/useAuthUser";
import { clearAuth } from "@/lib/auth";

export default function Header() {
  const username = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <header className="glass sticky top-0 z-[100] border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <img
            src="/icon.png"
            alt="FortiScan"
            className="h-9 w-9 transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.7)]"
          />
          <span className="font-display text-xl font-bold text-gradient">FortiScan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? "text-primary" : "text-foreground/80 hover:text-primary"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-primary"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden items-center gap-2 md:flex">
            {username ? (
              <>
                <span className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm">
                  Hi, <span className="font-semibold text-gradient">{username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-destructive/40 text-destructive transition-colors hover:bg-destructive/10"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
                >
                  Sign In
                </Link>
                <Magnetic strength={0.3}>
                  <Link
                    to="/register"
                    className="block rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-shadow hover:shadow-glow-accent"
                  >
                    Get Started
                  </Link>
                </Magnetic>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 text-foreground hover:text-primary md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} username={username} />
    </header>
  );
}

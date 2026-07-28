import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, LogOut, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "./navItems";
import MobileNav from "./MobileNav";
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
    <header className="sticky top-0 z-[100] bg-background/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <img src="/icon.png" alt="FortiScan" className="h-8 w-8" />
          <span className="text-[15px] font-medium uppercase tracking-[0.18em] text-foreground">FortiScan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative text-[12px] font-medium uppercase tracking-[0.12em] transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1.5 left-0 right-0 h-px bg-gradient-primary"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">
            {username ? (
              <>
                <span className="text-[12px] uppercase tracking-[0.1em] text-muted-foreground">
                  {username}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-ghost-grad inline-flex h-9 items-center gap-2 rounded-md px-4 text-[12px] font-medium uppercase tracking-[0.12em]"
                >
                  <LogOut className="h-3.5 w-3.5" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-ghost-grad inline-flex h-9 items-center rounded-md px-5 text-[12px] font-medium uppercase tracking-[0.12em]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-current inline-flex h-9 items-center gap-1.5 rounded-md px-5 text-[12px] font-medium uppercase tracking-[0.12em]"
                >
                  Get Started <ArrowUpRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className="grid h-10 w-10 place-items-center rounded-md border border-border text-foreground md:hidden"
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

import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Compass, ShieldAlert } from "lucide-react";
import Header from "@/components/layout/Header";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />
      <main className="relative flex flex-1 items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong w-full max-w-lg rounded-3xl p-10 text-center"
        >
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <ShieldAlert className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-7xl font-medium text-gradient">404</h1>
          <p className="mt-3 text-xl font-medium">Page not found</p>
          <p className="mt-2 text-muted-foreground">
            The page you're looking for has moved, been secured away, or never existed.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 font-medium text-primary-foreground shadow-glow"
            >
              <Home className="h-4 w-4" /> Back home
            </Link>
            <Link
              to="/scanner"
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-6 py-3 font-medium transition-colors hover:border-primary/60 hover:text-primary"
            >
              <Compass className="h-4 w-4" /> Go to scanner
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default NotFound;

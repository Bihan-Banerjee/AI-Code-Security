import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";

/** Centered glass-card shell shared by the auth pages. */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />
      <main className="relative flex flex-1 items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

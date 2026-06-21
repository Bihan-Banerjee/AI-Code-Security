import type { ReactNode } from "react";
import CustomCursor from "@/components/effects/CustomCursor";
import ScrollProgress from "@/components/effects/ScrollProgress";
import { useLenis } from "@/hooks/useLenis";

/** App-wide chrome: smooth scroll, scroll progress bar, and the custom cursor. */
export default function Layout({ children }: { children: ReactNode }) {
  useLenis();
  return (
    <>
      <ScrollProgress />
      <CustomCursor />
      {children}
    </>
  );
}

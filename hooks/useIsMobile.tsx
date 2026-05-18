"use client";
import { useState, useEffect, createContext, useContext, type ReactNode } from "react";

/**
 * Seeded initial value so the server can render the correct layout from a
 * User-Agent hint, avoiding the "desktop UI flashes on mweb refresh" bug.
 * Defaults to false (desktop) when no provider wraps the tree.
 */
const InitialMobileContext = createContext<boolean>(false);

export function MobileHintProvider({ initial, children }: { initial: boolean; children: ReactNode }) {
  return <InitialMobileContext.Provider value={initial}>{children}</InitialMobileContext.Provider>;
}

export function useIsMobile(breakpoint = 768): boolean {
  const seeded = useContext(InitialMobileContext);
  const [isMobile, setIsMobile] = useState(seeded);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

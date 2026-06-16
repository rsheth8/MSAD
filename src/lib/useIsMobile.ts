"use client";

import { useEffect, useState } from "react";

/** Touch / small-screen devices: no hover OR a narrow viewport. */
const MOBILE_QUERY = "(hover: none), (max-width: 768px)";

/**
 * True on phones / touch devices. SSR-safe: returns false until mounted so the
 * server and first client render agree, then resolves on the client. Used to
 * shed expensive per-frame work (WebGL backdrop, JS auto-scroll) on mobile.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

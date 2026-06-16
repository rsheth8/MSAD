"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useIsMobile } from "@/lib/useIsMobile";

const DRAG_THRESHOLD = 4;

const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, label, [role='button'], [role='link'], [role='option']";

function wrapScroll(el: HTMLDivElement) {
  const half = el.scrollWidth / 2;
  if (half <= 0) return;
  if (el.scrollLeft >= half) el.scrollLeft -= half;
  else if (el.scrollLeft <= 0) el.scrollLeft += half;
}

/**
 * Horizontal auto-scrolling lane.
 * - Desktop: JS-driven scroll on a native (accent-styled) scrollbar, with
 *   drag-to-scroll and pause-on-hover.
 * - Mobile: a GPU-composited CSS transform marquee (the `loop` content is
 *   duplicated by the caller, so it translates -50% seamlessly). This runs on
 *   the compositor thread, so it stays smooth even when the main thread is busy
 *   — unlike JS-driven scrollLeft, which stutters on phones. Pauses on touch.
 */
export function HorizontalScrollLane({
  children,
  className = "",
  contentClassName = "",
  autoSpeed,
  durationSec,
  loop = false,
  pauseOnHover = true,
  draggable = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Pixels advanced per animation frame when auto-scrolling. */
  autoSpeed?: number;
  /** Seconds for one full loop (half scroll width); overrides autoSpeed when set. */
  durationSec?: number;
  loop?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  /** Auto-scroll speed in pixels per *second* (time-based, refresh-rate independent). */
  const speedRef = useRef(0);
  const [grabbing, setGrabbing] = useState(false);
  /** Seconds for the mobile CSS marquee to travel one copy (translateX -50%). */
  const [marqueeDuration, setMarqueeDuration] = useState(0);
  const [touchPaused, setTouchPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isMobile = useIsMobile();

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const half = track.scrollWidth / 2; // one duplicated copy = the -50% travel
    if (durationSec) {
      speedRef.current = half > 0 ? half / durationSec : 0;
      setMarqueeDuration(durationSec);
    } else if (autoSpeed != null) {
      // autoSpeed is authored as px-per-frame at 60fps; normalize to px-per-second.
      const pxPerSec = autoSpeed * 60;
      speedRef.current = pxPerSec;
      setMarqueeDuration(half > 0 && pxPerSec > 0 ? half / pxPerSec : 0);
    }
  }, [autoSpeed, durationSec]);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [measure, children]);

  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Desktop only: JS-driven auto-scroll (mobile uses the CSS marquee below).
  useEffect(() => {
    if (isMobile || reduceMotion) return;
    const el = scrollRef.current;
    if (!el) return;

    let raf = 0;
    let last = 0;
    // Authoritative float position so sub-pixel motion isn't lost to scrollLeft rounding.
    let pos = el.scrollLeft;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (!last) {
        last = now;
        return;
      }
      // Seconds since last frame, clamped so a backgrounded tab doesn't jump on return.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const speed = speedRef.current;
      if (!speed || paused.current || dragging.current) {
        // Stay in sync with manual drags while not auto-advancing.
        pos = el.scrollLeft;
        return;
      }
      pos += speed * dt;
      el.scrollLeft = pos;
      if (loop) {
        wrapScroll(el);
        pos = el.scrollLeft;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loop, isMobile, reduceMotion]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || isMobile) return; // mobile is the CSS marquee, no drag
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    const el = scrollRef.current;
    if (!el) return;
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    startScroll.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    setGrabbing(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || !dragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > DRAG_THRESHOLD) moved.current = true;
    el.scrollLeft = startScroll.current - dx;
    if (loop) wrapScroll(el);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setGrabbing(false);
    scrollRef.current?.releasePointerCapture?.(e.pointerId);
  };

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!moved.current) return;
    e.preventDefault();
    e.stopPropagation();
    moved.current = false;
  };

  // Mobile marquee is active only when we have a measured duration and the user
  // hasn't asked to reduce motion; otherwise mobile falls back to native swipe.
  const mobileMarquee = isMobile && loop && !reduceMotion && marqueeDuration > 0;

  return (
    <div className={className}>
      <div
        ref={scrollRef}
        onMouseEnter={() => pauseOnHover && (paused.current = true)}
        onMouseLeave={() => pauseOnHover && (paused.current = false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onTouchStart={() => mobileMarquee && setTouchPaused(true)}
        onTouchEnd={() => mobileMarquee && setTouchPaused(false)}
        onTouchCancel={() => mobileMarquee && setTouchPaused(false)}
        className={`scroll-lane ${mobileMarquee ? "overflow-hidden" : "overflow-x-auto"} ${
          !isMobile && draggable ? (grabbing ? "cursor-grabbing select-none" : "cursor-grab") : ""
        }`}
        style={{
          // Marquee: let vertical page scroll through. Native mobile lane: allow
          // horizontal swipe. Desktop drag: keep vertical panning to the page.
          touchAction: mobileMarquee ? "pan-y" : isMobile ? "pan-x pan-y" : draggable ? "pan-y" : undefined,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          ref={trackRef}
          className={`${contentClassName} w-max`}
          style={
            mobileMarquee
              ? {
                  animationName: "lane-marquee",
                  animationDuration: `${marqueeDuration}s`,
                  animationTimingFunction: "linear",
                  animationIterationCount: "infinite",
                  animationPlayState: touchPaused ? "paused" : "running",
                  willChange: "transform",
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

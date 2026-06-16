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

const DRAG_THRESHOLD = 4;

const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, label, [role='button'], [role='link'], [role='option']";

function wrapScroll(el: HTMLDivElement) {
  const half = el.scrollWidth / 2;
  if (half <= 0) return;
  if (el.scrollLeft >= half) el.scrollLeft -= half;
  else if (el.scrollLeft <= 0) el.scrollLeft += half;
}

/** Horizontal auto-scrolling lane with the native (accent-styled) scrollbar. */
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
  const paused = useRef(false);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  /** Auto-scroll speed in pixels per *second* (time-based, refresh-rate independent). */
  const speedRef = useRef(0);
  const [grabbing, setGrabbing] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (durationSec) {
      const half = el.scrollWidth / 2;
      // Cover half the scroll width once per durationSec → px per second.
      speedRef.current = half > 0 ? half / durationSec : 0;
    } else if (autoSpeed != null) {
      // autoSpeed is authored as px-per-frame at 60fps; normalize to px-per-second.
      speedRef.current = autoSpeed * 60;
    }
  }, [autoSpeed, durationSec]);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

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
        // Stay in sync with manual drags / native scrolling while not auto-advancing.
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
  }, [loop]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
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
        className={`scroll-lane overflow-x-auto ${
          draggable ? (grabbing ? "cursor-grabbing select-none" : "cursor-grab") : ""
        } ${contentClassName}`}
        style={{ touchAction: draggable ? "pan-y" : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

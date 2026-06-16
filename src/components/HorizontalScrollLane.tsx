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
  const [frameSpeed, setFrameSpeed] = useState(autoSpeed ?? 0);
  const [grabbing, setGrabbing] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (durationSec) {
      const half = el.scrollWidth / 2;
      setFrameSpeed(half > 0 ? half / (durationSec * 60) : 0);
    } else if (autoSpeed != null) {
      setFrameSpeed(autoSpeed);
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
    if (!frameSpeed) return;
    const el = scrollRef.current;
    if (!el) return;
    const reduce =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = 0;
    const step = () => {
      if (!paused.current && !dragging.current) {
        el.scrollLeft += frameSpeed;
        if (loop) wrapScroll(el);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [frameSpeed, loop]);

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

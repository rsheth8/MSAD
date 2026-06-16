"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BRAND, MSAD_EVENTS } from "@/lib/brand";

const BG_LIGHT = new THREE.Color("#f4f5f7");
const BG_DARK = new THREE.Color("#0f1114");
const UP = new THREE.Color("#15803d");
const DOWN = new THREE.Color("#dc2626");

const MAX_POINTS = 48;

/** Custom event other components can dispatch to make the field pulse on live data. */
export const MARKET_PULSE_EVENT = MSAD_EVENTS.marketPulse;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uMotion;
  uniform float uDark;
  uniform float uAspect;
  uniform float uPulse;
  uniform float uTrend;     // -1..1 period performance
  uniform int   uLen;       // number of valid points in uSeries
  uniform float uSeries[${MAX_POINTS}]; // normalized 0..1 price path
  uniform vec3  uAccent;
  uniform vec3  uBg;
  uniform vec3  uUp;
  uniform vec3  uDown;

  // piecewise-smooth sample of the price path at x in [0,1]
  float sampleCurve(float x) {
    float n = float(uLen);
    float t = clamp(x, 0.0, 1.0) * (n - 1.0);
    float y = uSeries[0];
    for (int i = 0; i < ${MAX_POINTS} - 1; i++) {
      if (i >= uLen - 1) break;
      if (t >= float(i) && t <= float(i + 1)) {
        float s = smoothstep(0.0, 1.0, t - float(i));
        y = mix(uSeries[i], uSeries[i + 1], s);
      }
    }
    return y;
  }

  void main() {
    vec2 uv = vUv;
    bool dark = uDark > 0.5;

    // gentle full-viewport vignette (fixed bg behind a scrolling page)
    vec2 vc = (uv - 0.5) * vec2(uAspect, 1.0);
    float vig = 1.0 - smoothstep(0.6, 1.3, length(vc));

    vec3 col = uBg;

    // trend-tinted line color, blended toward the user accent
    float trend01 = smoothstep(-0.015, 0.015, uTrend);
    vec3 lineCol = mix(mix(uDown, uUp, trend01), uAccent, 0.45);
    vec3 pastel = mix(uAccent, vec3(1.0), dark ? 0.5 : 0.4);

    // soft corner depth glow (dark only) so the field isn't a flat black
    if (dark) {
      float h = smoothstep(1.1, 0.0, length((uv - vec2(0.82, 0.72)) * vec2(uAspect, 1.0)));
      col += pastel * h * 0.05;
    }

    // ------------------------------------------------------------------
    // The living price line (real data) — one clean, crisp stroke
    // ------------------------------------------------------------------
    float curve = sampleCurve(uv.x);
    float yLine = mix(0.30, 0.74, curve);
    float dist = uv.y - yLine;
    float adist = abs(dist);

    // subtle gradient fill beneath the line
    float fill = (dist < 0.0) ? (1.0 - clamp(-dist / 0.5, 0.0, 1.0)) : 0.0;
    fill = fill * fill;
    col = mix(col, lineCol, fill * (dark ? 0.13 : 0.06) * vig);

    // tight glow + crisp bright core
    float glow = smoothstep(0.05, 0.0, adist);
    float core = smoothstep(0.0035, 0.0, adist);
    float breathe = 0.9 + 0.1 * sin(uTime * 0.4) * uMotion;
    col += lineCol * glow * glow * ((dark ? 0.42 : 0.16) + uPulse * 0.3) * breathe * vig;
    col = mix(col, mix(lineCol, vec3(1.0), 0.4), core * (dark ? 0.95 : 0.85) * vig);

    // a single soft glint travelling slowly along the stroke — calm sign of life
    float glintPos = fract(uTime * 0.05 * uMotion);
    float glint = smoothstep(0.22, 0.0, abs(uv.x - glintPos));
    col += mix(lineCol, vec3(1.0), 0.6) * core * glint * (dark ? 0.5 : 0.3) * vig;

    // keep the very edges clean
    col = mix(uBg, col, vig);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function hexToColor(hex: string) {
  const c = new THREE.Color();
  c.set(hex);
  return c;
}

/** Normalize an indexed price path into a 0..1 array padded to MAX_POINTS. */
function buildSeriesUniform(series?: number[]): { data: number[]; len: number; trend: number } {
  let pts = series && series.length >= 2 ? series.slice(0, MAX_POINTS) : null;
  if (!pts) {
    // calm generated fallback so the field is alive without a stock loaded
    pts = Array.from({ length: 24 }, (_, i) => {
      const t = i / 23;
      return 0.5 + Math.sin(t * 6.2) * 0.12 + t * 0.18;
    });
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const norm = pts.map((v) => (v - min) / span);
  const trend = pts[pts.length - 1] - pts[0];
  const trendNorm = Math.max(-1, Math.min(1, trend / (Math.abs(pts[0]) || 1)));
  const data = new Array(MAX_POINTS).fill(0);
  for (let i = 0; i < norm.length; i++) data[i] = norm[i];
  return { data, len: norm.length, trend: trendNorm };
}

function ClearColor({ isDark }: { isDark: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(isDark ? BG_DARK : BG_LIGHT, 1);
  }, [gl, isDark]);
  return null;
}

function BackgroundPlane({
  accent,
  isDark,
  motionEnabled,
  series,
  pulseRef,
}: {
  accent: string;
  isDark: boolean;
  motionEnabled: boolean;
  series?: number[];
  pulseRef: React.RefObject<number>;
}) {
  const accentTarget = useMemo(() => hexToColor(accent), [accent]);
  const bgTarget = useMemo(() => (isDark ? BG_DARK : BG_LIGHT).clone(), [isDark]);
  const seriesU = useMemo(() => buildSeriesUniform(series), [series]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uDark: { value: 0 },
          uAspect: { value: 1 },
          uPulse: { value: 0 },
          uTrend: { value: 0 },
          uLen: { value: seriesU.len },
          uSeries: { value: seriesU.data },
          uAccent: { value: accentTarget.clone() },
          uBg: { value: bgTarget.clone() },
          uUp: { value: UP.clone() },
          uDown: { value: DOWN.clone() },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // animate the price path / trend toward the latest data
  const trendRef = useRef(seriesU.trend);
  useEffect(() => {
    material.uniforms.uSeries.value = seriesU.data;
    material.uniforms.uLen.value = seriesU.len;
    trendRef.current = seriesU.trend;
  }, [seriesU, material]);

  useFrame((state, delta) => {
    material.uniforms.uTime.value += motionEnabled ? delta : delta * 0.15;
    material.uniforms.uMotion.value = motionEnabled ? 1 : 0;
    material.uniforms.uDark.value = isDark ? 1 : 0;
    material.uniforms.uAspect.value = state.size.width / Math.max(state.size.height, 1);

    pulseRef.current *= Math.exp(-delta * 1.8);
    material.uniforms.uPulse.value = pulseRef.current;

    const cur = material.uniforms.uTrend.value as number;
    material.uniforms.uTrend.value = cur + (trendRef.current - cur) * 0.04;

    (material.uniforms.uAccent.value as THREE.Color).lerp(accentTarget, 0.05);
    (material.uniforms.uBg.value as THREE.Color).lerp(bgTarget, 0.08);
  });

  return (
    <mesh frustumCulled={false} renderOrder={0}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function useThemeDark() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsDark(document.documentElement.dataset.theme === "dark");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * Full-viewport "living data" backdrop. Renders the stock's real price path as a
 * glowing line with a gradient fill and particles streaming along it, over a calm
 * aurora haze + faint grid. Works in light and dark. Pass `series` (indexed price
 * points) to drive the line; dispatch `MARKET_PULSE_EVENT` to pulse on live data.
 */
export default function SceneBackground({
  accent = BRAND.accent,
  series,
}: {
  accent?: string;
  series?: number[];
}) {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const isDark = useThemeDark();
  const pulseRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionEnabled(!mq.matches);
    const onChange = () => setMotionEnabled(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onPulse = () => {
      pulseRef.current = Math.min(1, pulseRef.current + 0.85);
    };
    window.addEventListener(MARKET_PULSE_EVENT, onPulse);
    return () => window.removeEventListener(MARKET_PULSE_EVENT, onPulse);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden
    >
      <Canvas
        className="block h-full w-full"
        orthographic
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%" }}
      >
        <ClearColor isDark={isDark} />
        <BackgroundPlane
          accent={accent}
          isDark={isDark}
          motionEnabled={motionEnabled}
          series={series}
          pulseRef={pulseRef}
        />
      </Canvas>
    </div>
  );
}

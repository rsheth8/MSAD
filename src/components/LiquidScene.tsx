"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BRAND } from "@/lib/brand";

/**
 * Production iridescent-liquid backdrop. Floating metaball blobs (which merge
 * and split as they drift — the "collide" look) are each filled with flowing
 * spectral iridescence: domain-warped flow for real liquid motion, an
 * Alan-Zucconi spectral approximation for true oil-on-water rainbow, and a
 * droplet normal from the blob field for 3D shading + rainbow-lit rims. Colour
 * is biased toward the sentiment hue (up → green-cast, down → red, flat → gold)
 * without killing the iridescence.
 *
 * Dials: IRID_STRENGTH = rainbow saturation/strength, IRID_SHIMMER = wet glint.
 */
const IRID_STRENGTH = 0.85;
const IRID_SHIMMER = 1.1;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform float uTrend;
  uniform float uVol;
  uniform float uDark;
  uniform vec3 uAccent;
  uniform float uIridStrength;
  uniform float uIridShimmer;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm5(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
  float fbm3(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<3;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

  // Alan Zucconi's 6-bump spectral approximation: w in [0,1] -> realistic rainbow.
  // This is what makes the iridescence read as real spectral colour, not neon cosine.
  vec3 bump3(vec3 x, vec3 yo){ vec3 y = vec3(1.0) - x*x; return clamp(y - yo, 0.0, 1.0); }
  vec3 spectral(float w){
    w = clamp(w, 0.0, 1.0);
    vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
    vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
    vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
    vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
    vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
    vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
    return bump3(c1 * (w - x1), y1) + bump3(c2 * (w - x2), y2);
  }

  vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }

  // Generalised metaball: k=2 round, >2 boxy, <2 diamond. Returns a falloff field.
  float blob(vec2 p, vec2 c, float rot, vec2 scl, float r, float k){
    vec2 d = p - c;
    float cs = cos(rot), sn = sin(rot);
    d = mat2(cs, -sn, sn, cs) * d;
    d /= scl;
    float m = (k > 1.99 && k < 2.01)
      ? dot(d, d)
      : pow(pow(abs(d.x), k) + pow(abs(d.y), k), 2.0 / k);
    return r / (m + 0.0009);
  }

  // Summed field of drifting blobs — they merge/split as they cross (metaballs).
  // Every blob is round (k=2) so the field reads as true surface-tension liquid;
  // variety comes from anisotropic scale + rotation, which makes elliptical merges.
  float fieldAt(vec2 p){
    float t = uTime * (0.10 + uVol * 0.22);
    float s = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 c = 0.33 * vec2(sin(t*(0.40+fi*0.11)+fi*1.9), cos(t*(0.34+fi*0.09)+fi*2.7));
      float rot = t * (0.18 + fi * 0.05) + fi * 1.3;
      vec2 scl = vec2(1.0 + 0.55*sin(fi*1.7), 1.0 - 0.40*sin(fi*1.7)) * (0.48 + 0.12*sin(t*0.6+fi));
      s += blob(p, c, rot, scl, 0.026 + 0.012*sin(t*0.8+fi), 2.0);
    }
    for (int j = 0; j < 3; j++) {
      float fj = float(j);
      vec2 c = 0.52 * vec2(sin(t*(0.9+fj*0.3)+fj*4.1), cos(t*(1.1+fj*0.25)+fj*2.0));
      s += blob(p, c, t*0.2+fj, vec2(0.6 + 0.28*sin(t+fj)), 0.012 + 0.005*sin(t*1.3+fj), 2.0);
    }
    return s;
  }

  // Flowing displacement of the sampling space — makes the blob *surfaces* ripple
  // and bulge like real fluid (surface tension) instead of sliding on fixed paths.
  vec2 shapeFlow(vec2 p){
    float st = uTime * 0.09;
    float a = fbm3(p * 1.7 + vec2(0.0, st));
    float b = fbm3(p * 1.7 + vec2(4.3, 9.1) - vec2(0.0, st * 0.8));
    return (vec2(a, b) - 0.5);
  }

  // Two-level domain warp -> flowing liquid colour coordinates (IQ technique).
  vec2 warp(vec2 p, float t, out vec2 q){
    q = vec2(
      fbm3(p + vec2(0.0, 0.0) + vec2( 0.20 * t, 0.0)),
      fbm3(p + vec2(5.2, 1.3) + vec2(-0.16 * t, 0.0))
    );
    vec2 r = vec2(
      fbm3(p + 1.7 * q + vec2(1.7, 9.2) + vec2( 0.24 * t, 0.0)),
      fbm3(p + 1.7 * q + vec2(8.3, 2.8) + vec2(-0.20 * t, 0.0))
    );
    return r;
  }

  void main(){
    bool dark = uDark > 0.5;
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    float t = uTime * (0.5 + uVol * 0.7);

    // --- SHAPE: drifting/merging metaball blobs, surface warped to flow ---
    vec2 pf = p + shapeFlow(p) * (0.10 + uVol * 0.05);
    float field = fieldAt(pf);

    // One continuous surface from the field gradient — no inner dome layer.
    float fe = 0.0022;
    float fx = fieldAt(pf + vec2(fe, 0.0)) - field;
    float fy = fieldAt(pf + vec2(0.0, fe)) - field;
    vec3 N = normalize(vec3(-fx, -fy, fe * 7.5));

    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(vec3(0.38, 0.52, 0.76));
    vec3 Hn = normalize(L + V);
    float ndotl = max(dot(N, L), 0.0);
    float ndotv = max(dot(N, V), 0.0);
    float fres = pow(1.0 - ndotv, 4.0);
    float spec = pow(max(dot(N, Hn), 0.0), 52.0);

    // --- COLOUR: iridescence painted onto the same surface (not a second layer) ---
    vec2 fp = p * 1.25;
    vec2 q;
    vec2 r = warp(fp, t, q);
    float flow = fbm5(fp + 1.8 * r);

    // Thin-film colour from flowing marbling only — never from field height,
    // which paints concentric isobands (the "stacked inner circle" look).
    float thick = flow * 0.62 + length(q) * 0.28 + length(r) * 0.18 + dot(fp, vec2(0.62, 0.48)) * 0.14 + fract(t * 0.04);
    vec3 irid = mix(spectral(fract(thick)), spectral(fract(thick * 0.47 + 0.31)), 0.32);
    float lum = dot(irid, vec3(0.299, 0.587, 0.114));
    irid = mix(irid, vec3(1.0), smoothstep(0.68, 1.0, lum) * 0.14);

    float trend01 = smoothstep(-0.5, 0.5, uTrend);
    vec3 cDown = vec3(0.95, 0.35, 0.32);
    vec3 cFlat = vec3(0.98, 0.78, 0.35);
    vec3 cUp = mix(uAccent, vec3(0.30, 0.85, 0.55), 0.40);
    vec3 tint = trend01 < 0.5 ? mix(cDown, cFlat, trend01 * 2.0) : mix(cFlat, cUp, (trend01 - 0.5) * 2.0);
    irid = mix(irid, irid * tint * 1.4, 0.16 * uIridStrength + 0.08);

    // Natural 3D shading from light + viewing angle on the curved surface.
    float shade = mix(0.76, 1.0, ndotl) * mix(0.90, 1.0, ndotv);
    vec3 body = irid * shade * (0.62 + 0.58 * lum) * (0.72 + 0.48 * uIridStrength);
    body += spec * (0.35 + 0.55 * fres) * uIridShimmer;
    body += irid * fres * 0.10;

    // --- BACKGROUND ---
    vec3 deep = dark ? vec3(0.030, 0.035, 0.052) : vec3(0.950, 0.957, 0.965);
    float bgrad = 1.0 - length((uv - vec2(0.5, 0.55)) * vec2(uAspect, 1.0)) * 0.5;
    deep *= 0.92 + 0.12 * bgrad;
    vec3 bg = mix(deep, mix(deep, irid, 0.10), dark ? 0.55 : 0.28);

    // --- COMPOSITE: single clean boundary, no stacked inner/outer rings ---
    float w = max(fwidth(field), 0.0006);
    float a = smoothstep(0.97 - 1.2 * w, 0.97 + 1.2 * w, field);
    vec3 col = mix(bg, body, a);

    col = mix(col, aces(col * 1.04), dark ? 0.42 : 0.16);
    float vig = smoothstep(1.4, 0.30, length((uv - 0.5) * vec2(uAspect, 1.0)));
    col *= 0.92 + 0.08 * vig;

    vec2 fc = gl_FragCoord.xy;
    float dth = hash(fc + fract(uTime)) + hash(fc + 11.3 - fract(uTime)) - 1.0;
    col += dth * (1.3 / 255.0);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function ClearColor({ isDark }: { isDark: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(isDark ? "#0f1114" : "#f4f5f7", 1);
  }, [gl, isDark]);
  return null;
}

function Plane({
  trend,
  volatility,
  isDark,
  accent,
}: {
  trend: number;
  volatility: number;
  isDark: boolean;
  accent: string;
}) {
  const accentC = useMemo(() => new THREE.Color(accent), [accent]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uTrend: { value: trend },
          uVol: { value: volatility },
          uDark: { value: isDark ? 1 : 0 },
          uAccent: { value: accentC.clone() },
          uIridStrength: { value: IRID_STRENGTH },
          uIridShimmer: { value: IRID_SHIMMER },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const trendRef = useRef(trend);
  const volRef = useRef(volatility);
  trendRef.current = trend;
  volRef.current = volatility;

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.uTime.value += delta;
    u.uAspect.value = state.size.width / Math.max(state.size.height, 1);
    // ease toward the latest sentiment so trend changes glide
    u.uTrend.value += (trendRef.current - (u.uTrend.value as number)) * 0.05;
    u.uVol.value += (volRef.current - (u.uVol.value as number)) * 0.05;
    u.uDark.value = isDark ? 1 : 0;
    (u.uAccent.value as THREE.Color).lerp(accentC, 0.08);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function useThemeDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.dataset.theme === "dark");
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

/** Derive a -1..1 trend and 0..1 volatility from an indexed price series. */
function deriveFromSeries(series?: number[]): { trend?: number; volatility?: number } {
  if (!series || series.length < 2) return {};
  const first = series[0];
  const last = series[series.length - 1];
  const trend = Math.max(-1, Math.min(1, (last - first) / (Math.abs(first) || 1)));
  const rets: number[] = [];
  let mean = 0;
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1] || 1;
    const r = (series[i] - series[i - 1]) / Math.abs(prev);
    rets.push(r);
    mean += r;
  }
  mean /= rets.length;
  let variance = 0;
  for (const r of rets) variance += (r - mean) ** 2;
  variance /= Math.max(rets.length, 1);
  const sd = Math.sqrt(variance);
  const volatility = Math.max(0, Math.min(1, sd * 26));
  return { trend, volatility };
}

/**
 * Full-viewport iridescent backdrop. Drop one per page. Pass `series` (indexed
 * price points) on a stock page to make the cast reflect that stock; on neutral
 * pages it leans to a calm, brand-positive tone.
 */
export default function LiquidScene({
  accent = BRAND.accent,
  series,
  trend,
  volatility,
}: {
  accent?: string;
  series?: number[];
  trend?: number;
  volatility?: number;
}) {
  const isDark = useThemeDark();
  const derived = useMemo(() => deriveFromSeries(series), [series]);
  const t = trend ?? derived.trend ?? 0.16;
  const v = volatility ?? derived.volatility ?? 0.22;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden
    >
      <Canvas
        className="block h-full w-full"
        orthographic
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%" }}
      >
        <ClearColor isDark={isDark} />
        <Suspense fallback={null}>
          <Plane trend={t} volatility={v} isDark={isDark} accent={accent} />
        </Suspense>
      </Canvas>
    </div>
  );
}

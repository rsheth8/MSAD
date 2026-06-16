"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { BgProps } from "./types";

const MAX_POINTS = 48;

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
  uniform float uAspect;
  uniform float uSeed;
  uniform float uTrend;
  uniform float uColorTrend;
  uniform float uVol;
  uniform float uDark;
  uniform vec2  uMouse;
  uniform vec3  uAccent;
  uniform vec3  uBg;
  uniform vec3  uUp;
  uniform vec3  uDown;
  uniform int   uLen;
  uniform float uSeries[${MAX_POINTS}];

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

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

  vec3 sentiment(float trend01) {
    vec3 cDown = uDown;
    vec3 cFlat = vec3(0.90, 0.66, 0.18);
    vec3 cUp = mix(uAccent, uUp, 0.35);
    return trend01 < 0.5
      ? mix(cDown, cFlat, trend01 * 2.0)
      : mix(cFlat, cUp, (trend01 - 0.5) * 2.0);
  }

  // Oblique ground-plane coords — terrain recedes toward the horizon
  vec2 groundPlane(vec2 uv) {
    vec2 vc = (uv - 0.5) * vec2(uAspect, 1.0);
    vec2 parallax = (uMouse - 0.5) * vec2(0.025, 0.015);
    vc += parallax;
    float tilt = 0.52;
    vec2 gp = vec2(vc.x, vc.y / tilt + vc.x * 0.22);
    gp *= 1.38;
    return gp;
  }

  float terrainHeight(vec2 gp, float time) {
    float churn = 0.35 + uVol * 1.1;
    vec2 p = gp + uSeed * 4.0;

    vec2 q = vec2(
      fbm(p * 0.9 + vec2(0.0, time * 0.04)),
      fbm(p * 0.9 + vec2(5.2, -time * 0.03))
    );
    vec2 r = p + (q - 0.5) * churn * 0.55;
    float h = fbm(r * vec2(1.05, 0.82) + vec2(time * 0.025, 0.0));
    h += fbm(r * 2.4 - time * 0.02) * 0.28;

    if (uLen > 1) {
      float x01 = clamp(gp.x / max(uAspect, 0.5) * 0.5 + 0.5, 0.0, 1.0);
      float ridge = sampleCurve(x01);
      float crestY = mix(-0.15, 0.55, ridge);
      h += exp(-pow((gp.y - crestY) * 2.8, 2.0)) * 0.42;
      h += ridge * 0.18;
    }

    h += uTrend * 0.1;
    return h;
  }

  void main() {
    bool dark = uDark > 0.5;
    vec2 uv = vUv;
    vec2 vc = (uv - 0.5) * vec2(uAspect, 1.0);

    float trend01 = smoothstep(-0.5, 0.5, uColorTrend);
    vec3 tint = sentiment(trend01);

    float time = uTime * (0.35 + uVol * 0.55);
    vec2 gp = groundPlane(uv);
    float h = terrainHeight(gp, time);

    // surface normal for hillshade
    float e = 0.011;
    float hx = terrainHeight(gp + vec2(e, 0.0), time) - h;
    float hy = terrainHeight(gp + vec2(0.0, e), time) - h;
    vec3 normal = normalize(vec3(-hx * 2.4, -hy * 2.4, 1.0));

    vec3 lightDir = normalize(vec3(0.42, 0.28, 0.86));
    float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);
    float shade = mix(0.38, 1.0, diffuse);

    // depth fog — farther (higher gp.y) fades toward background
    float depth = smoothstep(-0.55, 0.95, gp.y);
    float fog = mix(1.0, 0.55, depth * depth);

    vec3 col = uBg;

    // height + lit surface wash (short-span sentiment tint)
    vec3 surface = mix(uBg, mix(uBg, tint, dark ? 0.42 : 0.22), h);
    surface *= shade;
    col = mix(col, surface, fog * (dark ? 0.55 : 0.30));

    // contour bands — wider + darker strokes in light mode for readability
    float bands = 10.0 + uVol * 4.0;
    float v = h * bands;
    float minorW = dark ? 0.032 : 0.048;
    float majorW = dark ? 0.048 : 0.064;
    float minor = 1.0 - smoothstep(0.0, minorW + uVol * 0.012, abs(fract(v) - 0.5) * 2.0);
    float major = 1.0 - smoothstep(0.0, majorW, abs(fract(v / 5.0) - 0.5) * 2.0);
    float lines = minor * (dark ? 0.38 : 0.62) + major * 0.95;

    float lineAlpha = (dark ? 0.34 : 0.58) * (1.0 + uVol * 0.12);
    vec3 lineInk = vec3(0.11, 0.13, 0.17);
    vec3 lineCol = dark
      ? mix(tint, vec3(1.0), (1.0 - shade) * 0.35)
      : mix(lineInk, tint * 0.5, 0.25);
    col += lineCol * lines * lineAlpha * fog;

    // embossed shadow on lee side of major contours
    col -= (dark ? vec3(0.04) : vec3(0.018)) * major * (1.0 - shade) * lineAlpha * fog;

    // specular glint on sun-facing slopes
    vec3 halfDir = normalize(lightDir + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(normal, halfDir), 0.0), 24.0) * h;
    col += mix(tint, vec3(1.0), 0.6) * spec * (dark ? 0.08 : 0.04) * fog;

    // slow scan along major contours
    float scan = fract(v / 5.0 + uTime * 0.04 * (0.5 + uVol));
    float glint = (1.0 - smoothstep(0.0, 0.06, abs(scan - 0.5) * 2.0)) * major;
    col += mix(tint, vec3(1.0), 0.55) * glint * (dark ? 0.14 : 0.05) * fog;

    if (dark) {
      vec3 pastel = mix(uAccent, vec3(1.0), 0.55);
      float corner = smoothstep(1.1, 0.0, length((uv - vec2(0.82, 0.72)) * vec2(uAspect, 1.0)));
      col += pastel * corner * 0.03;
    }

    float vig = 1.0 - smoothstep(0.62, 1.38, length(vc));
    col = mix(uBg, col, vig);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

const BG_LIGHT = new THREE.Color("#f4f5f7");
const BG_DARK = new THREE.Color("#0f1114");
const UP = new THREE.Color("#15803d");
const DOWN = new THREE.Color("#dc2626");

function hexToColor(hex: string) {
  const c = new THREE.Color();
  c.set(hex);
  return c;
}

function buildSeriesUniform(series?: number[]): { data: number[]; len: number } {
  let pts = series && series.length >= 2 ? series.slice(0, MAX_POINTS) : null;
  if (!pts) {
    return { data: new Array(MAX_POINTS).fill(0), len: 0 };
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const norm = pts.map((v) => (v - min) / span);
  const data = new Array(MAX_POINTS).fill(0);
  for (let i = 0; i < norm.length; i++) data[i] = norm[i];
  return { data, len: norm.length };
}

function Plane({
  seed,
  trend,
  colorTrend,
  volatility,
  isDark,
  accent,
  mouseRef,
  series,
}: BgProps & { series?: number[]; colorTrend: number }) {
  const accentC = useMemo(() => hexToColor(accent), [accent]);
  const bgC = useMemo(() => (isDark ? BG_DARK : BG_LIGHT).clone(), [isDark]);
  const seriesU = useMemo(() => buildSeriesUniform(series), [series]);
  const mouseSmoothed = useRef({ x: 0.5, y: 0.5 });

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
          uSeed: { value: seed },
          uTrend: { value: trend },
          uColorTrend: { value: colorTrend },
          uVol: { value: volatility },
          uDark: { value: isDark ? 1 : 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uAccent: { value: accentC.clone() },
          uBg: { value: bgC.clone() },
          uUp: { value: UP.clone() },
          uDown: { value: DOWN.clone() },
          uLen: { value: seriesU.len },
          uSeries: { value: seriesU.data },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const trendRef = useRef(trend);
  const colorTrendRef = useRef(colorTrend);
  const volRef = useRef(volatility);
  trendRef.current = trend;
  colorTrendRef.current = colorTrend;
  volRef.current = volatility;

  useEffect(() => {
    material.uniforms.uSeries.value = seriesU.data;
    material.uniforms.uLen.value = seriesU.len;
  }, [seriesU, material]);

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.uTime.value += delta;
    u.uAspect.value = state.size.width / Math.max(state.size.height, 1);
    u.uSeed.value = seed;
    u.uTrend.value += (trendRef.current - (u.uTrend.value as number)) * 0.05;
    u.uColorTrend.value += (colorTrendRef.current - (u.uColorTrend.value as number)) * 0.08;
    u.uVol.value += (volRef.current - (u.uVol.value as number)) * 0.05;
    u.uDark.value = isDark ? 1 : 0;
    (u.uAccent.value as THREE.Color).lerp(accentC, 0.08);
    (u.uBg.value as THREE.Color).lerp(isDark ? BG_DARK : BG_LIGHT, 0.12);

    const target = mouseRef?.current ?? { x: 0.5, y: 0.5 };
    mouseSmoothed.current.x += (target.x - mouseSmoothed.current.x) * 0.06;
    mouseSmoothed.current.y += (target.y - mouseSmoothed.current.y) * 0.06;
    (u.uMouse.value as THREE.Vector2).set(mouseSmoothed.current.x, mouseSmoothed.current.y);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function ClearColor({ isDark }: { isDark: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(isDark ? BG_DARK : BG_LIGHT, 1);
  }, [gl, isDark]);
  return null;
}

export function ContourBg(props: BgProps & { series?: number[]; colorTrend?: number }) {
  const colorTrend = props.colorTrend ?? props.trend;
  return (
    <Canvas
      orthographic
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      className="h-full w-full"
    >
      <ClearColor isDark={props.isDark} />
      <Plane {...props} colorTrend={colorTrend} />
    </Canvas>
  );
}

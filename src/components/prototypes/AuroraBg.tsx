"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { BgProps } from "./types";

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
  uniform float uVol;
  uniform float uDark;
  uniform vec2  uMouse;
  uniform vec3  uAccent;
  uniform vec3  uBg;
  uniform vec3  uUp;
  uniform vec3  uDown;

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

  vec3 sentiment(float trend01) {
    vec3 cDown = uDown;
    vec3 cFlat = vec3(0.90, 0.66, 0.18);
    vec3 cUp = mix(uAccent, uUp, 0.35);
    return trend01 < 0.5
      ? mix(cDown, cFlat, trend01 * 2.0)
      : mix(cFlat, cUp, (trend01 - 0.5) * 2.0);
  }

  // One drifting aurora curtain layer
  float curtain(vec2 sp, float t, float layer, float speed) {
    float phase = uSeed * 6.283 + layer * 2.1;
    vec2 p = sp;

    float n1 = fbm(vec2(p.x * 1.6 + phase, p.y * 0.7 - t * speed));
    float n2 = fbm(vec2(p.x * 2.2 - t * speed * 0.65, p.y * 1.1 + phase * 0.7));
    vec2 warp = (vec2(n1, n2) - 0.5) * (0.18 + uVol * 0.32);
    float field = fbm(p * vec2(1.1, 2.4) + warp + vec2(t * 0.035, layer * 1.3));

    float wave = sin(p.x * 2.8 + n1 * 5.0 + t * 0.18 + phase) * 0.5 + 0.5;
    float band = smoothstep(0.38, 0.62, field * (0.55 + wave * 0.45));

    // upper-sky concentration with a soft lower glow
    float y = sp.y / max(uAspect, 0.5);
    float upper = smoothstep(0.08, 0.42, y) * smoothstep(1.05, 0.48, y);
    float lower = smoothstep(0.0, 0.22, y) * 0.22;
    float vert = max(upper, lower);

    float shimmer = 0.82 + 0.18 * sin(p.x * 14.0 + t * (1.2 + uVol * 2.5) + phase);
    return band * vert * shimmer;
  }

  void main() {
    bool dark = uDark > 0.5;
    vec2 uv = vUv;

    // subtle cursor parallax — light behind glass
    vec2 parallax = (uMouse - 0.5) * vec2(0.04, 0.025);
    uv += parallax;

    vec2 vc = (uv - 0.5) * vec2(uAspect, 1.0);
    vec2 sp = vc * 1.15;

    float trend01 = smoothstep(-0.5, 0.5, uTrend);
    vec3 auroraCore = sentiment(trend01);
    vec3 auroraAlt = mix(
      mix(uDown, vec3(0.55, 0.35, 0.85), 0.5),
      mix(uAccent, vec3(0.25, 0.75, 0.95), 0.45),
      trend01
    );

    float t = uTime * (0.55 + uVol * 0.85);
    float s0 = curtain(sp, t, 0.0, 1.0);
    float s1 = curtain(sp + vec2(0.35, -0.12), t * 0.82, 1.0, 0.78) * 0.72;
    float s2 = curtain(sp + vec2(-0.28, 0.08), t * 1.08, 2.0, 1.15) * 0.48;

    float strength = dark ? 0.16 : 0.09;
    strength *= 1.0 + uVol * 0.35;

    vec3 col = uBg;

    // soft corner depth glow (dark only)
    if (dark) {
      vec3 pastel = mix(uAccent, vec3(1.0), 0.55);
      float h = smoothstep(1.1, 0.0, length((uv - vec2(0.82, 0.72)) * vec2(uAspect, 1.0)));
      col += pastel * h * 0.04;
    }

    col += auroraCore * s0 * strength;
    col += auroraAlt * s1 * strength * 0.85;
    col += mix(auroraCore, auroraAlt, 0.5) * s2 * strength * 0.65;

    // gentle specular shimmer along the brightest band
    float peak = max(s0, max(s1, s2));
    float glint = pow(peak, 3.5) * (0.08 + uVol * 0.06);
    col += mix(auroraCore, vec3(1.0), 0.65) * glint * (dark ? 1.0 : 0.55);

    float vig = 1.0 - smoothstep(0.65, 1.35, length(vc));
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

function Plane({ seed, trend, volatility, isDark, accent, mouseRef }: BgProps) {
  const accentC = useMemo(() => hexToColor(accent), [accent]);
  const bgC = useMemo(() => (isDark ? BG_DARK : BG_LIGHT).clone(), [isDark]);
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
          uVol: { value: volatility },
          uDark: { value: isDark ? 1 : 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uAccent: { value: accentC.clone() },
          uBg: { value: bgC.clone() },
          uUp: { value: UP.clone() },
          uDown: { value: DOWN.clone() },
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
    u.uSeed.value = seed;
    u.uTrend.value += (trendRef.current - (u.uTrend.value as number)) * 0.05;
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

export function AuroraBg(props: BgProps) {
  return (
    <Canvas
      orthographic
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      className="h-full w-full"
    >
      <ClearColor isDark={props.isDark} />
      <Plane {...props} />
    </Canvas>
  );
}

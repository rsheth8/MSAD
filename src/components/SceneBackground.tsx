"use client";

import { useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

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
  uniform vec3 uAccent; // sRGB 0..1
  uniform vec3 uBg;     // near-white

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv;
    p.x *= uAspect;
    p *= 2.4;

    float t = uTime * 0.02; // very slow, calm drift
    vec2 q = vec2(fbm(p + t), fbm(p - t * 0.6));
    float n = fbm(p + q * 1.2 + vec2(t * 0.35, -t * 0.2));

    // soft pastel of the accent on a near-white base — barely-there wash
    vec3 pastel = mix(uAccent, vec3(1.0), 0.55);
    float amt = smoothstep(0.40, 1.05, n) * 0.45;
    vec3 col = mix(uBg, pastel, amt);

    // gentle vignette toward the base so edges stay clean
    float d = distance(uv, vec2(0.5, 0.4));
    col = mix(col, uBg, smoothstep(0.55, 1.15, d) * 0.6);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const BG: [number, number, number] = [0.957, 0.961, 0.969]; // matches --background

function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0.086, 0.64, 0.29]; // fallback green
  const int = parseInt(m[1], 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function WavePlane({ accent }: { accent: string }) {
  const target = useMemo(() => new THREE.Vector3(...hexToRgb01(accent)), [accent]);

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
          uAccent: { value: target.clone() },
          uBg: { value: new THREE.Vector3(...BG) },
        },
      }),
    // built once; accent animates toward the target in useFrame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uAspect.value = state.size.width / state.size.height;
    (material.uniforms.uAccent.value as THREE.Vector3).lerp(target, 0.04);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** Full-viewport, ultra-subtle light backdrop tinted by the chosen accent. */
export default function SceneBackground({ accent = "#16a34a" }: { accent?: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 1.5]}
        orthographic
      >
        <WavePlane accent={accent} />
      </Canvas>
    </div>
  );
}

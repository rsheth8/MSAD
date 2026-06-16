"use client";

import { useEffect, useMemo } from "react";
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
  uniform vec3 uAccent;
  uniform vec3 uBg;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }

  // diverging sentiment scale: red (down) → amber (flat) → green/accent (up)
  vec3 sentiment(float x){
    vec3 cDown = vec3(0.84, 0.22, 0.22);
    vec3 cFlat = vec3(0.90, 0.66, 0.18);
    vec3 cUp   = mix(uAccent, vec3(0.13, 0.70, 0.45), 0.30);
    return x < 0.5 ? mix(cDown, cFlat, x*2.0) : mix(cFlat, cUp, (x-0.5)*2.0);
  }

  void main(){
    bool dark = uDark > 0.5;
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0) * 2.6;
    p += uSeed * 60.0; // unique sampling region per ticker

    float t = uTime * 0.04;
    float churn = 0.5 + uVol * 1.6; // volatility = turbulence

    // domain-warped flow field (marbling)
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t)));
    vec2 r = vec2(fbm(p + churn*q + vec2(1.7, 9.2) + t*0.3),
                  fbm(p + churn*q + vec2(8.3, 2.8) - t*0.2));
    float f = fbm(p + churn * r);

    // crisp contour lines (the "fingerprint" ridges)
    float bands = f * 7.0 + length(r) * 2.0;
    float line = abs(fract(bands) - 0.5) * 2.0;     // 0 at line center
    float ridge = 1.0 - smoothstep(0.0, 0.18, line); // thin sharp lines

    float trend01 = smoothstep(-0.5, 0.5, uTrend);
    vec3 tone = sentiment(trend01);

    // tonal field: bg → sentiment tone, modulated by the flow
    float shade = smoothstep(0.25, 0.85, f);
    vec3 col = mix(uBg, mix(uBg, tone, 0.9), shade);
    // bright crisp ridges on top
    vec3 ridgeCol = dark ? mix(tone, vec3(1.0), 0.5) : mix(tone, vec3(0.0), 0.35);
    col = mix(col, ridgeCol, ridge * (dark ? 0.7 : 0.55));

    // settle the edges
    float vig = 1.0 - smoothstep(0.65, 1.4, length((uv-0.5)*vec2(uAspect,1.0)));
    col = mix(uBg, col, 0.4 + 0.6*vig);

    gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
  }
`;

function Plane({ seed, trend, volatility, isDark, accent }: BgProps) {
  const accentC = useMemo(() => new THREE.Color(accent), [accent]);
  const bgC = useMemo(() => new THREE.Color(isDark ? "#0f1114" : "#f4f5f7"), [isDark]);

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
          uAccent: { value: accentC.clone() },
          uBg: { value: bgC.clone() },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uAspect.value = state.size.width / Math.max(state.size.height, 1);
    material.uniforms.uSeed.value = seed;
    material.uniforms.uTrend.value = trend;
    material.uniforms.uVol.value = volatility;
    material.uniforms.uDark.value = isDark ? 1 : 0;
    (material.uniforms.uAccent.value as THREE.Color).lerp(accentC, 0.1);
    (material.uniforms.uBg.value as THREE.Color).lerp(bgC, 0.1);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function Clear({ isDark }: { isDark: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(isDark ? "#0f1114" : "#f4f5f7", 1);
  }, [gl, isDark]);
  return null;
}

export function FingerprintBg(props: BgProps) {
  return (
    <Canvas orthographic gl={{ alpha: false, antialias: true }} dpr={[1, 2]} className="h-full w-full">
      <Clear isDark={props.isDark} />
      <Plane {...props} />
    </Canvas>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { BgProps } from "./types";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }
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

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

  void main(){
    bool dark = uDark > 0.5;
    vec2 uv = vUv;
    vec2 sp = vec2(uv.x * uAspect, uv.y);

    float trend01 = smoothstep(-0.5, 0.5, uTrend);   // 0 bear → 1 bull
    float storm = clamp(uVol, 0.0, 1.0);             // 0 calm → 1 stormy
    float clear = trend01 * (1.0 - storm);           // sunny when bullish & calm

    // ---- sky gradient (zenith → horizon) ----
    vec3 sky;
    if (dark) {
      vec3 zen = mix(vec3(0.03,0.04,0.07), vec3(0.02,0.05,0.10), trend01);
      vec3 hor = mix(vec3(0.06,0.05,0.07), vec3(0.10,0.10,0.16), trend01);
      sky = mix(hor, zen, smoothstep(0.0,1.0,uv.y));
    } else {
      vec3 zenBull = vec3(0.27,0.52,0.82);
      vec3 horBull = vec3(0.85,0.91,0.97);
      vec3 zenBear = vec3(0.40,0.44,0.50);
      vec3 horBear = vec3(0.62,0.64,0.68);
      vec3 zen = mix(zenBear, zenBull, trend01);
      vec3 hor = mix(horBear, horBull, trend01);
      sky = mix(hor, zen, smoothstep(0.0,1.0,uv.y));
    }

    // ---- stars (dark + clear nights only) ----
    if (dark) {
      vec2 g = floor(sp * 90.0);
      float star = step(0.991, hash(g));
      float tw = 0.5 + 0.5*sin(uTime*3.0 + hash(g)*40.0);
      sky += vec3(0.9,0.92,1.0) * star * tw * clear * (1.0 - smoothstep(0.3,0.9,fbm(sp*3.0)));
    }

    // ---- sun / moon : high when bullish, low & dim when bearish ----
    vec2 sunP = vec2(0.72, mix(0.30, 0.80, trend01));
    float sd = length((uv - sunP) * vec2(uAspect, 1.0));
    vec3 sunCore = dark ? vec3(0.85,0.88,0.95) : mix(vec3(1.0,0.95,0.8), vec3(1.0,0.86,0.55), 1.0-trend01);
    float disc = smoothstep(0.055, 0.045, sd);
    float halo = smoothstep(0.45, 0.0, sd);
    float sunVis = (0.4 + 0.6*clear);
    sky += sunCore * disc * sunVis;
    sky += sunCore * halo * halo * (dark ? 0.10 : 0.28) * sunVis;

    // ---- clouds : drifting fbm sheets, denser & darker with storm ----
    float t = uTime * (0.015 + 0.05*storm);
    float base = fbm(sp * 2.2 + vec2(t, 0.0));
    float detail = fbm(sp * 5.0 + vec2(t*1.7, t*0.3));
    float cloud = base * 0.7 + detail * 0.3;
    float cover = mix(0.62, 0.30, storm);              // lower threshold = more cloud
    float c = smoothstep(cover, cover + 0.28, cloud);
    // fluffy shading: brighter tops, darker bases
    float shade = smoothstep(0.0, 0.5, detail);
    vec3 cloudBright = dark ? vec3(0.20,0.22,0.27) : vec3(1.0,1.0,1.0);
    vec3 cloudDark   = dark ? vec3(0.03,0.03,0.05) : vec3(0.30,0.31,0.35);
    vec3 cloudCol = mix(cloudDark, cloudBright, shade);
    cloudCol = mix(cloudCol, cloudDark, storm * 0.6); // storms are grey/black
    sky = mix(sky, cloudCol, c * (0.55 + 0.4*storm));

    // ---- rain (bearish + volatile) ----
    float rainAmt = storm * (1.0 - trend01);
    if (rainAmt > 0.04) {
      vec2 rp = vec2((uv.x*uAspect)*70.0 + uv.y*22.0, uv.y*46.0 + uTime*9.0);
      float r = step(0.93, hash(floor(rp))) * smoothstep(0.0,0.4,fract(rp.y));
      sky = mix(sky, dark ? vec3(0.45,0.48,0.55) : vec3(0.80,0.83,0.88), r * rainAmt * 0.45);
    }

    // ---- lightning flash (intense storms) ----
    float flash = pow(max(0.0, sin(uTime*0.7)), 40.0) * smoothstep(0.55,0.9,storm) * (1.0-trend01);
    sky += vec3(0.9,0.92,1.0) * flash * 0.5;

    float vig = 1.0 - smoothstep(0.75, 1.45, length((uv-0.5)*vec2(uAspect,1.0)));
    sky *= 0.88 + 0.12*vig;

    gl_FragColor = vec4(clamp(sky,0.0,1.0), 1.0);
  }
`;

function Plane({ trend, volatility, isDark, accent }: BgProps) {
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
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uAspect.value = state.size.width / Math.max(state.size.height, 1);
    material.uniforms.uTrend.value = trend;
    material.uniforms.uVol.value = volatility;
    material.uniforms.uDark.value = isDark ? 1 : 0;
    (material.uniforms.uAccent.value as THREE.Color).lerp(accentC, 0.1);
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

export function WeatherBg(props: BgProps) {
  return (
    <Canvas orthographic gl={{ alpha: false, antialias: true }} dpr={[1, 2]} className="h-full w-full">
      <Clear isDark={props.isDark} />
      <Plane {...props} />
    </Canvas>
  );
}

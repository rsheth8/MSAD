"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { BgProps, LiquidMaterial } from "./types";

const MAT_INDEX: Record<LiquidMaterial, number> = {
  jelly: 0,
  matte: 1,
  glass: 2,
  iridescent: 3,
  metal: 4,
  space: 5,
};

// idx 0..5 → texture, one "window" per blob
const SPACE_IMAGES = [
  "/space/carina.jpg",
  "/space/pillars.jpg",
  "/space/orion.jpg",
  "/space/tarantula.jpg",
  "/space/whirlpool.jpg",
  "/space/bubble.jpg",
];

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
  uniform int uMat;
  uniform vec3 uAccent;
  uniform float uIridStrength;
  uniform float uIridShimmer;
  uniform sampler2D uTex0;
  uniform sampler2D uTex1;
  uniform sampler2D uTex2;
  uniform sampler2D uTex3;
  uniform sampler2D uTex4;
  uniform sampler2D uTex5;
  uniform int uCurr;
  uniform int uNext;
  uniform float uMix;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }

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

  float fieldAt(vec2 p){
    float t = uTime * (0.10 + uVol * 0.22);
    float s = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 c = 0.33 * vec2(sin(t*(0.40+fi*0.11)+fi*1.9), cos(t*(0.34+fi*0.09)+fi*2.7));
      float rot = t * (0.18 + fi * 0.05) + fi * 1.3;
      vec2 scl = vec2(1.0 + 0.7*sin(fi*1.7), 1.0 - 0.45*sin(fi*1.7)) * (0.46 + 0.12*sin(t*0.6+fi));
      // a distinct shape per blob: round, squircle, diamond, boxy, soft-diamond, rounded-square
      float k = 2.0;
      if (i == 1) k = 4.0;
      else if (i == 2) k = 1.3;
      else if (i == 3) k = 8.0;
      else if (i == 4) k = 1.6;
      else if (i == 5) k = 3.0;
      s += blob(p, c, rot, scl, 0.020 + 0.010*sin(t*0.8+fi), k);
    }
    for (int j = 0; j < 3; j++) {
      float fj = float(j);
      vec2 c = 0.52 * vec2(sin(t*(0.9+fj*0.3)+fj*4.1), cos(t*(1.1+fj*0.25)+fj*2.0));
      float k = (j == 0) ? 2.0 : (j == 1) ? 5.0 : 1.4;
      s += blob(p, c, t*0.2+fj, vec2(0.5 + 0.3*sin(t+fj)), 0.009 + 0.004*sin(t*1.3+fj), k);
    }
    return s;
  }

  vec3 sampleSpace(int idx, vec2 uvc){
    if (idx == 0) return texture2D(uTex0, uvc).rgb;
    else if (idx == 1) return texture2D(uTex1, uvc).rgb;
    else if (idx == 2) return texture2D(uTex2, uvc).rgb;
    else if (idx == 3) return texture2D(uTex3, uvc).rgb;
    else if (idx == 4) return texture2D(uTex4, uvc).rgb;
    return texture2D(uTex5, uvc).rgb;
  }

  vec3 envAt(vec2 q){
    float a = fbm(q * vec2(uAspect, 1.0) * 1.7 + vec2(uTime * 0.02, uTime * 0.01));
    vec3 base = uDark > 0.5 ? vec3(0.10, 0.12, 0.16) : vec3(0.85, 0.89, 0.95);
    vec3 e = mix(base * 0.65, base * 1.25, a);
    e += uAccent * 0.14 * smoothstep(0.5, 0.95, a);
    return e;
  }

  float starLayer(vec2 P, float density){
    vec2 gp = P * density;
    vec2 cell = floor(gp);
    vec2 f = fract(gp) - 0.5;
    float present = step(0.55, hash(cell + 3.0));
    vec2 sp = (vec2(hash(cell + 1.0), hash(cell + 2.0)) - 0.5) * 0.7;
    vec2 dv = f - sp;
    float d = length(dv);
    float bright = hash(cell + 5.0);
    float core = smoothstep(0.06 + 0.05 * bright, 0.0, d);
    float halo = smoothstep(0.4, 0.0, d) * 0.3;
    float cross = (smoothstep(0.012, 0.0, abs(dv.x)) + smoothstep(0.012, 0.0, abs(dv.y)))
                * smoothstep(0.4, 0.0, d) * smoothstep(0.75, 1.0, bright);
    float tw = 0.55 + 0.45 * sin(uTime * (1.5 + bright * 3.0) + hash(cell + 11.0) * 40.0);
    return present * (core + halo + cross * 0.6) * (0.3 + 0.7 * bright) * tw;
  }

  void main(){
    bool dark = uDark > 0.5;
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);

    float field = fieldAt(p);
    float surf = smoothstep(0.92, 1.05, field);
    float edge = (1.0 - smoothstep(1.05, 1.9, field)) * surf;
    float molten = fbm(p * 3.0 + vec2(uTime * 0.04, -uTime * 0.03));

    vec3 n = vec3(0.0, 0.0, 1.0);
    if (uMat == 2 || uMat == 4 || uMat == 5) {
      float e = 0.004;
      float fx = fieldAt(p + vec2(e, 0.0)) - fieldAt(p - vec2(e, 0.0));
      float fy = fieldAt(p + vec2(0.0, e)) - fieldAt(p - vec2(0.0, e));
      n = normalize(vec3(fx, fy, 0.08));
    }
    float fres = pow(1.0 - max(n.z, 0.0), 1.4);
    vec3 L = normalize(vec3(0.45, 0.65, 0.6));

    float trend01 = smoothstep(-0.5, 0.5, uTrend);
    vec3 cDown = vec3(0.86, 0.25, 0.25);
    vec3 cFlat = vec3(0.88, 0.64, 0.18);
    vec3 cUp = mix(uAccent, vec3(0.13, 0.70, 0.45), 0.35);
    vec3 liquid = trend01 < 0.5
      ? mix(cDown, cFlat, trend01 * 2.0)
      : mix(cFlat, cUp, (trend01 - 0.5) * 2.0);

    vec3 bg = dark ? vec3(0.055, 0.063, 0.075) : vec3(0.950, 0.957, 0.965);
    float bgrad = 1.0 - length((uv - vec2(0.5, 0.55)) * vec2(uAspect, 1.0)) * 0.55;
    bg *= 0.9 + 0.14 * bgrad;

    vec3 col = bg;
    vec3 rimCol = mix(vec3(1.0), vec3(0.60, 0.85, 1.0), 0.6);

    if (uMat == 0) {
      vec3 body = liquid * (0.90 + 0.18 * molten);
      col = mix(bg, body, surf);
      col += rimCol * edge * (dark ? 0.55 : 0.38);
    } else if (uMat == 1) {
      vec3 body = liquid * (0.84 + 0.16 * uv.y) * (0.94 + 0.10 * molten);
      col = mix(bg, body, surf);
      col = mix(col, liquid * 0.62, edge * 0.5);
    } else if (uMat == 2) {
      vec2 ro = n.xy * 0.08;
      float ca = 0.010 + fres * 0.022;
      vec3 refr;
      refr.r = envAt(uv + ro + vec2(ca, 0.0)).r;
      refr.g = envAt(uv + ro).g;
      refr.b = envAt(uv + ro - vec2(ca, 0.0)).b;
      vec3 glassCol = mix(refr, liquid, 0.16);
      glassCol += vec3(1.0) * pow(fres, 1.4) * (dark ? 0.75 : 0.55);
      float spec = pow(max(dot(n, L), 0.0), 90.0);
      glassCol += vec3(1.0) * spec * 0.85;
      col = mix(bg, glassCol, surf);
    } else if (uMat == 3) {
      // Iridescent — an oil-slick sheen seen through a colored "gel" of the sentiment
      // hue. The slick still shimmers through many hues, but the whole spectrum is
      // biased toward the trend color: up reads clearly green-cast, down red-cast,
      // flat amber/gold.
      float h = molten * 1.5 + (p.x * 0.6 + p.y * 0.4) + uTime * 0.04;
      vec3 irid = 0.5 + 0.5 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));

      // Split the oil slick into a moving brightness (shimmer) and the colored
      // streaks (chroma = how far each pixel departs from neutral grey).
      float shimmer = dot(irid, vec3(0.299, 0.587, 0.114));
      vec3 chroma = irid - shimmer;

      // The gel: the body is the sentiment color, brightened/darkened by the
      // shimmer so the slick "moves" while staying clearly cast in one hue.
      vec3 gel = liquid * (0.55 + uIridShimmer * shimmer);

      // Lay the rainbow back on top — but only the chroma deviation, at reduced
      // strength — so oil-slick hues still play across the surface as a sheen.
      vec3 body = (gel + chroma * uIridStrength) * (0.92 + 0.14 * molten);

      // A little extra rainbow allowed in the brightest shimmer peaks for sparkle.
      body += chroma * smoothstep(0.7, 1.0, shimmer) * 0.25;

      float a = smoothstep(0.96, 1.14, field);
      float rim = 1.0 - smoothstep(1.06, 1.5, field);
      col = mix(bg, body, a);
      col += body * rim * a * 0.2;
    } else if (uMat == 4) {
      float up = n.y * 0.5 + 0.5;
      float side = n.x * 0.5 + 0.5;
      vec3 sky = dark ? vec3(0.55, 0.62, 0.74) : vec3(0.93, 0.96, 1.0);
      vec3 ground = dark ? vec3(0.02, 0.03, 0.05) : vec3(0.20, 0.22, 0.28);
      vec3 chrome = mix(ground, sky, smoothstep(0.2, 0.8, up));
      chrome *= 0.82 + 0.32 * sin((up * 7.0 + side * 3.0) + uTime * 0.4);
      chrome = mix(chrome, chrome * (0.55 + liquid), 0.22);
      float spec = pow(max(dot(n, L), 0.0), 60.0);
      chrome += vec3(1.0) * spec * 0.9;
      chrome += vec3(1.0) * pow(fres, 2.5) * 0.25;
      col = mix(bg, chrome, surf);
    } else {
      // Space portals — every blob is a window into the SAME scene; the scene cross-fades over time
      vec2 tuv = (uv - 0.5) * 0.92 + 0.5;         // flat, undistorted portal (no center warp)
      tuv = clamp(tuv, 0.01, 0.99);
      vec3 space = mix(sampleSpace(uCurr, tuv), sampleSpace(uNext, tuv), uMix);
      float a = smoothstep(0.96, 1.14, field);
      float rim = 1.0 - smoothstep(1.06, 1.5, field);
      col = mix(bg, space * 1.12, a);             // slight lift for punch
      col += vec3(0.8, 0.88, 1.0) * pow(fres, 2.0) * a * 0.25;   // subtle glass edge
      col += rimCol * rim * a * 0.08;
    }

    col += (hash(uv * vec2(1920.0, 1080.0) + fract(uTime)) - 0.5) * 0.02;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function Plane({
  trend,
  volatility,
  isDark,
  accent,
  material = "jelly",
  iridStrength = 0.62,
  iridShimmer = 1.18,
}: BgProps) {
  const accentC = useMemo(() => new THREE.Color(accent), [accent]);
  const matIndex = MAT_INDEX[material];
  const textures = useTexture(SPACE_IMAGES);
  const cyc = useRef({ curr: 0, next: 1, t: 0 });

  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.NoColorSpace; // pass sRGB bytes through untouched → vivid, correct colors
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearFilter;
      t.needsUpdate = true;
    });
  }, [textures]);

  const shaderMat = useMemo(
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
          uMat: { value: matIndex },
          uAccent: { value: accentC.clone() },
          uIridStrength: { value: iridStrength },
          uIridShimmer: { value: iridShimmer },
          uTex0: { value: textures[0] },
          uTex1: { value: textures[1] },
          uTex2: { value: textures[2] },
          uTex3: { value: textures[3] },
          uTex4: { value: textures[4] },
          uTex5: { value: textures[5] },
          uCurr: { value: 0 },
          uNext: { value: 1 },
          uMix: { value: 0 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    shaderMat.uniforms.uTime.value += delta;
    shaderMat.uniforms.uAspect.value = state.size.width / Math.max(state.size.height, 1);
    shaderMat.uniforms.uTrend.value = trend;
    shaderMat.uniforms.uVol.value = volatility;
    shaderMat.uniforms.uDark.value = isDark ? 1 : 0;
    shaderMat.uniforms.uMat.value = matIndex;
    shaderMat.uniforms.uIridStrength.value = iridStrength;
    shaderMat.uniforms.uIridShimmer.value = iridShimmer;
    (shaderMat.uniforms.uAccent.value as THREE.Color).lerp(accentC, 0.1);

    // cross-fade the space scene every few seconds
    const HOLD = 1200.0, FADE = 3.0; // hold each scene ~20 min, slow 3s fade
    const c = cyc.current;
    c.t += delta;
    let mix = 0;
    if (c.t > HOLD) {
      const f = (c.t - HOLD) / FADE;
      if (f >= 1) {
        c.curr = c.next;
        c.next = (c.next + 1) % SPACE_IMAGES.length;
        c.t = 0;
      } else {
        mix = f;
      }
    }
    shaderMat.uniforms.uCurr.value = c.curr;
    shaderMat.uniforms.uNext.value = c.next;
    shaderMat.uniforms.uMix.value = mix;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMat} attach="material" />
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

export function LiquidBg(props: BgProps) {
  return (
    <Canvas orthographic gl={{ alpha: false, antialias: true }} dpr={[1, 2]} className="h-full w-full">
      <Clear isDark={props.isDark} />
      <Suspense fallback={null}>
        <Plane {...props} />
      </Suspense>
    </Canvas>
  );
}

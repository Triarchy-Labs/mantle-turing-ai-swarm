"use client";
// Stars REMOVED — cannot individually drift, only group rotation
// All particles now unified in LiquidNebula with CPU-side animation
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import {
	EffectComposer,
	SMAA,
	Bloom
} from "@react-three/postprocessing";
import { SMAAPreset, Resolution } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { useDeviceTier, type DeviceTier } from "../hooks/useDeviceTier";

import LusionFinalPass from "./LusionFinalPass";
import ScreenPaint from "./ScreenPaint";
import { useUnifiedPointer } from "../hooks/useUnifiedPointer";


import FsrEasuPass from "./FsrEasuPass";
import FsrRcasPass from "./FsrRcasPass";


// Lusion-grade adaptive constants per device tier
// FSR-optimized DPR: scene renders at reduced resolution, EASU upscales with edge-aware reconstruction.
// This is how Lusion achieves 60fps with 16K particles — render cheap, upscale smart.
const TIER_CONFIG = {
	high: { particles: 16384, smaa: SMAAPreset.HIGH, bloomIntensity: 1.5, dpr: [0.6, 1.5] as [number, number] },
	mid:  { particles: 8192,  smaa: SMAAPreset.MEDIUM, bloomIntensity: 1.0, dpr: [0.5, 0.75] as [number, number] },
	low:  { particles: 4096,  smaa: SMAAPreset.LOW, bloomIntensity: 0.6, dpr: [0.5, 0.5] as [number, number] },
};

// ═══════════════════════════════════════════════════════════════════
// GPGPU PARTICLE SYSTEM — 1:1 from Lusion dump (строки 48648-48870)
// ═══════════════════════════════════════════════════════════════════

import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";

// Render: Calibrated for dark-bg pipeline to match Lusion's volumetric cloud aesthetic.
// Lusion renders BLACK particles on WHITE FBO → invert. Overlap creates dense clouds via
// subtractive accumulation. Our white-on-dark pipeline needs compensation:
// - Opacity: 0.32 (Lusion) × 2.5 = 0.80 (dark-bg accumulation parity)
// - Size: 0.4 (Lusion) × 2.0 = 0.80 (visible bokeh clouds at distance)
// - Softness: 0.92 × 1.3 = 1.2 (larger soft halos for cloud blending)
const U_OPACITY = "0.80";    // dark-bg compensation — Lusion=0.32 on white FBO
const U_P_SIZE_MUL = "0.80"; // 2x Lusion — clouds visible at all depths
const U_P_SOFT_MUL = "1.2";  // 1.3x Lusion — softer halos for cloud merging
// focusDist=0.32 → focus at 3.2 from camera → creates DOF size variation:
// near particles ~17px, center ~37px, far ~65px (huge bokeh)
const U_FOCUS_DIST = "0.32";

// Lusion EXACT spawn/kill (строки 48653-48664)
// NOTE: Use strings with decimals for GLSL (JS integers break shader compilation)
const SPAWN_X = "4.0"; const SPAWN_Y = "2.4"; const SPAWN_Z = "0.64";
const SPAWN_OX = "-3.0"; const SPAWN_OY = "-0.5"; const SPAWN_OZ = "0.0";
// Lusion EXACT kill bounds (used inside shader via u_bounds uniform, not JS)
// const KILL_X = "7.0"; const KILL_Y = "5.0"; const KILL_Z = "2.0";

// ── Exact Lusion GLSL: Simplex 4D Derivatives + Curl (from 01_particle_position_shader.glsl) ──
const NOISE_GLSL = /* glsl */ `
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
  vec4 p, s;
  p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), vec3(1.0, 1.0, 1.0));
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
  return p;
}

// Lusion EXACT: returns vec4(dx, dy, dz, dw) * 49.0 — ANALYTICAL DERIVATIVES
vec4 simplexNoiseDerivatives(vec4 v) {
  const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
  vec4 i = floor(v + dot(v, vec4(0.309016994374947451)));
  vec4 x0 = v - i + dot(i, C.xxxx);
  vec4 i0;
  vec3 isX = step(x0.yzw, x0.xxx);
  vec3 isYZ = step(x0.zww, x0.yyz);
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;
  vec4 i3 = clamp(i0, 0.0, 1.0);
  vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
  vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;
  i = mod289(i);
  float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute(permute(permute(permute(
      i.w + vec4(i1.w, i2.w, i3.w, 1.0)) +
      i.z + vec4(i1.z, i2.z, i3.z, 1.0)) +
      i.y + vec4(i1.y, i2.y, i3.y, 1.0)) +
      i.x + vec4(i1.x, i2.x, i3.x, 1.0));
  vec4 ip2 = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0);
  vec4 p0 = grad4(j0, ip2);
  vec4 p1 = grad4(j1.x, ip2);
  vec4 p2 = grad4(j1.y, ip2);
  vec4 p3 = grad4(j1.z, ip2);
  vec4 p4 = grad4(j1.w, ip2);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4, p4));
  vec3 values0 = vec3(dot(p0,x0), dot(p1,x1), dot(p2,x2));
  vec2 values1 = vec2(dot(p3,x3), dot(p4,x4));
  vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);
  vec3 temp0 = -6.0 * m0 * m0 * values0;
  vec2 temp1 = -6.0 * m1 * m1 * values1;
  vec3 mmm0 = m0 * m0 * m0;
  vec2 mmm1 = m1 * m1 * m1;
  float dx2 = temp0[0]*x0.x + temp0[1]*x1.x + temp0[2]*x2.x + temp1[0]*x3.x + temp1[1]*x4.x + mmm0[0]*p0.x + mmm0[1]*p1.x + mmm0[2]*p2.x + mmm1[0]*p3.x + mmm1[1]*p4.x;
  float dy2 = temp0[0]*x0.y + temp0[1]*x1.y + temp0[2]*x2.y + temp1[0]*x3.y + temp1[1]*x4.y + mmm0[0]*p0.y + mmm0[1]*p1.y + mmm0[2]*p2.y + mmm1[0]*p3.y + mmm1[1]*p4.y;
  float dz2 = temp0[0]*x0.z + temp0[1]*x1.z + temp0[2]*x2.z + temp1[0]*x3.z + temp1[1]*x4.z + mmm0[0]*p0.z + mmm0[1]*p1.z + mmm0[2]*p2.z + mmm1[0]*p3.z + mmm1[1]*p4.z;
  float dw2 = temp0[0]*x0.w + temp0[1]*x1.w + temp0[2]*x2.w + temp1[0]*x3.w + temp1[1]*x4.w + mmm0[0]*p0.w + mmm0[1]*p1.w + mmm0[2]*p2.w + mmm1[0]*p3.w + mmm1[1]*p4.w;
  return vec4(dx2, dy2, dz2, dw2) * 49.0;
}

// Lusion EXACT curl: 3 independent noise fields with offset vectors, 2 octaves
vec3 curl(in vec3 p, in float noiseTime, in float persistence) {
  vec4 xNoisePotentialDerivatives = vec4(0.0);
  vec4 yNoisePotentialDerivatives = vec4(0.0);
  vec4 zNoisePotentialDerivatives = vec4(0.0);
  for (int i = 0; i < 2; ++i) {
    float twoPowI = pow(2.0, float(i));
    float scale = 0.5 * twoPowI * pow(persistence, float(i));
    xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(p * twoPowI, noiseTime)) * scale;
    yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
    zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
  }
  return vec3(
    zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
    xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
    yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
  );
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}
`;

// ── Position Compute Shader — EXACT from 01_particle_position_shader.glsl ──
const positionShader = /* glsl */ `
${NOISE_GLSL}

uniform sampler2D u_defaultPosTex;
uniform sampler2D u_logoPosTex;
uniform float u_time;
uniform float u_deltaTime;
uniform float u_simSpeed;
uniform float u_simDieSpeed;
uniform vec3 u_curlNoiseScale;
uniform vec3 u_curlStrength;
uniform float u_curlStrMul;
uniform vec3 u_bounds;
uniform float u_mode;
uniform float u_logoCutPercent;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 positionLife = texture2D(texturePosition, uv);
  vec4 velInfo = texture2D(textureVelocity, uv);

  // Life decay (GOES DOWN: 1.0 → 0.0) — Lusion exact
  positionLife.w -= u_deltaTime * u_simDieSpeed * 0.01 * (1.0 + velInfo.w);

  // Respawn when life < 0
  if (positionLife.w < 0.0) {
    vec3 h = hash33(vec3(uv, u_time));
    float modeCut = step(u_logoCutPercent, h.x);
    if (u_mode * modeCut > 0.5) {
      vec3 p = texture2D(u_logoPosTex, uv).xyz;
      positionLife.xyz = p + h * 0.2;
    } else {
      positionLife.xyz = texture2D(u_defaultPosTex, uv).xyz;
    }
    positionLife.w = 1.0;
  }

  // Kill bounds via step() multiplication — Lusion exact
  vec3 boundCheck = step(positionLife.xyz, u_bounds);
  boundCheck *= step(-u_bounds, positionLife.xyz);
  positionLife.w *= boundCheck.x * boundCheck.y * boundCheck.z;

  // Velocity integration
  positionLife.xyz += velInfo.xyz * u_deltaTime;

  // Curl noise displacement — applied to POSITION (stop-motion)
  vec3 curlStr = u_curlStrength * u_curlStrMul;
  vec3 curlScale = u_curlNoiseScale;
  vec3 curlVel = curl(positionLife.xyz * curlScale, u_time * u_simSpeed, 0.02) * curlStr * u_deltaTime;
  curlVel /= 1.0 + velInfo.w * u_mode;
  positionLife.xyz += curlVel;

  gl_FragColor = positionLife;
}
`;

// ── Velocity Compute Shader — EXACT from 02_particle_velocity_shader.glsl ──
const velocityShader = /* glsl */ `
uniform sampler2D u_logoPosTex;
uniform sampler2D u_mousePaintTex;
uniform float u_deltaTime;
uniform float u_time;
uniform float u_simDieSpeed;
uniform vec3 u_windForce;
uniform float u_windStrMul;
uniform float u_mouseStrength;        // DEFAULT: 0.2
uniform float u_mouseMoveIntensity;   // Lerped mouse delta
uniform vec3 u_screenBounds;          // Screen projection bounds
uniform float u_mode;
uniform float u_logoCutPercent;
uniform float u_attractForce;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

// Project 3D position to UV — Lusion exact
vec2 posToUv(vec3 pos) {
  vec2 uv = pos.xy / max(vec3(0.001), u_screenBounds).xy;
  uv = (uv + vec2(1.0)) / 2.0;
  uv.y = 1.0 - uv.y;
  return uv;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 positionLife = texture2D(texturePosition, uv);
  vec4 velInfo = texture2D(textureVelocity, uv);

  // Life decay check for respawn
  positionLife.w -= u_deltaTime * u_simDieSpeed * 0.01;
  if (positionLife.w < 0.0) {
    vec3 h = hash33(vec3(uv, u_time));
    float modeCut = step(u_logoCutPercent, h.x);
    velInfo.w = (modeCut * h.y * 2.0 + 1.0) * u_mode;
  }

  // Damping 0.975 — Lusion exact
  velInfo.xyz *= 0.975;

  // Wind force — Lusion exact
  vec3 windVel = u_windForce * u_deltaTime * u_windStrMul;
  windVel /= 1.0 + velInfo.w * u_mode;
  velInfo.xyz += windVel;

  // Mouse velocity injection
  vec2 posUv = posToUv(positionLife.xyz);
  vec3 mousePaintVel = (texture2D(u_mousePaintTex, posUv).xyz - 0.5 + 0.001) * 2.0;
  mousePaintVel.z = 0.0;
  vec3 mouseFinalVel = mousePaintVel * 0.8 * u_mouseMoveIntensity * u_mouseStrength;
  mouseFinalVel *= 1.0 + velInfo.w * 0.5 * u_mode;
  velInfo.xyz += mouseFinalVel;

  // Logo Attraction Force logic
  if (velInfo.w * u_mode > 1.0) {
    vec3 originPos = texture2D(u_logoPosTex, uv).xyz;
    vec3 attrV = originPos - positionLife.xyz;
    float dist2 = dot(attrV, attrV);
    if (dist2 > 0.0001) {
      attrV /= sqrt(dist2);
    } else {
      attrV = vec3(1.0, 0.0, 0.0);
    }
    velInfo.xyz += attrV * u_attractForce * velInfo.w * u_deltaTime;
  }

  gl_FragColor = velInfo;
}
`;

// ── Render Vertex Shader — Lusion EXACT (строка 64751 dump) ──
// v_color is declared but NOT assigned = vec3(0,0,0) = black particles.
// Lusion renders black particles on white FBO, then inverts in Final pass.
const gpgpuVertexShader = /* glsl */ `
uniform sampler2D u_currPosTex;
uniform vec2 uResolution;
attribute vec2 a_simUv;
varying vec3 vColor;
varying float vSoftness;
varying float vOpacity;

// Lusion EXACT sizeFromLife (строка 64751)
float sizeFromLife(float life) {
  float cut = 0.008;
  return (1.0 - smoothstep(1.0 - cut, 1.0, life)) * smoothstep(0.0, cut, life);
}

void main() {
  // White particles on dark background (pre-inverted Lusion pipeline)
  vColor = vec3(1.0);
  
  // Read position + life from GPGPU FBO texture
  vec4 positionLife = texture2D(u_currPosTex, a_simUv);
  float lifeSize = sizeFromLife(positionLife.w);
  vec3 pos = positionLife.xyz;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // Lusion EXACT pSize (строка 64751)
  float dist = ${U_FOCUS_DIST} * 10.0;
  float coef = abs(-mvPosition.z - dist) * 0.3 + pow(max(0.0, -mvPosition.z - dist), 2.5) * 0.5;
  
  vSoftness = coef * ${U_P_SOFT_MUL} * 10.0;
  vOpacity = ${U_OPACITY} * lifeSize;
  
  gl_Position = projectionMatrix * mvPosition;
  float pSize = (coef * 200.0 * ${U_P_SIZE_MUL}) / max(0.001, -mvPosition.z) * uResolution.y / 1280.0;
  gl_PointSize = pSize * lifeSize;
}
`;

// ── LiquidNebula: GPGPU Particle Component ──
function LiquidNebula({ particles, mode }: { particles: number; mode: number }) {
	const texSize = Math.ceil(Math.sqrt(particles));
	const particleCount = texSize * texSize;

	const pointsRef = useRef<THREE.Points>(null);
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const gpuRef = useRef<InstanceType<typeof GPUComputationRenderer> | null>(null);
	const posVarRef = useRef<ReturnType<InstanceType<typeof GPUComputationRenderer>["addVariable"]> | null>(null);
	const velVarRef = useRef<ReturnType<InstanceType<typeof GPUComputationRenderer>["addVariable"]> | null>(null);
	// Scroll + mouse tracking refs — Lusion exact (lines 190-215)
	const lerpedWheelDelta = useRef(0);
	const mouseMoveIntensity = useRef(0);
	const prevMousePos = useRef({ x: 0, y: 0 });
	const { gl, size } = useThree();

	const modeRatio = useRef(0);
	const screenBoundsHelper = useRef(new THREE.Vector3(4.0, 3.8, 1.0));
	const lastMode = useRef(0);
	const logoAllowed = useRef(true);
	const [paintTexture, setPaintTexture] = useState<THREE.Texture | null>(null);
	const pointerRef = useUnifiedPointer();

	// Create sim UVs (immutable, initialized once) — Lusion EXACT (строка 64858-64860)
	// No per-particle colors needed: vColor stays vec3(0) = black, inverted by Final pass
	const simUvs = useMemo(() => {
		const uvs = new Float32Array(particleCount * 2);
		for (let i = 0; i < particleCount; i++) {
			uvs[i * 2] = ((i % texSize) + 0.5) / texSize;
			uvs[i * 2 + 1] = (Math.floor(i / texSize) + 0.5) / texSize;
		}
		return uvs;
	}, [particleCount, texSize]);

	// Dummy positions (vertex shader reads from FBO, not from position attribute)
	const dummyPositions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);

	// Initialize GPUComputationRenderer
	useEffect(() => {
		const gpu = new GPUComputationRenderer(texSize, texSize, gl);

		// Position texture: xyz = spawn position, w = life (starts at 1.0, decays to 0)
		const posTex = gpu.createTexture();
		const posData = posTex.image.data as Float32Array;
		for (let i = 0; i < particleCount; i++) {
			let boundX = parseFloat(SPAWN_X);
			let boundY = parseFloat(SPAWN_Y);
			let boundZ = parseFloat(SPAWN_Z);

			// Lusion EXACT _getCubePosDistribution (line 65046): 
			// Half the particles get expanded bounds for looser clusters
			if (i > particleCount * 0.5) {
				boundX += 2.0 * (Math.random() - 0.5);
				boundY += 2.0 * (Math.random() - 0.5);
				boundZ += 2.0 * (Math.random() - 0.5);
			}

			// Lusion EXACT spawn (line 65046): pow(rand,4) for X clusters to center
			posData[i * 4] = (Math.pow(Math.random(), 4) * 2 - 1) * boundX + parseFloat(SPAWN_OX);
			posData[i * 4 + 1] = (Math.random() * 2 - 1) * boundY + parseFloat(SPAWN_OY);
			posData[i * 4 + 2] = (Math.random() * 2 - 1) * boundZ + parseFloat(SPAWN_OZ);
			// Lusion EXACT life init: linear i/N, not random
			posData[i * 4 + 3] = i / particleCount;
		}

		// Default position texture for respawn (Lusion exact: texture2D(u_defaultPosTex, uv))
		const defaultPosTex = gpu.createTexture();
		const defaultPosData = defaultPosTex.image.data as Float32Array;
		defaultPosData.set(posData); // copy initial positions
		defaultPosTex.needsUpdate = true;

		// Procedural 3D Nested Hexagon Logo Points Texture u_logoPosTex
		const logoPosTex = gpu.createTexture();
		const logoPosData = logoPosTex.image.data as Float32Array;
		const getHexagonPoint = (radius: number, segment: number, t: number, z: number) => {
			const angle1 = (segment * Math.PI) / 3;
			const angle2 = (((segment + 1) % 6) * Math.PI) / 3;
			const x1 = radius * Math.cos(angle1);
			const y1 = radius * Math.sin(angle1);
			const x2 = radius * Math.cos(angle2);
			const y2 = radius * Math.sin(angle2);
			return {
				x: x1 * (1 - t) + x2 * t,
				y: y1 * (1 - t) + y2 * t,
				z: z
			};
		};

		for (let i = 0; i < particleCount; i++) {
			let pt = { x: 0, y: 0, z: 0 };
			const r = Math.random();
			if (r < 0.45) {
				// Outer hexagon edge ring
				const seg = Math.floor(Math.random() * 6);
				const t = Math.random();
				const hz = (Math.random() * 2 - 1) * 0.15;
				pt = getHexagonPoint(1.7, seg, t, hz);
			} else if (r < 0.75) {
				// Inner hexagon edge ring
				const seg = Math.floor(Math.random() * 6);
				const t = Math.random();
				const hz = (Math.random() * 2 - 1) * 0.15;
				pt = getHexagonPoint(0.95, seg, t, hz);
			} else {
				// Spokes/volume fill
				const seg = Math.floor(Math.random() * 6);
				const t = Math.random();
				const hz = (Math.random() * 2 - 1) * 0.15;
				const pOuter = getHexagonPoint(1.7, seg, t, hz);
				const pInner = getHexagonPoint(0.95, seg, t, hz);
				const lerpT = Math.random();
				pt = {
					x: pOuter.x * (1 - lerpT) + pInner.x * lerpT,
					y: pOuter.y * (1 - lerpT) + pInner.y * lerpT,
					z: pOuter.z * (1 - lerpT) + pInner.z * lerpT
				};
			}

			// Apply Lusion exact logo rotations: X = -0.18*PI, Y = 0.16*PI, scale 0.9, translation [0, 0, -0.32]
			const rx = -0.18 * Math.PI;
			const ry = 0.16 * Math.PI;

			// Rotate around X
			let y1 = pt.y * Math.cos(rx) - pt.z * Math.sin(rx);
			let z1 = pt.y * Math.sin(rx) + pt.z * Math.cos(rx);

			// Rotate around Y
			let x2 = pt.x * Math.cos(ry) + z1 * Math.sin(ry);
			let z2 = -pt.x * Math.sin(ry) + z1 * Math.cos(ry);

			logoPosData[i * 4] = x2 * 0.9;
			logoPosData[i * 4 + 1] = y1 * 0.9;
			logoPosData[i * 4 + 2] = z2 * 0.9 - 0.32;
			logoPosData[i * 4 + 3] = 1.0;
		}

		logoPosTex.needsUpdate = true;

		// Velocity texture: xyz = velocity, w = mode weight
		const velTex = gpu.createTexture();

		const posVar = gpu.addVariable("texturePosition", positionShader, posTex);
		const velVar = gpu.addVariable("textureVelocity", velocityShader, velTex);

		gpu.setVariableDependencies(posVar, [posVar, velVar]);
		gpu.setVariableDependencies(velVar, [posVar, velVar]);

		// Position uniforms
		posVar.material.uniforms.u_defaultPosTex = { value: defaultPosTex };
		posVar.material.uniforms.u_logoPosTex = { value: logoPosTex };
		posVar.material.uniforms.u_time = { value: 0 };
		posVar.material.uniforms.u_deltaTime = { value: 0.016 };
		posVar.material.uniforms.u_simSpeed = { value: 0.12 }; // Lusion exact
		posVar.material.uniforms.u_simDieSpeed = { value: 0.32 }; // Lusion exact
		posVar.material.uniforms.u_curlNoiseScale = { value: new THREE.Vector3(0.2, 0.6, 0.2) };
		posVar.material.uniforms.u_curlStrength = { value: new THREE.Vector3(0.2, 0.12, 0.12) };
		posVar.material.uniforms.u_curlStrMul = { value: 0.8 };  // Lusion exact
		posVar.material.uniforms.u_bounds = { value: new THREE.Vector3(7.0, 5.0, 2.0) };
		posVar.material.uniforms.u_mode = { value: 0.0 };
		posVar.material.uniforms.u_logoCutPercent = { value: 0.4 };

		// Velocity uniforms
		velVar.material.uniforms.u_logoPosTex = { value: logoPosTex };
		velVar.material.uniforms.u_mousePaintTex = { value: new THREE.Texture() };
		velVar.material.uniforms.u_deltaTime = { value: 0.016 };
		velVar.material.uniforms.u_time = { value: 0 };
		velVar.material.uniforms.u_simDieSpeed = { value: 0.32 }; // Lusion exact
		velVar.material.uniforms.u_windForce = { value: new THREE.Vector3(0.16, 0.0, 0.0) }; // Lusion exact
		velVar.material.uniforms.u_windStrMul = { value: 1 };  // Lusion exact
		velVar.material.uniforms.u_mouseStrength = { value: 0.2 };  // Lusion exact
		velVar.material.uniforms.u_mouseMoveIntensity = { value: 0 };  // Lusion exact
		velVar.material.uniforms.u_screenBounds = { value: new THREE.Vector3(4.0, 3.8, 1.0) };
		velVar.material.uniforms.u_mode = { value: 0.0 };
		velVar.material.uniforms.u_logoCutPercent = { value: 0.4 };
		velVar.material.uniforms.u_attractForce = { value: 0.32 };

		// Wrapping for seamless noise
		posVar.wrapS = THREE.RepeatWrapping;
		posVar.wrapT = THREE.RepeatWrapping;
		velVar.wrapS = THREE.RepeatWrapping;
		velVar.wrapT = THREE.RepeatWrapping;

		const err = gpu.init();
		if (err !== null) {
			console.error("GPUComputationRenderer init error:", err);
			gpu.dispose();
			return;
		}

		console.log("GPGPU initialized: 128x128 FBO, curl noise + velocity physics");
		gpuRef.current = gpu;
		posVarRef.current = posVar;
		velVarRef.current = velVar;

		// Scroll wheel listener — Lusion exact (line 190-194)
		const onWheel = (e: WheelEvent) => {
			lerpedWheelDelta.current += (e.deltaY * 0.01 - lerpedWheelDelta.current) * 0.15;
		};
		const onMouseMove = (e: MouseEvent) => {
			prevMousePos.current = { x: e.clientX, y: e.clientY };
		};
		window.addEventListener('wheel', onWheel, { passive: true });
		window.addEventListener('mousemove', onMouseMove);

		return () => {
			gpu.dispose();
			window.removeEventListener('wheel', onWheel);
			window.removeEventListener('mousemove', onMouseMove);
		};
	}, [gl, texSize, particleCount]);

	// Render uniforms
	const uniforms = useMemo(() => {
		const dpr = gl.getPixelRatio();
		return {
			u_currPosTex: { value: null as THREE.Texture | null },
			uResolution: { value: new THREE.Vector2(size.width * dpr, size.height * dpr) },
		};
	}, [size, gl]);

	// GPGPU compute + render update
	useFrame((state, delta) => {
		if (!gpuRef.current || !posVarRef.current || !velVarRef.current) return;

		const clampedDelta = Math.min(delta, 0.05); // cap at 50ms

		// Transition code matching Lusion burst mechanics
		if (mode > 0 && lastMode.current === 0) {
			// Probabilistic gate: 33% chance to allow logo assembly on this cycle (mode === 2 always allowed)
			logoAllowed.current = mode === 2 ? true : (Math.random() < 0.33);
		}
		if (mode === 0) {
			logoAllowed.current = false;
		}
		lastMode.current = mode;

		const isMode1 = mode > 0 && logoAllowed.current;
		const targetRatio = isMode1 ? 1.0 : 0.0;
		// Lerp progress over ~0.6 seconds
		modeRatio.current += (targetRatio - modeRatio.current) * clampedDelta * 1.5;
		
		const ratio = modeRatio.current;
		const currentMode = ratio > 0.5 ? 1.0 : 0.0;

		let simDieSpeed = isMode1 ? 0.48 : 0.32;
		let logoCutPercent = 0.4;
		let curlStrMul = 0.6;
		let windStrMul = 1.2;

		if (isMode1) {
			// Mode 1 transition burst: when ratio is between 0.68 and 0.80
			if (ratio > 0.68 && ratio < 0.8) {
				simDieSpeed = 48.0;
				logoCutPercent = 0.0;
			}
		} else {
			// Mode 0 transition burst: when ratio is between 0.24 and 0.36
			if (ratio > 0.24 && ratio < 0.36) {
				simDieSpeed = 48.0;
				logoCutPercent = 0.0;
				curlStrMul = 16.0;
				windStrMul = 16.0;
			}
		}

		// Update compute uniforms — both shaders need time + delta
		posVarRef.current.material.uniforms.u_time.value = state.clock.elapsedTime;
		posVarRef.current.material.uniforms.u_deltaTime.value = clampedDelta;
		posVarRef.current.material.uniforms.u_mode.value = currentMode;
		posVarRef.current.material.uniforms.u_logoCutPercent.value = logoCutPercent;
		posVarRef.current.material.uniforms.u_simDieSpeed.value = simDieSpeed;
		posVarRef.current.material.uniforms.u_curlStrMul.value = curlStrMul;

		velVarRef.current.material.uniforms.u_time.value = state.clock.elapsedTime;
		velVarRef.current.material.uniforms.u_deltaTime.value = clampedDelta;
		velVarRef.current.material.uniforms.u_mode.value = currentMode;
		velVarRef.current.material.uniforms.u_logoCutPercent.value = logoCutPercent;
		velVarRef.current.material.uniforms.u_simDieSpeed.value = simDieSpeed;
		velVarRef.current.material.uniforms.u_windStrMul.value = windStrMul;

		// Dynamically calculate u_screenBounds matching Lusion _getScreenBounds
		const camera = state.camera;
		const v3 = screenBoundsHelper.current;
		v3.set(1, -1, 0.5);
		v3.unproject(camera);
		v3.sub(camera.position).normalize();
		const distToZ = -camera.position.z / v3.z;
		v3.multiplyScalar(distToZ);
		v3.add(camera.position);

		velVarRef.current.material.uniforms.u_screenBounds.value.copy(v3);

		// Inject ScreenPaint FBO texture if ready
		if (paintTexture) {
			velVarRef.current.material.uniforms.u_mousePaintTex.value = paintTexture;
		}

		// Scroll wheel → wind.y + curlStrength.y — Lusion exact (line 194)
		const wd = lerpedWheelDelta.current * 0.0144;
		velVarRef.current.material.uniforms.u_windForce.value.y = wd;
		posVarRef.current.material.uniforms.u_curlStrength.value.y = 0.12 + Math.abs(wd) * 0.5;
		// Decay wheel delta
		lerpedWheelDelta.current *= 0.95;

		// Mouse intensity — Lusion exact (lines 212-215)
		const pointer = state.pointer;
		const dx = pointer.x - prevMousePos.current.x;
		const dy = pointer.y - prevMousePos.current.y;
		let mouseSpeed = Math.sqrt(dx * dx + dy * dy) * 32;
		mouseSpeed = Math.min(mouseSpeed, 2);
		mouseMoveIntensity.current += (mouseSpeed - mouseMoveIntensity.current) * 0.072;
		velVarRef.current.material.uniforms.u_mouseMoveIntensity.value = mouseMoveIntensity.current;
		prevMousePos.current = { x: pointer.x, y: pointer.y };

		// Run GPGPU compute
		gpuRef.current.compute();

		// Pass computed position texture to render material
		const posTex = gpuRef.current.getCurrentRenderTarget(posVarRef.current).texture;
		if (materialRef.current) {
			const dpr = state.viewport.dpr;
			materialRef.current.uniforms.u_currPosTex.value = posTex;
			materialRef.current.uniforms.uResolution.value.set(size.width * dpr, size.height * dpr);
		}
	});

	// Lusion EXACT fragment shader (строка 64753 dump)
	// v_color = vec3(0) → black particles on white FBO → inverted by Final pass
	const lusionFragmentShader = `
      varying vec3 vColor;
      varying float vSoftness;
      varying float vOpacity;

      float linearStep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      }

      void main() {
        float d = length(gl_PointCoord.xy * 2.0 - 1.0);
        float b = linearStep(0.0, vSoftness + fwidth(d), 1.0 - d);
        vec3 color = vColor * b * vOpacity;
        gl_FragColor = vec4(color, b * vOpacity);
      }
    `;

	return (
		<>
			<ScreenPaint pointerRef={pointerRef} onTextureReady={setPaintTexture} />
			<points ref={pointsRef}>
				<bufferGeometry>
					<bufferAttribute attach="attributes-position" args={[dummyPositions, 3]} />
					<bufferAttribute attach="attributes-a_simUv" args={[simUvs, 2]} />
				</bufferGeometry>
				<shaderMaterial
					ref={materialRef}
					vertexShader={gpgpuVertexShader}
					fragmentShader={lusionFragmentShader}
					uniforms={uniforms}
					transparent
					depthWrite={false}
					depthTest={false}
					blending={THREE.NormalBlending}
					extensions-derivatives={true}
				/>
			</points>
		</>
	);
}

/**
 * Adaptive post-processing pipeline — Lusion-grade FSR (Blueprint §FSR + §SMAA)
 * 
 * FSR pipeline order (matching AMD spec + Lusion production):
 *   Scene (low DPR) → SMAA → EASU (edge-aware upscale) → RCAS (sharpen) → LusionFinal
 * 
 * DPR is lowered in TIER_CONFIG so the scene renders at reduced resolution.
 * EASU reconstructs edge detail that bilinear upscaling would destroy.
 * RCAS adds final sharpness pass. This is how Lusion runs 16K particles at 60fps.
 *
 * High: Full FSR pipeline (SMAA HIGH + EASU + RCAS + LusionFinal) = 4 passes
 * Mid:  Reduced pipeline (SMAA MEDIUM + EASU + RCAS + LusionFinal) = 4 passes  
 * Low:  Minimal pipeline (SMAA LOW + LusionFinal only) = 2 passes
 */
function AdaptivePostProcessing({ tier }: { tier: DeviceTier }) {
	const cfg = TIER_CONFIG[tier];

	if (tier === "low") {
		return (
			<EffectComposer multisampling={0}>
				<SMAA preset={cfg.smaa} />
				<LusionFinalPass tintOpacity={0} vignetteFrom={0.6} vignetteTo={1.6} />
			</EffectComposer>
		);
	}

	// mid + high: Full FSR pipeline (EASU → RCAS)
	// Lusion exact Bloom: luminanceThreshold=0.1, smoothWidth=1.0, iterative mipmap blur
	return (
		<EffectComposer multisampling={0}>
			<SMAA preset={cfg.smaa} />
			<Bloom
				luminanceThreshold={0.1}
				luminanceSmoothing={1.0}
				intensity={1.0}
				mipmapBlur={true}
				resolutionX={Resolution.AUTO_SIZE}
				resolutionY={Resolution.AUTO_SIZE}
			/>
			<FsrEasuPass sharpness={tier === "high" ? 0.5 : 0.35} />
			<FsrRcasPass sharpness={1.0} />
			<LusionFinalPass tintOpacity={0} vignetteFrom={0.6} vignetteTo={1.6} />
		</EffectComposer>
	);
}

function MdxGlow() {
	const texture = useLoader(THREE.TextureLoader, "/assets/images/blurs/cyan-blur.webp");
	const { viewport } = useThree();
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(() => ({
		uMap: { value: texture },
		uOpacity: { value: 0.85 }
	}), [texture]);

	useFrame(() => {
		if (!meshRef.current) return;
		const h = window.innerHeight;
		// 100rem is 1000px.
		const maxSizePixels = Math.min(1000, h);
		// Scale in WebGL units:
		const scale = (maxSizePixels / h) * viewport.height;
		
		meshRef.current.scale.set(scale, scale, 1);

		// Position Y:
		// top: -18% in CSS means the top edge is at y = -0.18 * h (where y=0 is top of screen).
		// Center of image is at y = -0.18 * h + maxSizePixels / 2.
		// In WebGL, y=0 is center. Top of screen is viewport.height / 2.
		const cssCenterY = (-0.18 * h) + (maxSizePixels / 2);
		const webGLY = (viewport.height / 2) - (cssCenterY / h * viewport.height);
		
		meshRef.current.position.set(0, webGLY, -1);
	});

	return (
		<mesh ref={meshRef}>
			<planeGeometry args={[1, 1]} />
			<shaderMaterial
				uniforms={uniforms}
				vertexShader={`
					varying vec2 vUv;
					void main() {
						vUv = uv;
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					}
				`}
				fragmentShader={`
					uniform sampler2D uMap;
					uniform float uOpacity;
					varying vec2 vUv;

					vec3 rgb2hsv(vec3 c) {
						vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
						vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
						vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
						float d = q.x - min(q.w, q.y);
						float e = 1.0e-10;
						return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
					}

					vec3 hsv2rgb(vec3 c) {
						vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
						vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
						return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
					}

					void main() {
						vec4 texColor = texture2D(uMap, vUv);
						
						// Hue shift 185 deg (185/360 = 0.5138)
						vec3 hsv = rgb2hsv(texColor.rgb);
						hsv.x = fract(hsv.x + 0.5138);
						vec3 rgb = hsv2rgb(hsv);

						gl_FragColor = vec4(rgb, texColor.a * uOpacity);
					}
				`}
				transparent={true}
				depthWrite={false}
				depthTest={false}
				blending={THREE.AdditiveBlending}
			/>
		</mesh>
	);
}

export default function LiquidGlassShader({ theme = "dark", mode = 0 }: { theme?: "dark" | "light"; mode?: number }) {
	const tier = useDeviceTier();
	const cfg = TIER_CONFIG[tier];

	// Portal to body — bypass Lenis CSS transforms that break position:fixed
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
	useEffect(() => {
		setPortalTarget(document.body);
	}, []);

	if (!portalTarget) return null;

	return createPortal(
		<div
			className="global-bg-canvas"
			data-theme={theme}
			style={{
				position: "fixed",
				inset: 0,
				zIndex: -1,
				pointerEvents: "none",
			}}
		>
			<Canvas dpr={cfg.dpr} camera={{ position: [0, 0, 5], fov: 60 }}>
				<color attach="background" args={["#010204"]} />
				{/* Architecture Models and Lights removed to maximize FPS and fix background */}
				
				<MdxGlow />

				{/* Stars REMOVED — drei Stars cannot individually drift */}
				<LiquidNebula key={tier} particles={cfg.particles} mode={mode} />

				{/* RefractiveCore: DISABLED — MeshTransmission at z=5 causes 6x render pass lag */}
				{/* {tier !== "low" && <RefractiveCore tier={tier} />} */}

				{/* BrownianMotionCamera permanently disabled:
				    Camera rotation causes parallax between HTML DOM text and 3D objects.
				    No amount of position tracking can fix rotation-induced drift.
				    Particles + stars already provide enough ambient motion. */}

				{/* Adaptive Post-Processing Pipeline — Lusion pipeline order */}
				<AdaptivePostProcessing tier={tier} />
			</Canvas>
		</div>,
		portalTarget,
	);
}

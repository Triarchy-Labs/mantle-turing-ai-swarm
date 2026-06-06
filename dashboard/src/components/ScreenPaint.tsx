"use client";
import { useFBO } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, type MutableRefObject } from "react";
import * as THREE from "three";
import type { PointerState } from "../hooks/useUnifiedPointer";

/**
 * ScreenPaint — Lusion-grade 2D fluid mouse simulation (Blueprint §5, строки 42964-43104)
 *
 * Architecture:
 * 1. Two FBOs (ping-pong): prev ↔ curr
 * 2. Each frame: draws a "brush stroke" segment between previous and current mouse positions
 * 3. Advects velocity field (self-transport) with dissipation
 * 4. Outputs texture readable by particle velocity shader
 *
 * The output texture stores: RG = velocity, BA = weight/pressure
 */

// ScreenPaint shader — adapted from Lusion's exact GLSL (строки 42965-42973)
const screenPaintFrag = `
  uniform sampler2D u_prevPaintTexture;
  uniform vec2 u_paintTexelSize;
  uniform vec4 u_drawFrom;
  uniform vec4 u_drawTo;
  uniform float u_pushStrength;
  uniform vec3 u_dissipations;
  uniform vec2 u_vel;
  varying vec2 vUv;

  vec2 sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return vec2(length(pa - ba * h), h);
  }

  void main() {
    vec2 fragCoord = vUv * (1.0 / u_paintTexelSize);
    vec2 res = sdSegment(fragCoord, u_drawFrom.xy, u_drawTo.xy);
    vec2 radiusWeight = mix(u_drawFrom.zw, u_drawTo.zw, res.y);
    float d = 1.0 - smoothstep(-0.01, radiusWeight.x, res.x);

    // Advection: read previous paint with velocity offset
    vec4 lowData = texture2D(u_prevPaintTexture, vUv);
    vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;

    vec4 data = texture2D(u_prevPaintTexture, vUv + velInv * u_paintTexelSize);
    data.xy -= 0.5;

    // Dissipation
    vec4 delta = (u_dissipations.xxyz - 1.0) * data;
    vec2 newVel = u_vel * d;
    delta += vec4(newVel, radiusWeight.yy * d);
    delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));

    data += delta;
    data.xy += 0.5;

    gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
  }
`;

const screenPaintVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Lusion defaults (строки 43025-43027)
const PUSH_STRENGTH = 25.0;
const VEL_DISSIPATION = 0.975;
const WEIGHT1_DISSIPATION = 0.95;
const WEIGHT2_DISSIPATION = 0.8;
const PAINT_SIZE = 256; // FBO resolution for fluid sim
const MIN_RADIUS = 0.0;

interface ScreenPaintProps {
	pointerRef: MutableRefObject<PointerState>;
	/** Exposes the paint texture for external consumption (particle velocity shader) */
	onTextureReady?: (texture: THREE.Texture) => void;
}

export default function ScreenPaint({ pointerRef, onTextureReady }: ScreenPaintProps) {
	const { gl } = useThree();
	const pingPong = useRef(0);

	// Two FBOs for ping-pong
	const fbo0 = useFBO(PAINT_SIZE, PAINT_SIZE, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
	});
	const fbo1 = useFBO(PAINT_SIZE, PAINT_SIZE, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
	});

	// eslint-disable-next-line react-hooks/immutability -- Three.js material uniforms are imperatively mutated in useFrame (standard R3F pattern)
	const paintMaterial = useMemo(() => {
		return new THREE.ShaderMaterial({
			vertexShader: screenPaintVert,
			fragmentShader: screenPaintFrag,
			uniforms: {
				u_prevPaintTexture: { value: null },
				u_paintTexelSize: { value: new THREE.Vector2(1 / PAINT_SIZE, 1 / PAINT_SIZE) },
				u_drawFrom: { value: new THREE.Vector4(0, 0, 0, 0) },
				u_drawTo: { value: new THREE.Vector4(0, 0, 0, 0) },
				u_pushStrength: { value: PUSH_STRENGTH },
				u_dissipations: { value: new THREE.Vector3(VEL_DISSIPATION, WEIGHT1_DISSIPATION, WEIGHT2_DISSIPATION) },
				u_vel: { value: new THREE.Vector2(0, 0) },
			},
		});
	}, []);

	const scene = useMemo(() => {
		const s = new THREE.Scene();
		const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), paintMaterial);
		s.add(quad);
		return s;
	}, [paintMaterial]);

	const camera = useMemo(() => {
		const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		return cam;
	}, []);

	// Previous pointer for segment drawing
	const prevPointer = useRef({ px: -1, py: -1 });

	/* eslint-disable react-hooks/immutability -- R3F useFrame imperatively mutates Three.js uniforms every frame */
	useFrame(() => {
		const ptr = pointerRef.current;
		const u = paintMaterial.uniforms;

		// Handle first frame initialization to avoid line from (0,0)
		if (prevPointer.current.px === -1 && prevPointer.current.py === -1) {
			prevPointer.current.px = ptr.px;
			prevPointer.current.py = ptr.py;
		}

		// Convert pixel coords to FBO space
		const toX = ptr.px * (PAINT_SIZE / window.innerWidth);
		const toY = (window.innerHeight - ptr.py) * (PAINT_SIZE / window.innerHeight);

		// Dynamic speed-based radius calculation
		const dx = ptr.px - prevPointer.current.px;
		const dy = ptr.py - prevPointer.current.py;
		const dist = Math.sqrt(dx * dx + dy * dy);

		const radiusDistanceRange = 100.0;
		const maxRadius = Math.max(40.0, window.innerWidth / 20.0);
		const tVal = Math.max(0, Math.min(1, dist / radiusDistanceRange));
		let currentRadius = MIN_RADIUS + tVal * (maxRadius - MIN_RADIUS);

		// Convert radius from screen pixels to FBO space
		currentRadius = currentRadius * (PAINT_SIZE / window.innerHeight);

		// Set weight to 1.0 when moving, 0.0 when still
		const isStill = ptr.dx === 0 && ptr.dy === 0 && dist === 0;
		const currentWeight = isStill ? 0.0 : 1.0;

		// Copy previous drawTo to drawFrom to keep continuous spline interpolation
		u.u_drawFrom.value.copy(u.u_drawTo.value);
		u.u_drawTo.value.set(toX, toY, currentRadius, currentWeight);

		// Velocity in normalized space
		u.u_vel.value.set(ptr.dx * 0.01, -ptr.dy * 0.01);

		// Ping-pong: read from prev, write to curr
		const readFBO = pingPong.current === 0 ? fbo0 : fbo1;
		const writeFBO = pingPong.current === 0 ? fbo1 : fbo0;

		u.u_prevPaintTexture.value = readFBO.texture;

		// Render paint pass
		const prevRT = gl.getRenderTarget();
		gl.setRenderTarget(writeFBO);
		gl.render(scene, camera);
		gl.setRenderTarget(prevRT);

		// Flip ping-pong
		pingPong.current = 1 - pingPong.current;

		// Expose texture
		if (onTextureReady) {
			onTextureReady(writeFBO.texture);
		}

		// Store prev pointer
		prevPointer.current.px = ptr.px;
		prevPointer.current.py = ptr.py;

		// Decay delta to zero when not moving
		ptr.dx *= 0.85;
		ptr.dy *= 0.85;
	});
	/* eslint-enable react-hooks/immutability */

	return null; // Invisible — only renders to FBO
}

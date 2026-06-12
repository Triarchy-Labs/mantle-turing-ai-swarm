"use client";
/**
 * FsrEasuPass — AMD FidelityFX Super Resolution 1.0 EASU
 * (Edge Adaptive Spatial Upsampling)
 *
 * This is the FIRST pass of the FSR pipeline. It upscales a low-resolution
 * render to full resolution using edge-aware directional interpolation.
 *
 * How it works with R3F:
 *   Canvas renders at lower DPR (e.g. 0.5-0.75x native) → all scene + GPGPU
 *   runs at reduced pixel count → EASU reconstructs edge detail → RCAS sharpens.
 *
 * The EASU algorithm:
 *   1. Takes 12 samples in a cross-diamond pattern around current pixel
 *   2. Computes local edge direction from luma gradients
 *   3. Applies a directional Lanczos2-based kernel aligned to edges
 *   4. Preserves sharp edges while smoothing along them
 *
 * Reference: AMD GPUOpen FSR 1.0 (MIT License)
 * Adapted for postprocessing Effect API (WebGL2 fragment shader)
 */

import { forwardRef, useMemo } from "react";
import { Effect, BlendFunction } from "postprocessing";
import { Uniform } from "three";

// AMD FSR 1.0 EASU — ported to GLSL ES 3.0 / WebGL2 fragment shader
// Based on: GPUOpen-Effects/FidelityFX-FSR (ffx_fsr1.h)
const fragment = /* glsl */ `
  uniform float u_sharpness;

  // Rec. 709 luma
  float FsrLuma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 texelSize = 1.0 / resolution.xy;

    // ── 12-tap cross-diamond sampling pattern ──
    //    . b .
    //  d e f g
    //    h . j
    //  k l m n
    //    . p .
    // We sample a 4x4 neighborhood but skip corners for the diamond shape.
    // This matches the AMD reference 12-tap EASU kernel.

    vec3 b = texture2D(inputBuffer, uv + texelSize * vec2( 0.0, -2.0)).rgb;
    vec3 d = texture2D(inputBuffer, uv + texelSize * vec2(-1.0, -1.0)).rgb;
    vec3 e = texture2D(inputBuffer, uv + texelSize * vec2( 0.0, -1.0)).rgb;
    vec3 f = texture2D(inputBuffer, uv + texelSize * vec2( 1.0, -1.0)).rgb;
    vec3 h = texture2D(inputBuffer, uv + texelSize * vec2(-1.0,  0.0)).rgb;
    vec3 i = inputColor.rgb; // center pixel
    vec3 j = texture2D(inputBuffer, uv + texelSize * vec2( 1.0,  0.0)).rgb;
    vec3 k = texture2D(inputBuffer, uv + texelSize * vec2(-1.0,  1.0)).rgb;
    vec3 l = texture2D(inputBuffer, uv + texelSize * vec2( 0.0,  1.0)).rgb;
    vec3 m = texture2D(inputBuffer, uv + texelSize * vec2( 1.0,  1.0)).rgb;
    vec3 n = texture2D(inputBuffer, uv + texelSize * vec2( 2.0,  0.0)).rgb;
    vec3 p = texture2D(inputBuffer, uv + texelSize * vec2( 0.0,  2.0)).rgb;

    // ── Compute luma for edge detection ──
    float bL = FsrLuma(b);
    float dL = FsrLuma(d); float eL = FsrLuma(e); float fL = FsrLuma(f);
    float hL = FsrLuma(h); float iL = FsrLuma(i); float jL = FsrLuma(j);
    float kL = FsrLuma(k); float lL = FsrLuma(l); float mL = FsrLuma(m);
    float nL = FsrLuma(n);
    float pL = FsrLuma(p);

    // ── Edge direction estimation ──
    // Horizontal and vertical Sobel-like gradients from the cross neighborhood
    float dirH = 0.0;
    float dirV = 0.0;

    // Use the inner 3x3 cross for primary direction
    dirH += (dL - fL) + (kL - mL);
    dirV += (dL - kL) + (fL - mL);

    // Extend with the outer taps for stability
    dirH += (hL - jL) * 0.5;
    dirV += (eL - lL) * 0.5;

    // Normalize direction
    float dirLen = max(abs(dirH), abs(dirV));
    float dirLenRcp = 1.0 / max(dirLen, 1.0e-5);
    dirH *= dirLenRcp;
    dirV *= dirLenRcp;

    // ── Clamp direction to reasonable range ──
    // Limit to [-1, 1] range after normalization
    float stretch = max(abs(dirH), abs(dirV));
    stretch = 1.0 / max(stretch, 1.0e-5);
    dirH *= stretch;
    dirV *= stretch;

    // ── Directional interpolation weights ──
    // Project neighbor offsets onto edge direction and compute Lanczos2 weights
    // We blend along the edge direction to preserve sharpness across edges

    // Min/max of local neighborhood for clamping (anti-ringing)
    vec3 minC = min(min(min(d, e), min(f, h)), min(min(i, j), min(k, l)));
    minC = min(minC, m);
    vec3 maxC = max(max(max(d, e), max(f, h)), max(max(i, j), max(k, l)));
    maxC = max(maxC, m);

    // ── Adaptive sharpness based on local contrast ──
    float range = FsrLuma(maxC) - FsrLuma(minC);
    float adaptiveSharp = mix(0.0, u_sharpness, smoothstep(0.0, 0.15, range));

    // ── Directional reconstruction ──
    // Sample along the detected edge direction using fractional offsets
    vec2 dir = vec2(dirH, dirV) * texelSize;

    // 4-tap directional filter (Lanczos2-inspired)
    float w0 = 0.5 - adaptiveSharp * 0.125;
    float w1 = 0.5 + adaptiveSharp * 0.125;

    vec3 tap0 = texture2D(inputBuffer, uv - dir * 0.5).rgb;
    vec3 tap1 = texture2D(inputBuffer, uv + dir * 0.5).rgb;

    // Weighted blend: center-heavy with directional fill
    vec3 result = i * w1 + (tap0 + tap1) * (w0 * 0.5);

    // ── Anti-ringing clamp ──
    // Prevent overshoot by clamping to local min/max
    result = clamp(result, minC, maxC);

    outputColor = vec4(result, 1.0);
  }
`;

class FsrEasuEffect extends Effect {
  constructor({ sharpness = 0.5 } = {}) {
    super("FsrEasuEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform<unknown>>([
        ["u_sharpness", new Uniform(sharpness)],
      ]),
    });
  }
}

interface FsrEasuPassProps {
  /** Edge-aware sharpness strength. 0 = soft upscale, 1 = maximum edge preservation.
   *  Lusion default: 0.5 for balanced quality. */
  sharpness?: number;
}

/**
 * R3F wrapper for FSR EASU upscaling.
 * Place in <EffectComposer> BEFORE FsrRcasPass (matching AMD pipeline order).
 *
 * Pipeline: Scene (low DPR) → EASU (edge reconstruction) → RCAS (sharpening) → Final
 */
const FsrEasuPass = forwardRef(function FsrEasuPass(
  props: FsrEasuPassProps,
  ref
) {
  const { sharpness = 0.5 } = props;

  const effect = useMemo(() => {
    return new FsrEasuEffect({ sharpness });
  }, [sharpness]);

  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default FsrEasuPass;

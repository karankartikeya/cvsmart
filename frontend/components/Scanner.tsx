"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

// reactbits.dev/backgrounds/scanner, reimplemented against `ogl` (already a
// project dependency). Multi-layer sine "signal field" swept by a moving
// band, blended across a 3-color palette, with scanline/grain/vignette
// post-effects and mouse-reactive distortion. Falls back to a static CSS
// gradient for prefers-reduced-motion or when WebGL is unavailable.
export type ScannerProps = {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  sweepSpeed?: number;
  sweepWidth?: number;
  sweepFalloff?: number;
  scale?: number;
  frequency?: number;
  ripple?: number;
  bandDensity?: number;
  lineSharpness?: number;
  glow?: number;
  scanDirection?: "vertical" | "horizontal" | "diagonal";
  colorSpread?: number;
  brightness?: number;
  contrast?: number;
  softness?: number;
  vignette?: number;
  scanline?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  mouseStrength?: number;
  className?: string;
  style?: React.CSSProperties;
};

const VERTEX = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

uniform float uSpeed;
uniform float uSweepSpeed;
uniform float uSweepWidth;
uniform float uSweepFalloff;
uniform float uScale;
uniform float uFrequency;
uniform float uRipple;
uniform float uBandDensity;
uniform float uLineSharpness;
uniform float uGlow;
uniform int uScanDirection; // 0 vertical, 1 horizontal, 2 diagonal
uniform float uColorSpread;
uniform float uBrightness;
uniform float uContrast;
uniform float uSoftness;
uniform float uVignette;
uniform float uScanline;
uniform float uGrain;
uniform float uGrainIntensity;

uniform vec2 uMouse;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Layered sine "signal field" — several offset sine waves summed to read as
// an organic, non-repeating scan surface rather than a flat gradient band.
float signalField(vec2 p, float t) {
  float v = 0.0;
  v += sin(p.x * uFrequency * 1.0 + t * 1.3) * 0.5;
  v += sin(p.y * uFrequency * 1.4 - t * 0.9) * 0.35;
  v += sin((p.x + p.y) * uFrequency * 0.6 + t * 0.5) * 0.25;
  v += sin(length(p) * uFrequency * 2.1 - t * 1.7) * uRipple;
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * uScale;

  // Mouse-reactive local warp: push the sampled point away from the cursor,
  // falling off smoothly at uMouseRadius so it reads as a ripple, not a snap.
  if (uMouseActive > 0.5) {
    vec2 mp = (uMouse - 0.5) * vec2(aspect, 1.0) * uScale;
    float d = distance(p, mp);
    float falloff = smoothstep(uMouseRadius * uScale, 0.0, d);
    vec2 dir = normalize(p - mp + 1e-4);
    p += dir * falloff * uMouseStrength * 0.3;
  }

  float t = uTime * uSpeed;
  float field = signalField(p, t);

  // Sweep coordinate depends on scan direction.
  float sweepCoord;
  if (uScanDirection == 0) {
    sweepCoord = uv.y;
  } else if (uScanDirection == 1) {
    sweepCoord = uv.x;
  } else {
    sweepCoord = (uv.x + uv.y) * 0.5;
  }

  float sweepPos = fract(uTime * uSweepSpeed);
  float sweepDist = abs(sweepCoord - sweepPos);
  sweepDist = min(sweepDist, 1.0 - sweepDist);
  float sweep = exp(-sweepDist * uSweepFalloff / max(uSweepWidth, 0.001));

  // Discretize the signal field into bands, softened by uSoftness /
  // sharpened by uLineSharpness so it reads as scan lines, not smoke.
  float bands = sin(field * uBandDensity * 3.14159);
  bands = bands / max(uSoftness, 0.05);
  float lines = pow(abs(bands), 1.0 / max(uLineSharpness, 0.1));
  lines = 1.0 - clamp(lines, 0.0, 1.0);

  float energy = clamp(lines * 0.6 + sweep * 0.8, 0.0, 1.0);

  // Blend the 3-color palette across signal energy, spread controls how
  // much of the range each color occupies.
  float spread = max(uColorSpread, 0.05);
  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, spread, energy));
  col = mix(col, uColor3, smoothstep(1.0 - spread, 1.0, energy));

  // Glow adds a soft additive bloom scaled by the sweep band itself.
  col += uColor3 * sweep * uGlow;

  // Scanline post-effect: fine horizontal lines, independent of scan direction.
  if (uScanline > 0.5) {
    float sl = sin(uv.y * uResolution.y * 1.5) * 0.04;
    col -= sl;
  }

  // Grain: cheap per-pixel hash noise dithered onto the final color.
  if (uGrain > 0.5) {
    float g = (hash(uv * uResolution.xy + uTime) - 0.5) * uGrainIntensity;
    col += g;
  }

  // Vignette: darken toward the edges.
  float vig = smoothstep(1.1, 0.3, length(uv - 0.5) * 2.0);
  col = mix(col * (1.0 - uVignette), col, vig);

  // Brightness / contrast.
  col *= uBrightness;
  col = (col - 0.5) * uContrast + 0.5;

  float alpha = clamp(energy * 0.6 + sweep * 0.5, 0.0, 1.0);
  gl_FragColor = vec4(max(col, 0.0), alpha);
}
`;

function hexToVec3(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const DIRECTION_CODE = { vertical: 0, horizontal: 1, diagonal: 2 } as const;

export default function Scanner({
  color1 = "#5227FF",
  color2 = "#FF9FFC",
  color3 = "#FFFFFF",
  speed = 0.5,
  sweepSpeed = 0.25,
  sweepWidth = 1.6,
  sweepFalloff = 6,
  scale = 1.5,
  frequency = 2,
  ripple = 0.22,
  bandDensity = 11,
  lineSharpness = 5.5,
  glow = 0.22,
  scanDirection = "vertical",
  colorSpread = 0.7,
  brightness = 1,
  contrast = 1.15,
  softness = 1.4,
  vignette = 0.45,
  scanline = false,
  grain = false,
  grainIntensity = 0.05,
  opacity = 1,
  mouseInteraction = false,
  mouseRadius = 0.5,
  mouseStrength = 0.5,
  className,
  style,
}: ScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    } catch {
      setWebglFailed(true);
      return;
    }
    const gl = renderer.gl;
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    container.appendChild(gl.canvas);

    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uColor1: { value: hexToVec3(color1) },
        uColor2: { value: hexToVec3(color2) },
        uColor3: { value: hexToVec3(color3) },
        uSpeed: { value: speed },
        uSweepSpeed: { value: sweepSpeed },
        uSweepWidth: { value: sweepWidth },
        uSweepFalloff: { value: sweepFalloff },
        uScale: { value: scale },
        uFrequency: { value: frequency },
        uRipple: { value: ripple },
        uBandDensity: { value: bandDensity },
        uLineSharpness: { value: lineSharpness },
        uGlow: { value: glow },
        uScanDirection: { value: DIRECTION_CODE[scanDirection] },
        uColorSpread: { value: colorSpread },
        uBrightness: { value: brightness },
        uContrast: { value: contrast },
        uSoftness: { value: softness },
        uVignette: { value: vignette },
        uScanline: { value: scanline ? 1 : 0 },
        uGrain: { value: grain ? 1 : 0 },
        uGrainIntensity: { value: grainIntensity },
        uMouse: { value: [0.5, 0.5] },
        uMouseRadius: { value: mouseRadius },
        uMouseStrength: { value: mouseStrength },
        uMouseActive: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    function resize() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      program.uniforms.uResolution.value = [rect.width, rect.height];
    }
    resize();
    window.addEventListener("resize", resize);

    // Smoothed mouse position, eased toward the real cursor each frame so
    // the ripple trails rather than snapping.
    const targetMouse = [0.5, 0.5];
    const currentMouse = [0.5, 0.5];

    function onPointerMove(e: PointerEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      targetMouse[0] = (e.clientX - rect.left) / rect.width;
      targetMouse[1] = 1 - (e.clientY - rect.top) / rect.height;
      program.uniforms.uMouseActive.value = 1;
    }
    function onPointerLeave() {
      program.uniforms.uMouseActive.value = 0;
    }
    if (mouseInteraction) {
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
    }

    // Pause the render loop when off-screen or the tab is hidden, so the
    // shader doesn't burn cycles on a background tab.
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(container);
    const onVisibility = () => {
      visible = visible && !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    let raf = 0;
    const start = performance.now();
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      program.uniforms.uTime.value = (now - start) / 1000;
      currentMouse[0] += (targetMouse[0] - currentMouse[0]) * 0.08;
      currentMouse[1] += (targetMouse[1] - currentMouse[1]) * 0.08;
      program.uniforms.uMouse.value = [currentMouse[0], currentMouse[1]];
      renderer.render({ scene: mesh });
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      if (mouseInteraction) {
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
      }
      const loseContext = gl.getExtension("WEBGL_lose_context");
      loseContext?.loseContext();
      if (gl.canvas.parentElement === container) {
        container.removeChild(gl.canvas);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    reducedMotion,
    color1,
    color2,
    color3,
    speed,
    sweepSpeed,
    sweepWidth,
    sweepFalloff,
    scale,
    frequency,
    ripple,
    bandDensity,
    lineSharpness,
    glow,
    scanDirection,
    colorSpread,
    brightness,
    contrast,
    softness,
    vignette,
    scanline,
    grain,
    grainIntensity,
    mouseInteraction,
    mouseRadius,
    mouseStrength,
  ]);

  const showStatic = reducedMotion || webglFailed;

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", opacity, ...style }}
      aria-hidden
    >
      {showStatic ? (
        <div className="h-full w-full" style={{ background: "var(--gradient-sunset)", opacity: 0.16 }} />
      ) : (
        <div ref={containerRef} className="h-full w-full" />
      )}
    </div>
  );
}

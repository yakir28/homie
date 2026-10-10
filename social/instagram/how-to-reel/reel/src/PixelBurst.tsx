// Square pixels that fly in from a scattered cloud and gather into a box (gather), or break out of it and fly away (scatter).
// Use it for a glitchy logo arrival or exit. The box is in the parent's pixels; colours cycle through `colors`.
import React from "react";
import { Easing, interpolate, random, useCurrentFrame } from "reelkit/frame";

export const PixelBurst: React.FC<{ box: { x: number; y: number; w: number; h: number }; from: number; frames: number; mode: "gather" | "scatter"; colors: string[]; count?: number; size?: number; spread?: number; seed?: string }> = ({ box, from, frames, mode, colors, count = 90, size = 22, spread = 520, seed = "px" }) => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const delay = r("d") * frames * 0.4;
        let t = interpolate(f, [from + delay, from + delay + frames * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
        if (mode === "scatter") t = 1 - t;
        const tx = box.x + r("x") * box.w, ty = box.y + r("y") * box.h;
        const ang = r("a") * Math.PI * 2, dist = spread * (0.4 + r("r"));
        const x = tx + Math.cos(ang) * dist * (1 - t), y = ty + Math.sin(ang) * dist * (1 - t);
        // pixels vanish as they settle (gather) or as they leave (scatter)
        const visible = mode === "gather" ? interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0]) : interpolate(t, [0, 0.4, 0.9, 1], [0, 1, 1, 0]);
        const s = size * (0.5 + r("s"));
        return <div key={i} style={{ position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, background: colors[i % colors.length], opacity: visible }} />;
      })}
    </>
  );
};

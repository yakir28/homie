// A calm dark ground with one soft glow of the accent colour that drifts slowly; it sits behind the whole film.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "reelkit/frame";

export const GlowGround: React.FC<{ base: string; glow: string; strength?: number }> = ({ base, glow, strength = 0.22 }) => {
  const f = useCurrentFrame();
  const x = 50 + 12 * Math.sin(f / 90), y = 42 + 8 * Math.cos(f / 110);
  const a = Math.round(strength * 255).toString(16).padStart(2, "0");
  return <AbsoluteFill style={{ background: `radial-gradient(70% 45% at ${x}% ${y}%, ${glow}${a} 0%, ${glow}00 70%), ${base}` }} />;
};

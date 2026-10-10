// One short line of type with one word in the accent colour. It rises in with a slight blur, or stands still when animate is false
// (for a line that continues across a cut). Place it under the object it describes.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "reelkit/frame";

export const KeywordLine: React.FC<{ text: string; keyword?: string; color: string; accent: string; size: number; font: string; top: number; delay?: number; animate?: boolean; weight?: number; frames?: number }> = ({ text, keyword, color, accent, size, font, top, delay = 0, animate = true, weight = 700, frames = 14 }) => {
  const f = useCurrentFrame();
  const t = animate ? interpolate(f, [delay, delay + frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) : 1;
  const parts = keyword ? text.split(keyword) : [text];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: -size * 0.02, lineHeight: 1.1, color,
      opacity: t, transform: `translateY(${(1 - t) * size * 0.5}px)`, filter: `blur(${(1 - t) * 8}px)` }}>
      {parts.map((p, i) => <React.Fragment key={i}>{p}{i < parts.length - 1 ? <span style={{ color: accent }}>{keyword}</span> : null}</React.Fragment>)}
    </div>
  );
};

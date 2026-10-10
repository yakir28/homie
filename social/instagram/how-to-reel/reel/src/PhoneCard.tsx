// A finished video playing inside a rounded phone-shaped card that lands with a spring and a soft glow behind it.
// `land` is the frame the card arrives; the video starts playing from its first frame when the scene starts.
import React from "react";
import { OffthreadVideo, spring, useCurrentFrame, useVideoConfig } from "reelkit/frame";

export const PhoneCard: React.FC<{ src: string; width: number; cx: number; cy: number; glow: string; edge: string; land?: number; startFrom?: number }> = ({ src, width, cx, cy, glow, edge, land = 0, startFrom = 0 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: f - land, fps, config: { damping: 14, stiffness: 120 } });
  const h = width * 16 / 9;
  return (
    <div style={{ position: "absolute", left: cx - width / 2, top: cy - h / 2, width, height: h, borderRadius: width * 0.08, overflow: "hidden",
      transform: `translateY(${(1 - p) * 500}px) scale(${0.85 + 0.15 * p}) rotate(${(1 - p) * -6}deg)`, opacity: Math.min(1, p * 2),
      boxShadow: `0 0 120px ${glow}55, 0 50px 100px rgba(0,0,0,0.6), 0 0 0 3px ${edge}` }}>
      <OffthreadVideo src={src} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

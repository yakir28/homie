// A cartoon pointing hand that glides between points and presses on the ones marked as clicks: it dips, and a ring spreads from the fingertip.
// Points are in the parent's coordinates (place it inside TiltScreen to use image pixels); the fingertip sits exactly on each point.
// handClicks() returns the frames of the presses so sounds can be placed on them.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "reelkit/frame";

export type HandPoint = { frame: number; x: number; y: number; click?: boolean };
export const handClicks = (points: HandPoint[], offset = 0) => points.filter((p) => p.click).map((p) => p.frame + offset);

const glide = Easing.bezier(0.45, 0, 0.2, 1);

export const HandCursor: React.FC<{ points: HandPoint[]; size?: number; fill?: string; ink?: string; ring?: string; enter?: number }> = ({ points, size = 120, fill = "#ffffff", ink = "#111111", ring = "#a3c98b", enter }) => {
  const f = useCurrentFrame();
  const frames = points.map((p) => p.frame);
  const pos = (pick: (p: HandPoint) => number) => points.length === 1 ? pick(points[0]!) : interpolate(f, frames, points.map(pick), { easing: glide, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = pos((p) => p.x), y = pos((p) => p.y);
  const clicks = handClicks(points);
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(f, [c - 3, c, c + 5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), 0);
  const appear = enter == null ? 1 : interpolate(f, [enter, enter + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const s = size / 100;
  return (
    <>
      {clicks.map((c) => {
        const t = interpolate(f, [c, c + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (t <= 0 || t >= 1) return null;
        const p = points.find((q) => q.frame === c)!;
        const r = size * (0.15 + 0.6 * Easing.out(Easing.cubic)(t));
        return <div key={c} style={{ position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `${size * 0.05}px solid ${ring}`, opacity: 1 - t }} />;
      })}
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2}
        style={{ position: "absolute", left: x - 34 * s, top: y - 4 * s, opacity: appear, transform: `scale(${(1 - 0.12 * press) * (0.7 + 0.3 * appear)}) rotate(${-8 + 6 * press}deg)`, transformOrigin: `${34}% 4%`, filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.45))", overflow: "visible" }}>
        <path d="M34 6c6 0 9 4 9 10v34c2-3 5-4 8-4 5 0 8 3 9 7 2-3 5-4 8-4 5 0 8 3 9 8 2-2 4-3 7-3 6 0 9 5 9 11v22c0 17-12 31-30 31H52c-12 0-20-6-26-15L10 79c-3-5-2-11 3-14s11-1 14 3l3 5V16c0-6 2-10 4-10z"
          fill={fill} stroke={ink} strokeWidth={4.5} strokeLinejoin="round" />
        <path d="M43 50v22M60 53v19M77 57v16" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />
      </svg>
    </>
  );
};

// A logo lockup: the mark lands with a short overshoot, then the wordmark writes on from left to right with a glow that settles.
// Pass the brand's own mark and wordmark images; `land` and `write` are the frames those two moves start.
import React from "react";
import { Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "reelkit/frame";

export const LogoLockup: React.FC<{ mark: string; word: string; markRatio: number; wordRatio: number; height: number; gap: number; cx: number; cy: number; glow: string; land?: number; write?: number; writeFrames?: number }> = ({ mark, word, markRatio, wordRatio, height, gap, cx, cy, glow, land = 0, write = 10, writeFrames = 22 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const mh = height, mw = mh * markRatio, wh = height * 0.66, ww = wh * wordRatio;
  const total = mw + gap + ww, left = cx - total / 2;
  const pop = spring({ frame: f - land, fps, config: { damping: 11, stiffness: 160 } });
  const wipe = interpolate(f, [write, write + writeFrames], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const glowAmt = interpolate(f, [write, write + writeFrames, write + writeFrames + 25], [0, 1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Img src={mark} style={{ position: "absolute", left, top: cy - mh / 2, width: mw, height: mh, opacity: f >= land ? 1 : 0, transform: `scale(${0.6 + 0.4 * pop})`, filter: `drop-shadow(0 0 ${30 * glowAmt + 10}px ${glow})` }} />
      <Img src={word} style={{ position: "absolute", left: left + mw + gap, top: cy - wh / 2 + mh * 0.06, width: ww, height: wh, clipPath: `inset(-20% ${100 - wipe}% -20% 0)`, filter: `drop-shadow(0 0 ${36 * glowAmt}px ${glow})` }} />
      {wipe > 0 && wipe < 100 ? <div style={{ position: "absolute", left: left + mw + gap + ww * wipe / 100 - 3, top: cy - wh * 0.6, width: 6, height: wh * 1.2, background: glow, boxShadow: `0 0 30px ${glow}`, borderRadius: 3 }} /> : null}
    </>
  );
};

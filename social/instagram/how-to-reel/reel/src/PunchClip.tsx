// A full-bleed video that slams in: it starts zoomed and snaps back to fill the frame with a short white flash, under a dark
// gradient that keeps big type readable. Use it for a hook in the first frame of an ad.
import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, useCurrentFrame } from "reelkit/frame";

export const PunchClip: React.FC<{ src: string; startFrom?: number; from?: number; zoom?: number; frames?: number; shade?: string }> = ({ src, startFrom = 0, from = 1.35, zoom = 1.06, frames = 7, shade = "#0d0f0c" }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, frames, 60], [from, zoom, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const flash = interpolate(f, [0, 4], [0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <OffthreadVideo src={src} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${s})` }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${shade}00 30%, ${shade}cc 68%, ${shade}f2 100%)` }} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />
    </AbsoluteFill>
  );
};

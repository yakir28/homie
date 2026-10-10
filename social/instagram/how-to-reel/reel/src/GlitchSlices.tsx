// A glitch cut between two pictures: `before` is cut into horizontal bands that jump sideways with a coloured ghost on each band,
// strongest at `switchAt`, where `after` takes over broken and snaps back into place by `frames`. Use it for a short digital cut.
import React from "react";
import { random, useCurrentFrame } from "reelkit/frame";

export const GlitchSlices: React.FC<{ before: React.ReactNode; after: React.ReactNode; switchAt: number; frames: number; bands?: number; shift?: number; ghost?: string; seed?: string }> = ({ before, after, switchAt, frames, bands = 9, shift = 140, ghost = "#a3c98b", seed = "gl" }) => {
  const f = useCurrentFrame();
  const amount = f < switchAt ? (f + 1) / switchAt : Math.max(0, 1 - (f - switchAt) / (frames - switchAt - 1));
  const children = f < switchAt ? before : after;
  if (amount <= 0.001) return <>{children}</>;
  return (
    <>
      {Array.from({ length: bands }, (_, i) => {
        const r = random(`${seed}-${i}-${Math.floor(f / 2)}`);
        const dx = (r - 0.5) * 2 * shift * amount * (random(`${seed}-${i}`) > 0.35 ? 1 : 0.15);
        const top = (i / bands) * 100, bottom = 100 - ((i + 1) / bands) * 100;
        return (
          <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(${top}% 0 ${bottom}% 0)`, transform: `translateX(${dx}px)`, filter: amount > 0.3 ? `drop-shadow(${12 * amount}px 0 0 ${ghost}) drop-shadow(${-10 * amount}px 0 0 #e4572e)` : undefined }}>
            {children}
          </div>
        );
      })}
    </>
  );
};

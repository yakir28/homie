// A real screenshot seen through a camera: a rounded card tilted in 3D, with a 2D camera inside it that pans and zooms between keys
// given in the image's own pixels. Children are drawn in image pixels too (a cursor, a highlight), so they stay pinned to the interface.
// Use it for any product screenshot that should feel like an object in space rather than a flat full-frame picture.
import React from "react";
import { Easing, Img, interpolate, useCurrentFrame } from "reelkit/frame";

export type ScreenKey = { frame: number; x: number; y: number; zoom: number; rx?: number; ry?: number; rz?: number };

const ease = Easing.bezier(0.65, 0, 0.25, 1);
const at = (keys: ScreenKey[], f: number, pick: (k: ScreenKey) => number) =>
  keys.length === 1 ? pick(keys[0]!) : interpolate(f, keys.map((k) => k.frame), keys.map(pick), { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const TiltScreen: React.FC<{
  src: string; imageWidth: number; imageHeight: number;
  width: number; height: number; left: number; top: number;
  keys: ScreenKey[]; radius?: number; edge?: string; shadow?: string; background?: string; children?: React.ReactNode;
}> = ({ src, imageWidth, imageHeight, width, height, left, top, keys, radius = 36, edge = "rgba(255,255,255,0.10)", shadow = "rgba(0,0,0,0.6)", background = "#111111", children }) => {
  const f = useCurrentFrame();
  const x = at(keys, f, (k) => k.x), y = at(keys, f, (k) => k.y), zoom = at(keys, f, (k) => k.zoom);
  const rx = at(keys, f, (k) => k.rx ?? 0), ry = at(keys, f, (k) => k.ry ?? 0), rz = at(keys, f, (k) => k.rz ?? 0);
  const k = (width / imageWidth) * zoom;
  return (
    <div style={{ position: "absolute", left, top, width, height, perspective: 2600 }}>
      <div style={{ position: "absolute", inset: 0, transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, transformStyle: "preserve-3d", borderRadius: radius, overflow: "hidden", background, boxShadow: `0 60px 120px ${shadow}, 0 0 0 2px ${edge}` }}>
        <div style={{ position: "absolute", left: width / 2 - x * k, top: height / 2 - y * k, width: imageWidth, height: imageHeight, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          <Img src={src} style={{ position: "absolute", inset: 0, width: imageWidth, height: imageHeight }} />
          {children}
        </div>
      </div>
    </div>
  );
};

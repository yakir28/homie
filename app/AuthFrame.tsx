import type { ReactNode } from "react";
import Link from "next/link";
import HomieLogo from "./HomieLogo";

const gallery = Array.from({ length: 14 }, (_, i) => `/gallery/gallery-${String(i + 1).padStart(2, "0")}.jpg`);

// Each column takes a different slice so no photo shows twice side by side, and
// the track repeats itself once so the vertical scroll loops without a seam.
const collageColumns = [0, 1, 2, 3].map((column) => {
  const images = Array.from({ length: 5 }, (_, row) => gallery[(column * 5 + row * 3) % gallery.length]);
  return { images, duration: [32, 38, 30, 36][column], reverse: column % 2 === 1 };
});

export default function AuthFrame({ children, eyebrow = "Welcome back" }: { children: ReactNode; eyebrow?: string }) {
  return <main className="auth-page">
      <section className="auth-collage">
        <div className="auth-grid">
          {collageColumns.map((col, i) => (
            <div className={col.reverse ? "auth-col reverse" : "auth-col"} key={i}>
              <div className="auth-col-track" style={{ animationDuration: `${col.duration}s` }}>
                {[...col.images, ...col.images].map((src, j) => (
                  <img key={j} src={src} alt="" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="auth-scrim" />
        <Link className="auth-brand" href="/" aria-label="Homie home page"><HomieLogo variant="mark-light" /></Link>
        <div className="auth-collage-copy">
          <p className="eyebrow">● {eyebrow}</p>
          <h1>
            Turn listing photos into
            <br />
            <i>home tours that move.</i>
          </h1>
          <p className="auth-tag">STUDIO-QUALITY VIDEOS · NO FILMING · NO PROMPTING</p>
        </div>
      </section>

<section className="auth-form-panel"><div className="auth-form">{children}</div></section>
</main>;
}

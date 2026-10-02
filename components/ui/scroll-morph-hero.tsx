"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import thumbnails from "../../lib/gallery-thumbnails.json";
import styles from "./scroll-morph-hero.module.css";

// Alternate properties, interiors, greenery, sky and water instead of following
// the source gallery's listing groups. Keep the order stable across hydration.
const photoOrder = [
  "/gallery/gallery-10.jpg",
  "/gallery/gallery-25.webp",
  "/gallery/gallery-38.webp",
  "/gallery/gallery-12.jpg",
  "/gallery/gallery-07.jpg",
  "/gallery/gallery-31.webp",
  "/gallery/gallery-14.jpg",
  "/gallery/gallery-09.jpg",
  "/gallery/gallery-21.webp",
  "/gallery/gallery-04.jpg",
  "/gallery/gallery-35.webp",
  "/gallery/gallery-13.jpg",
  "/gallery/gallery-41.webp",
  "/gallery/gallery-18.webp",
  "/gallery/gallery-02.jpg",
  "/gallery/gallery-45.webp",
  "/gallery/gallery-06.jpg",
  "/gallery/gallery-33.webp",
] as const satisfies readonly (keyof typeof thumbnails)[];
const photos = photoOrder.map(key => thumbnails[key]);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function PropertyCard({ index, progress, width, height, phase }: {
  index: number; progress: MotionValue<number>; width: number; height: number; phase: number;
}) {
  const mobile = width < 640;
  const cardWidth = mobile ? 38 : 68;
  const radius = Math.min(width * .36, height * .35, 290);
  const angle = index / photos.length * Math.PI * 2;
  const position = (p: number) => {
    if (phase === 0) return { x: Math.sin(index * 7) * width * .6, y: Math.cos(index * 3) * height * .5, rotate: index * 29, scale: .6 };
    if (phase === 1 && p < .1) return { x: (index - (photos.length - 1) / 2) * (cardWidth + 8), y: 0, rotate: 0, scale: 1 };
    const morph = clamp((p - .12) / .46);
    const sweep = clamp((p - .58) / .42) * 38;
    const arcRadius = width * (mobile ? .9 : .65);
    const arcAngle = (-158 + index / (photos.length - 1) * 136 - sweep) * Math.PI / 180;
    return {
      x: mix(Math.cos(angle) * radius, Math.cos(arcAngle) * arcRadius, morph),
      y: mix(Math.sin(angle) * radius, Math.sin(arcAngle) * arcRadius + arcRadius + height * .17, morph),
      rotate: mix(index / photos.length * 360 + 90, arcAngle * 180 / Math.PI + 90, morph),
      scale: mix(1, mobile ? 1.5 : 1.7, morph),
    };
  };
  const spring = { stiffness: 55, damping: 18 };
  const x = useSpring(useTransform(() => position(progress.get()).x), spring);
  const y = useSpring(useTransform(() => position(progress.get()).y), spring);
  const rotate = useSpring(useTransform(() => position(progress.get()).rotate), spring);
  const scale = useSpring(useTransform(() => position(progress.get()).scale), spring);
  const asset = photos[index];
  return <motion.div className={styles.card} aria-hidden="true"
    style={{ x, y, rotate, scale }} animate={{ opacity: phase === 0 ? 0 : 1 }}>
      <img src={asset.src} srcSet={asset.srcSet} sizes="120px" alt="" loading="lazy" decoding="async" />
  </motion.div>;
}

export default function ScrollMorphHero() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const visible = useInView(stage, { amount: .45, once: true });
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [size, setSize] = useState({ width: 1000, height: 740 });
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 65, damping: 24, restDelta: .001 });
  const introOpacity = useTransform(progress, [.04, .12], [1, 0]);
  const finalOpacity = useTransform(progress, [.38, .58], [0, 1]);
  const finalY = useTransform(progress, [.38, .58], [20, 0]);
  const finalVisibility = useTransform(progress, p => p > .38 ? "visible" : "hidden");

  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || reducedMotion) return;
    const line = setTimeout(() => setPhase(1), 100);
    const circle = setTimeout(() => setPhase(2), 850);
    return () => { clearTimeout(line); clearTimeout(circle); };
  }, [visible, reducedMotion]);

  return <section id="property-stories" ref={root} className={styles.section} aria-label="Every listing, already cinematic">
    <div ref={stage} className={styles.stage}>
      <motion.div className={styles.intro} style={{ opacity: introOpacity }}>
        <p className="section-kicker">The range</p>
        <h2>Every listing.<br />Already cinematic.</h2>
        <p className={styles.hint}>Scroll to see it come together <span aria-hidden="true">↓</span></p>
      </motion.div>
      <motion.div className={styles.result} style={reducedMotion ? undefined : { opacity: finalOpacity, y: finalY, visibility: finalVisibility }}>
        <p className="section-kicker">Your photos. A new perspective.</p>
        <h2>Give your next listing<br />a little movie magic.</h2>
        <p>From city apartments to waterfront homes. Turn your property photos into a cinematic tour with Homie.</p>
        <a className={styles.cta} href="/login">Create your first video <span aria-hidden="true">→</span></a>
      </motion.div>
      <div className={styles.cards}>
        {!reducedMotion && photos.map((_, index) => <PropertyCard key={index} index={index} progress={progress} width={size.width} height={size.height} phase={phase} />)}
      </div>
      <div className={styles.staticPhotos} aria-hidden="true">{photos.slice(0, 6).map((asset, index) => <img key={index} src={asset.src} alt="" loading="lazy" />)}</div>
    </div>
  </section>;
}

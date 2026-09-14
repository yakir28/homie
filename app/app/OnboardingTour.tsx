"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./onboarding-tour.css";

type Props = { open: boolean; hasListings: boolean; onShowListings: () => void; onShowTemplates: () => void; onDismiss: () => void };
type TourStep = { target: string; eyebrow: string; title: string; copy: string; view?: "listings" | "templates" };
type TargetRect = { top: number; left: number; width: number; height: number };

export default function OnboardingTour({ open, hasListings, onShowListings, onShowTemplates, onDismiss }: Props) {
  const steps = useMemo<TourStep[]>(() => [
    { target: "listings-nav", eyebrow: "01 · YOUR PROPERTIES", title: "Start with a listing", copy: "Your imported and uploaded properties live here. Open any listing to review its photos and viewing route." },
    ...(!hasListings ? [{ target: "add-listing", eyebrow: "02 · ADD PHOTOS", title: "Add your first property", copy: "Upload photos or import a listing. Homie automatically organizes the rooms and creates a suggested map.", view: "listings" as const }] : []),
    { target: "template-filters", eyebrow: `${hasListings ? "02" : "03"} · FIND A STYLE`, title: "Narrow down the library", copy: "Use filters to find the right format and visual direction for the property.", view: "templates" },
    { target: "template-card", eyebrow: `${hasListings ? "03" : "04"} · CREATE`, title: "Preview before you create", copy: "Open a template, choose the listing, format, and resolution, then review the credit cost before creating." },
  ], [hasListings]);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const current = steps[Math.min(step, steps.length - 1)];

  useEffect(() => {
    if (!open || !current) return;
    let frame = 0;
    let retry = 0;
    const findVisibleTarget = () => Array.from(document.querySelectorAll<HTMLElement>(`[data-onboarding="${current.target}"]`)).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const update = () => {
      const target = findVisibleTarget();
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    const locate = () => {
      const target = findVisibleTarget();
      if (!target) { retry = window.setTimeout(locate, 120); return; }
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      frame = window.requestAnimationFrame(update);
    };
    locate();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, current]);

  if (!open || !current) return null;

  function goTo(next: number) {
    const destination = steps[next];
    setTargetRect(null);
    if (destination?.view === "listings") onShowListings();
    if (destination?.view === "templates") onShowTemplates();
    setStep(next);
  }

  const padding = 7;
  const spotlightStyle = targetRect ? { top: targetRect.top - padding, left: targetRect.left - padding, width: targetRect.width + padding * 2, height: targetRect.height + padding * 2 } : undefined;
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const targetCenter = targetRect ? targetRect.left + targetRect.width / 2 : viewportWidth / 2;
  const placeBelow = !targetRect || targetRect.top + targetRect.height < viewportHeight * .66;
  const tooltipStyle = { left: Math.max(16, Math.min(viewportWidth - 336, targetCenter - 160)), ...(placeBelow ? { top: Math.min(viewportHeight - 260, (targetRect?.top ?? 90) + (targetRect?.height ?? 0) + 20) } : { bottom: Math.max(16, viewportHeight - (targetRect?.top ?? viewportHeight) + 20) }) } as CSSProperties;

  return <div className="onboarding-tour" role="dialog" aria-labelledby="onboarding-title">
    {targetRect && <div className="onboarding-spotlight" style={spotlightStyle} aria-hidden="true" />}
    <section className={`onboarding-coachmark ${placeBelow ? "below" : "above"}`} style={tooltipStyle}>
      <header><span>{current.eyebrow}</span><button type="button" onClick={onDismiss} aria-label="Skip product tour">×</button></header>
      <h2 id="onboarding-title">{current.title}</h2>
      <p>{current.copy}</p>
      <footer>
        <div className="onboarding-dots" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <i key={index} className={index === step ? "active" : ""} />)}</div>
        <div>{step > 0 && <button type="button" className="onboarding-previous" onClick={() => goTo(step - 1)}>Back</button>}<button type="button" className="onboarding-next" onClick={() => step === steps.length - 1 ? onDismiss() : goTo(step + 1)}>{step === steps.length - 1 ? "Got it" : "Next"}<span>→</span></button></div>
      </footer>
    </section>
  </div>;
}

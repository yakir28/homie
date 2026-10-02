"use client";

import { useRef, type CSSProperties } from "react";
import { useInView } from "framer-motion";
import styles from "./testimonial-marquee.module.css";

// Illustrative copy for the design preview, not verified customer endorsements.
// Replace with permissioned customer quotes before presenting this as social proof.
const samples = [
  { name: "Sarah M.", role: "Residential agent", initials: "SM", tone: "sage", quote: "I had the photos sitting in a folder already. Put them into Homie, picked a style, and finally had something I wanted to post." },
  { name: "Daniel R.", role: "Independent broker", initials: "DR", tone: "sand", quote: "The slower tours are my favorite. You actually get a feel for the rooms instead of rushing past everything." },
  { name: "Maya L.", role: "Property marketing", initials: "ML", tone: "blue", quote: "Love that I can make a vertical video for Instagram and a wide one for the listing. Same photos, much less fuss." },
  { name: "James T.", role: "Listing agent", initials: "JT", tone: "clay", quote: "I just told Homie to open with the kitchen and finish in the garden. Way easier than trying to explain the whole thing to an editor." },
  { name: "Olivia K.", role: "Boutique brokerage", initials: "OK", tone: "sage", quote: "Honestly, picking a template is the hardest part. I keep trying a different one just to see how the house looks." },
  { name: "Alex P.", role: "Real estate team lead", initials: "AP", tone: "blue", quote: "I still watch every video before sharing it. Nice to have everything there to review without downloading a bunch of different files." },
  { name: "Emma W.", role: "Property consultant", initials: "EW", tone: "sand", quote: "Used Homie for a little apartment that didn’t need a huge production. A short, simple tour was exactly what I was after." },
  { name: "Michael B.", role: "Residential agent", initials: "MB", tone: "clay", quote: "Moved a couple of photos around and the tour made so much more sense. Small thing, but I’m glad I can control the room order." },
  { name: "Sophie A.", role: "Listing coordinator", initials: "SA", tone: "sage", quote: "Came back the next morning and my versions were right where I left them. No digging through my downloads to find the one I liked." },
];
const columns = [samples.slice(0, 3), samples.slice(3, 6), samples.slice(6, 9)];

function ReviewCard({ review }: { review: typeof samples[number] }) {
  return <figure className={styles.card}>
    <figcaption className={styles.person}>
      <span className={styles.avatar} data-tone={review.tone} aria-hidden="true">{review.initials}</span>
      <span><strong>{review.name}</strong><small>{review.role}</small></span>
      <span className={styles.badge}>Sample</span>
    </figcaption>
    <blockquote>“{review.quote}”</blockquote>
  </figure>;
}

export default function TestimonialMarquee() {
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, { margin: "100px" });
  return <section ref={root} id="testimonials" className={styles.section} aria-labelledby="testimonials-title">
    <div className={styles.header}>
      <div><p className="section-kicker">A little perspective</p>
        <h2 id="testimonials-title">Made for the way<br />you market homes.</h2>
        <p className={styles.disclosure}>Sample testimonials with fictional profiles, shown to preview the design.</p>
      </div>
    </div>
    <div className={styles.viewport} data-paused={!inView}>
      <div className={styles.wall}>
        {columns.map((reviews, column) => <div className={styles.column} key={column} style={{ "--duration": `${48 + column * 7}s` } as CSSProperties}>
          <div className={styles.track}>
            {[0, 1].map(copy => <div key={copy} className={styles.group} aria-hidden={copy === 1 || undefined}>
              {reviews.map(review => <ReviewCard key={review.name} review={review} />)}
            </div>)}
          </div>
        </div>)}
      </div>
    </div>
  </section>;
}

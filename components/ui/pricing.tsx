"use client";

import type { ReactNode } from "react";
import styles from "./pricing.module.css";

export interface PricingPlan {
  id: string;
  name: string;
  price: number | null;
  period: string;
  billing: string;
  features: string[];
  description: string;
  popular?: boolean;
  current?: boolean;
  action: ReactNode;
  note?: string;
}

export function Pricing({ plans, annual, onAnnualChange, title = "Simple, transparent pricing.", description = "Choose the plan that works for you. Turn your property photos into cinematic listing videos.", controls, headingLevel = 2 }: {
  plans: PricingPlan[];
  annual: boolean;
  onAnnualChange: (annual: boolean) => void;
  title?: string;
  description?: string;
  controls?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return <div className={styles.pricing}>
    <header className={styles.heading}>
      <Heading>{title}</Heading>
      <p>{description}</p>
    </header>
    <div className={styles.toolbar}>
    {controls && <div className={styles.controls}>{controls}</div>}
    <label className={styles.billingToggle}>
      <input type="checkbox" role="switch" checked={annual} onChange={(event) => onAnnualChange(event.target.checked)} />
      <span className={styles.switch} aria-hidden="true" />
      <span>Annual billing <strong>(Save 17%)</strong></span>
    </label>
    </div>
    <div className={styles.grid} data-count={plans.length}>
      {plans.map((plan) => <article key={plan.id} className={`${styles.card} ${plan.popular ? styles.popular : ""}`}>
        {plan.popular && <span className={styles.badge}><span aria-hidden="true">★</span> Popular</span>}
        <h3>{plan.name}</h3>
        {plan.current && <span className={styles.current}>Current plan</span>}
        <div className={styles.price} aria-live="polite" aria-atomic="true">
          <strong key={plan.price}>{plan.price === null ? "Custom" : `$${plan.price.toLocaleString("en-US")}`}</strong>
          <span>{plan.period}</span>
        </div>
        <p className={styles.billing}>{plan.billing}</p>
        <ul>{plan.features.map((feature, index) => <li key={`${index}-${feature}`}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
        <div className={styles.action}>{plan.action}</div>
        <p className={styles.description}>{plan.description}</p>
        {plan.note && <p className={styles.note}>{plan.note}</p>}
      </article>)}
    </div>
    <p className={styles.footer}>Secure billing by Polar. Cancel or change your subscription anytime.</p>
  </div>;
}

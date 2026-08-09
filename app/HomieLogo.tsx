type HomieLogoProps = {
  variant?: "wordmark" | "mark-light" | "mark-dark" | "mark-adaptive";
  className?: string;
};

export default function HomieLogo({ variant = "wordmark", className = "" }: HomieLogoProps) {
  if (variant === "mark-adaptive") {
    return <span className={`homie-logo homie-logo-mark-adaptive ${className}`.trim()} aria-hidden="true">
      <img className="homie-logo-on-light" src="/brand/official/homie-mark-dark-on-cream.png" alt="" />
      <img className="homie-logo-on-dark" src="/brand/official/homie-mark-light-on-charcoal.png" alt="" />
    </span>;
  }

  const source = variant === "wordmark"
    ? "/brand/official/homie-wordmark-dark-on-cream.png"
    : variant === "mark-light"
      ? "/brand/official/homie-mark-light-on-charcoal.png"
      : "/brand/official/homie-mark-dark-on-cream.png";

  return <span className={`homie-logo homie-logo-${variant} ${className}`.trim()} aria-hidden="true">
    <img src={source} alt="" />
  </span>;
}

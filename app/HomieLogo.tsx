type HomieLogoProps = {
  variant?: "wordmark" | "mark-light" | "mark-dark" | "mark-adaptive";
  className?: string;
};

export default function HomieLogo({ variant = "wordmark", className = "" }: HomieLogoProps) {
  if (variant === "mark-adaptive") {
    return <span className={`homie-logo homie-logo-mark-adaptive ${className}`.trim()} aria-hidden="true">
      <img className="homie-logo-on-light" src="/brand/transparent/homie-mark-charcoal.png" alt="" />
      <img className="homie-logo-on-dark" src="/brand/transparent/homie-mark-cream.png" alt="" />
    </span>;
  }

  const source = variant === "wordmark"
    ? "/brand/transparent/homie-wordmark-charcoal.png"
    : variant === "mark-light"
      ? "/brand/transparent/homie-mark-cream.png"
      : "/brand/transparent/homie-mark-charcoal.png";

  return <span className={`homie-logo homie-logo-${variant} ${className}`.trim()} aria-hidden="true">
    <img src={source} alt="" />
  </span>;
}

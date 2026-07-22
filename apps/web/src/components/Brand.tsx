import type { ComponentProps } from "react";
import markUrl from "../assets/orosaga-mark.svg";

export function BrandMark({ alt = "", ...props }: ComponentProps<"img">) {
  return (
    <img
      src={markUrl}
      alt={alt}
      {...props}
      onError={(event) => {
        event.currentTarget.hidden = true;
      }}
    />
  );
}

export function Brand({
  className,
  href = "/",
  ariaLabel = "返回 Orosaga 山海经首页",
}: {
  className?: string;
  href?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      className={["brand", className].filter(Boolean).join(" ")}
      href={href}
      aria-label={ariaLabel}
    >
      <BrandMark />
      <span className="brand-copy">
        <strong>Orosaga</strong>
        <small>山海经</small>
      </span>
    </a>
  );
}

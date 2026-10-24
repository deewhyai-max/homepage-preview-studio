import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Primary CTA with interactive motion: lift on hover, press-down on click,
 * and a shine sweep across the surface — motion feedback on every interaction.
 */
export function MotionLink({
  to,
  children,
  className,
}: {
  to: "/studio" | "/auth";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "btn-shine relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0 active:scale-[0.97]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

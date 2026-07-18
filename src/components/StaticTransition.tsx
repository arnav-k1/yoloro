"use client";

interface StaticTransitionProps {
  flipToken: number;
}

/** Brief CRT static/flicker flash shown for a moment after a channel change. */
export function StaticTransition({ flipToken }: StaticTransitionProps) {
  return (
    <div
      key={flipToken}
      className="pointer-events-none absolute inset-0 z-40 animate-static-flicker"
      aria-hidden
    />
  );
}

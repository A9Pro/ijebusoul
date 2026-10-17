"use client";

/** A short fade on every page change, so navigation reads as one smooth motion instead of a jump. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes pgIn{from{opacity:0}to{opacity:1}}.pg-in{animation:pgIn .18s ease-out both}@media (prefers-reduced-motion:reduce){.pg-in{animation:none}}`}</style>
      <div className="pg-in">{children}</div>
    </>
  );
}
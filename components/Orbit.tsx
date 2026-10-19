import type { CSSProperties } from "react";

export function Orbit({ size = "14rem", single = false }: { size?: string; single?: boolean }) {
  return (
    <div
      className={`orbit${single ? " single" : ""}`}
      style={{ "--size": size } as CSSProperties}
      aria-hidden="true"
    >
      <span className="center" />
      <span className="body a" />
      <span className="body b" />
    </div>
  );
}

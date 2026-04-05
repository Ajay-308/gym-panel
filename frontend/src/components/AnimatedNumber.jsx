import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(() => Number(value));
  const fromRef = useRef(Number(value));

  useEffect(() => {
    const end = Number(value);
    const start = fromRef.current;
    fromRef.current = end;
    const t0 = performance.now();
    const dur = 400;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - (1 - p) ** 2;
      setDisplay(start + (end - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const n = decimals > 0 ? display.toFixed(decimals) : Math.round(display);
  return (
    <span className="mono">
      {prefix}
      {n}
      {suffix}
    </span>
  );
}

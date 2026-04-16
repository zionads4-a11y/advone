import { useEffect, useState } from "react";
import { useScrollReveal } from "./useScrollReveal";

interface AnimatedCounterProps {
  value: string;
  label: string;
}

export function AnimatedCounter({ value, label }: AnimatedCounterProps) {
  const { ref, visible } = useScrollReveal();
  const [display, setDisplay] = useState(value);

  // If value is a number, animate it
  useEffect(() => {
    if (!visible) return;
    // Only animate values that are purely numeric with an optional trailing suffix (e.g. "100%", "5x")
    const match = value.match(/^(\d+)(\D*)$/);
    const num = match ? parseInt(match[1]) : NaN;
    if (isNaN(num) || num === 0) {
      setDisplay(value);
      return;
    }

    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    const suffix = value.replace(/[\d]/g, "");

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * num);
      setDisplay(`${start}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [visible, value]);

  return (
    <div ref={ref} className="text-center">
      <p
        className="mb-1 text-3xl font-bold text-[hsl(153,60%,45%)] md:text-4xl"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {display}
      </p>
      <p className="text-sm text-[hsl(220,10%,55%)]">{label}</p>
    </div>
  );
}

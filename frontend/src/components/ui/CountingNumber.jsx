import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';

/**
 * High-precision animated number counter with:
 * - Smooth easeOutQuart interpolation on initial scroll-into-view
 * - Smooth transition from previous value to new value whenever `value` changes
 * - Optional `liveStep` / `liveIntervalMs` for real-time telemetry counters
 * - Tabular numerals (`tabular-nums`) to prevent horizontal layout jitter
 */
export function CountingNumber({
  value = 0,
  decimals = 0,
  locale = 'vi-VN',
  duration = 1200,
  startOnView = true,
  prefix = '',
  suffix = '',
  liveStep = 0,
  liveIntervalMs = 3500,
  className = '',
  style
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20px 0px' });
  const targetNumeric = Number(value) || 0;

  const [liveOffset, setLiveOffset] = useState(0);
  const effectiveTarget = targetNumeric + liveOffset;

  const [display, setDisplay] = useState(() => (startOnView ? 0 : effectiveTarget));
  const currentValRef = useRef(startOnView ? 0 : effectiveTarget);
  const hasStartedRef = useRef(!startOnView);

  // Reset liveOffset if base value prop changes
  useEffect(() => {
    setLiveOffset(0);
  }, [targetNumeric]);

  // Optional live micro-tick for real-time telemetry counters
  useEffect(() => {
    if (!liveStep || liveStep <= 0) return undefined;
    const timer = window.setInterval(() => {
      setLiveOffset((prev) => Number((prev + liveStep).toFixed(decimals)));
    }, liveIntervalMs);
    return () => window.clearInterval(timer);
  }, [liveStep, liveIntervalMs, decimals]);

  useEffect(() => {
    const shouldAnimate = !startOnView || inView || hasStartedRef.current;
    if (!shouldAnimate) return undefined;

    const isFirstRun = !hasStartedRef.current;
    hasStartedRef.current = true;

    const fromValue = isFirstRun ? 0 : currentValRef.current;
    const toValue = effectiveTarget;

    if (Math.abs(toValue - fromValue) < 0.0001) {
      setDisplay(toValue);
      currentValRef.current = toValue;
      return undefined;
    }

    const animDuration = isFirstRun ? duration : Math.min(550, duration * 0.55);
    let startTime = null;
    let rafId = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / animDuration);
      // easeOutQuart for crisp executive feel
      const eased = 1 - Math.pow(1 - progress, 4);
      const nextVal = fromValue + (toValue - fromValue) * eased;

      currentValRef.current = nextVal;
      setDisplay(nextVal);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        currentValRef.current = toValue;
        setDisplay(toValue);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [effectiveTarget, inView, startOnView, duration]);

  const formatted = Number(display).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <span
      ref={ref}
      className={`ccadro-counter ${className}`.trim()}
      style={{
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
        ...style
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default CountingNumber;

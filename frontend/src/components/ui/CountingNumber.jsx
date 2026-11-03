import React, { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';

/**
 * Spring-animated number counter (React 18 compatible, motion-based).
 * Starts counting when scrolled into view and formats with the given locale.
 */
export function CountingNumber({
  value = 0,
  decimals = 0,
  locale = 'vi-VN',
  startOnView = true,
  className
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!startOnView || inView) {
      motionVal.set(Number(value) || 0);
    }
  }, [value, inView, startOnView, motionVal]);

  useEffect(() => springVal.on('change', (latest) => setDisplay(latest)), [springVal]);

  const formatted = Number(display).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}

export default CountingNumber;

import React from 'react';
import { motion } from 'motion/react';
import { HALVI_EASE, HALVI_VIEWPORT_ONCE } from './motionTokens';

/**
 * Scroll-triggered reveal wrapper (fade + slide up once when entering the viewport).
 */
export default function Reveal({ as = 'div', delay = 0, y = 28, className, style, children }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={HALVI_VIEWPORT_ONCE}
      transition={{ duration: 0.7, delay, ease: HALVI_EASE }}
    >
      {children}
    </Tag>
  );
}

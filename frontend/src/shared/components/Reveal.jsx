import React from 'react';
import { motion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1];

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
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

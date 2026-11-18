import React from 'react';

export function ShimmeringText({ text, className = '', style = {} }) {
  return (
    <span
      className={`shimmering-text ${className}`}
      style={{
        background:
          'linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, #38bdf8 50%, rgba(255, 255, 255, 0.7) 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        animation: 'shimmer-slide 3s linear infinite',
        display: 'inline-block',
        ...style
      }}
    >
      {text}
    </span>
  );
}

export default ShimmeringText;

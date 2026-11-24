/**
 * Shared Motion & Effect Primitives (Halvi-Inspired Calibration)
 * Single source of truth for easing curves, spring presets, viewport config,
 * and View Transitions API circular theme reveal.
 */

export const HALVI_EASE = [0.22, 1, 0.36, 1];
export const HALVI_POP_EASE = [0.34, 1.56, 0.64, 1];
export const HALVI_SPRING = { type: 'spring', stiffness: 420, damping: 32 };
export const HALVI_VIEWPORT_ONCE = { once: true, margin: '-60px' };

export const CARD_ENTRANCE_TRANSITION = { duration: 0.42, ease: HALVI_EASE };

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Triggers a smooth radial clip-path theme reveal from the pointer/button origin
 * using the View Transitions API, gracefully falling back to instant swap when unsupported.
 */
export function triggerCircularThemeReveal(event, applyThemeDom) {
  if (
    typeof document === 'undefined' ||
    typeof document.startViewTransition !== 'function' ||
    prefersReducedMotion()
  ) {
    applyThemeDom();
    return;
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  let x = vw - 64;
  let y = 28;

  const rect = event?.currentTarget?.getBoundingClientRect?.();
  if (rect && rect.width > 0) {
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  } else if (typeof event?.clientX === 'number' && event.clientX > 0) {
    x = event.clientX;
    y = event.clientY;
  }

  const maxRadius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));

  try {
    const transition = document.startViewTransition(applyThemeDom);
    transition.ready
      .then(() => {
        document.documentElement.animate?.(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 450,
            easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      })
      .catch(() => {});
  } catch (_) {
    applyThemeDom();
  }
}


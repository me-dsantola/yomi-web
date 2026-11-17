export type PagePointer = Readonly<{ x: number; y: number }>;

let pointer: PagePointer | null = null;
let consumers = 0;

const move = (event: PointerEvent) => {
  pointer = event.pointerType === 'touch' ? null : { x: event.clientX, y: event.clientY };
};
const clear = () => { pointer = null; };
const exit = (event: PointerEvent) => { if (!event.relatedTarget) clear(); };
const visibility = () => { if (document.hidden) clear(); };

/** A single passive page listener, shared by every visible companion. */
export function trackPagePointer(): () => void {
  if (consumers++ === 0) {
    window.addEventListener('pointermove', move, { capture: true, passive: true });
    window.addEventListener('pointerout', exit);
    window.addEventListener('pointercancel', clear);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--consumers === 0) {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerout', exit);
      window.removeEventListener('pointercancel', clear);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
      clear();
    }
  };
}

export const getPagePointer = () => pointer;

/** Viewport-relative angles avoid immediately saturating outside a small avatar. */
export function pagePointerLook(
  position: PagePointer,
  bounds: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number },
) {
  const dx = position.x - bounds.left - bounds.width / 2;
  const dy = position.y - bounds.top - bounds.height / 2;
  const width = Math.max(1, bounds.width * 2, viewport.width / 2);
  const height = Math.max(1, bounds.height * 2, viewport.height / 2);
  return {
    yaw: Math.max(-45, Math.min(45, dx / width * 45)),
    pitch: Math.max(-30, Math.min(30, -dy / height * 30)),
  };
}

/**
 * GlowCard — cursor-tracked border glow + click ripple (the light-theme
 * pieces of React Bits' MagicBento, without the gsap dependency).
 *
 * The border glow follows the pointer via CSS variables (no re-renders);
 * it only engages for mouse pointers, so touch devices skip it. The click
 * ripple is a one-shot CSS animation and works for touch too, unless the
 * user prefers reduced motion.
 *
 * Polymorphic: pass `as={Link}` (plus its props) to wrap router links.
 */
import React, { useCallback, useRef } from "react";

export default function GlowCard({ as: Comp = "div", className = "", children, onClick: onClickProp, ...props }) {
  const ref = useRef(null);

  const onPointerMove = useCallback((e) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--glow-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    el.style.setProperty("--glow-intensity", "1");
  }, []);

  const onPointerLeave = useCallback(() => {
    ref.current?.style.setProperty("--glow-intensity", "0");
  }, []);

  const onClick = useCallback((e) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const maxDistance = Math.max(
      Math.hypot(x, y),
      Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height),
      Math.hypot(x - rect.width, y - rect.height)
    );
    const ripple = document.createElement("span");
    ripple.className = "glow-ripple";
    ripple.style.width = ripple.style.height = `${maxDistance * 2}px`;
    ripple.style.left = `${x - maxDistance}px`;
    ripple.style.top = `${y - maxDistance}px`;
    ripple.addEventListener("animationend", () => ripple.remove());
    el.appendChild(ripple);
  }, []);

  return (
    <Comp
      ref={ref}
      className={`glow-card overflow-hidden ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={(e) => {
        onClick(e);
        onClickProp?.(e);
      }}
      {...props}
    >
      {children}
    </Comp>
  );
}

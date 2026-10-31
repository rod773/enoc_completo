"use client";

import { useCallback, useEffect, useRef } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";

type Axis = "y" | "x";

const getPosition = (el: HTMLElement, axis: Axis) => (axis === "y" ? el.scrollTop : el.scrollLeft);
const setPosition = (el: HTMLElement, axis: Axis, value: number) => {
  if (axis === "y") el.scrollTop = value;
  else el.scrollLeft = value;
};

export function useSmoothScroll<T extends HTMLElement>(axis: Axis = "y") {
  const ref = useRef<T | null>(null);
  const position = useMotionValue(0);
  const control = useRef<{ stop: () => void } | null>(null);

  useMotionValueEvent(position, "change", (value) => {
    const el = ref.current;
    if (el && Math.abs(getPosition(el, axis) - value) > 0.5) setPosition(el, axis, value);
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cancel = () => {
      control.current?.stop();
      control.current = null;
    };
    el.addEventListener("wheel", cancel, { passive: true });
    el.addEventListener("touchstart", cancel, { passive: true });
    el.addEventListener("pointerdown", cancel, { passive: true });
    return () => {
      el.removeEventListener("wheel", cancel);
      el.removeEventListener("touchstart", cancel);
      el.removeEventListener("pointerdown", cancel);
    };
  }, []);

  const scrollTo = useCallback(
    (target: number, duration = 0.65) => {
      const el = ref.current;
      if (!el) return;
      control.current?.stop();
      const size = axis === "y" ? el.scrollHeight : el.scrollWidth;
      const client = axis === "y" ? el.clientHeight : el.clientWidth;
      const max = Math.max(size - client, 0);
      const clamped = Math.max(0, Math.min(target, max));
      if (Math.abs(getPosition(el, axis) - clamped) < 2) return;
      position.set(getPosition(el, axis));
      control.current = animate(position, clamped, {
        duration,
        ease: [0.22, 1, 0.36, 1],
      });
    },
    [axis, position]
  );

  const scrollToElement = useCallback(
    (element: HTMLElement | null, duration = 0.65) => {
      const el = ref.current;
      if (!element || !el) return;
      const top = element.offsetTop - el.clientHeight * 0.22;
      scrollTo(top, duration);
    },
    [scrollTo]
  );

  const centerElement = useCallback(
    (element: HTMLElement | null, duration = 0.5) => {
      const el = ref.current;
      if (!element || !el) return;
      const target = element.offsetLeft - el.clientWidth / 2 + element.offsetWidth / 2;
      scrollTo(target, duration);
    },
    [scrollTo]
  );

  return { ref, scrollTo, scrollToElement, centerElement };
}

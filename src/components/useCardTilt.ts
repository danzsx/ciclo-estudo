import { useCallback, useEffect, useRef } from "react";

export interface UseCardTiltOptions {
  /** Inclinação máxima em graus (discreta: ~6° no grid, ~9° no visualizador ampliado). */
  maxTilt?: number;
  /** Permite arrastar com o dedo para inclinar (usar apenas no visualizador ampliado, nunca no grid). */
  allowTouchDrag?: boolean;
  /** Desativa o efeito (ex.: quando reduzido por preferência ou carta desativada). */
  disabled?: boolean;
}

/**
 * Controla inclinação 2.5D, paralaxe em camadas e reflexo metálico via CSS Custom Properties
 * sem causar re-renderizações React a cada frame.
 */
export function useCardTilt<T extends HTMLElement = HTMLDivElement>(options: UseCardTiltOptions = {}) {
  const { maxTilt = 6, allowTouchDrag = false, disabled = false } = options;
  const ref = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const applyTilt = useCallback(
    (clientX: number, clientY: number, active: boolean) => {
      const el = ref.current;
      if (!el || disabled || reducedMotionRef.current) return;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!active) {
          el.dataset.tilting = "false";
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
          el.style.setProperty("--px", "0");
          el.style.setProperty("--py", "0");
          el.style.setProperty("--glare-x", "50%");
          el.style.setProperty("--glare-y", "50%");
          el.style.setProperty("--glare-opacity", "0");
          return;
        }

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const rawX = (clientX - rect.left) / rect.width;
        const rawY = (clientY - rect.top) / rect.height;
        const nx = Math.max(-1, Math.min(1, rawX * 2 - 1));
        const ny = Math.max(-1, Math.min(1, rawY * 2 - 1));

        const rx = (-ny * maxTilt).toFixed(2);
        const ry = (nx * maxTilt).toFixed(2);

        el.dataset.tilting = "true";
        el.style.setProperty("--rx", `${rx}deg`);
        el.style.setProperty("--ry", `${ry}deg`);
        el.style.setProperty("--px", nx.toFixed(3));
        el.style.setProperty("--py", ny.toFixed(3));
        el.style.setProperty("--glare-x", `${((nx + 1) * 50).toFixed(1)}%`);
        el.style.setProperty("--glare-y", `${((ny + 1) * 50).toFixed(1)}%`);
        el.style.setProperty("--glare-opacity", "1");
      });
    },
    [disabled, maxTilt],
  );

  const onPointerEnter = useCallback(
    (e: React.PointerEvent<T>) => {
      if (e.pointerType === "touch") return;
      applyTilt(e.clientX, e.clientY, true);
    },
    [applyTilt],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      if (e.pointerType === "touch" && !allowTouchDrag) return;
      if (e.pointerType === "touch" && e.buttons === 0) return;
      applyTilt(e.clientX, e.clientY, true);
    },
    [allowTouchDrag, applyTilt],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<T>) => {
      if (e.pointerType === "touch") {
        applyTilt(e.clientX, e.clientY, true);
      }
    },
    [applyTilt],
  );

  const onPointerLeave = useCallback(() => {
    applyTilt(0, 0, false);
  }, [applyTilt]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<T>) => {
      if (e.pointerType === "touch") {
        applyTilt(0, 0, false);
      }
    },
    [applyTilt],
  );

  const onPointerCancel = useCallback(() => {
    applyTilt(0, 0, false);
  }, [applyTilt]);

  return {
    ref,
    tiltHandlers: {
      onPointerEnter,
      onPointerMove,
      onPointerDown,
      onPointerLeave,
      onPointerUp,
      onPointerCancel,
    },
  };
}


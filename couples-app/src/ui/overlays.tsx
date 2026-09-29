import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Bottom sheets y modales. Se montan dentro del marco de la app. */

const EXIT_MS = 240;

function useDelayedUnmount(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);
  return { mounted, closing };
}

function overlayRoot() {
  return document.getElementById('overlay-root') ?? document.body;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label?: string;
}

export function Sheet({ open, onClose, children, label }: SheetProps) {
  const { mounted, closing } = useDelayedUnmount(open);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  if (!mounted) return null;

  // Arrastrar hacia abajo para cerrar.
  const onTouchStart = (e: React.TouchEvent) => {
    if ((sheetRef.current?.scrollTop ?? 0) > 0) return;
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
    sheetRef.current.style.transition = 'none';
  };
  const onTouchEnd = () => {
    if (!drag.current || !sheetRef.current) return;
    const { dy } = drag.current;
    drag.current = null;
    sheetRef.current.style.transition = 'transform 220ms var(--ease-out)';
    sheetRef.current.style.transform = '';
    if (dy > 110) onClose();
  };

  return createPortal(
    <div className={`overlay ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="backdrop" onClick={onClose} />
      <div
        ref={sheetRef}
        className="sheet"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet__handle" />
        {children}
      </div>
    </div>,
    overlayRoot(),
  );
}

export function Modal({ open, onClose, children, label }: SheetProps) {
  const { mounted, closing } = useDelayedUnmount(open);
  if (!mounted) return null;
  return createPortal(
    <div className={`overlay overlay--center ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="backdrop" onClick={onClose} />
      <div className="modal">{children}</div>
    </div>,
    overlayRoot(),
  );
}

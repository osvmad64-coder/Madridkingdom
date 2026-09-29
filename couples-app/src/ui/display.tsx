import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Partner } from '../models/types';
import { Icon } from './Icon';

/** Componentes de presentación reutilizables. */

export function ScreenHeader({
  eyebrow,
  title,
  onBack,
  backLabel = 'Atrás',
  right,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <header className="anim-fade-up">
      {onBack && (
        <button type="button" className="back-btn" onClick={onBack}>
          <Icon name="chevronLeft" size={20} /> {backLabel}
        </button>
      )}
      <div className="screen-header">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="display">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

export function SectionHead({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({ value, variant }: { value: number; variant?: 'streak' | 'gold' }) {
  return (
    <div className={`progress ${variant ? `progress--${variant}` : ''}`} role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function StatTile({ emoji, value, label, tone }: { emoji: string; value: ReactNode; label: string; tone?: string }) {
  return (
    <div className="stat" data-tone={tone}>
      <span aria-hidden="true">{emoji}</span>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty anim-fade-up">
      <div className="empty__emoji">{emoji}</div>
      <p className="empty__title">{title}</p>
      {children && <div className="small">{children}</div>}
    </div>
  );
}

export function Skeleton({ height = 80 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />;
}

export function AvatarPair({ partners, size = 44 }: { partners: Partner[]; size?: number }) {
  return (
    <div className="avatar-pair">
      {partners.map((p) => (
        <span key={p.id} className="avatar" style={{ width: size, height: size, fontSize: size * 0.5 }} title={p.name}>
          {p.avatar}
        </span>
      ))}
    </div>
  );
}

const fmt = new Intl.NumberFormat('es-MX');
export const formatNumber = (n: number) => fmt.format(Math.round(n));

/** Número que "cuenta" suavemente hasta su nuevo valor. */
export function AnimatedNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    if (a === value) return;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * eased;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="num">{formatNumber(shown)}</span>;
}

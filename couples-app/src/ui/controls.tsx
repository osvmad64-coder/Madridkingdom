import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { haptic } from './haptics';

/** Controles básicos del design system. */

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger' | 'default';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: boolean;
}

export function Button({
  variant = 'default',
  size = 'md',
  block,
  icon,
  className = '',
  onClick,
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    variant !== 'default' && `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    icon && 'btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={(e) => {
        haptic();
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

interface ChipProps {
  selected?: boolean;
  emoji?: string;
  children: ReactNode;
  onToggle?: () => void;
}

export function Chip({ selected = false, emoji, children, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      className="chip"
      aria-pressed={selected}
      onClick={() => {
        haptic();
        onToggle?.();
      }}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => {
        haptic();
        onChange();
      }}
    />
  );
}

interface SegmentedProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className="segmented" role="group">
      <span
        className="segmented__thumb"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

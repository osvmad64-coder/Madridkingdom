import { useRef, useState, type ReactNode } from 'react';
import { Button, Chip, Switch } from './controls';
import { haptic } from './haptics';
import { Modal } from './overlays';
import { primeMedia, processImage, useMedia } from './useMedia';
import { media } from '../storage/media';

/** Piezas de formulario compartidas por los editores (retos, posiciones, citas). */

export function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <div className="form-section__head">
        <p className="eyebrow">{title}</p>
        {hint && <p className="tiny muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  big?: boolean;
}

export function TextField({ id, label, value, onChange, placeholder, rows, maxLength, required, big }: TextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {rows ? (
        <textarea
          id={id}
          className={`input ${big ? 'input--big' : ''}`}
          rows={rows}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

interface Opt<T extends string | number> {
  id: T;
  label: string;
  emoji?: string;
}

/** Grupo de chips de selección única. */
export function ChipSelect<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly Opt<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <Chip key={String(o.id)} emoji={o.emoji} selected={o.id === value} onToggle={() => onChange(o.id)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

/** Grupo de chips de selección múltiple. */
export function ChipMulti<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Opt<T>[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <Chip
            key={o.id}
            emoji={o.emoji}
            selected={on}
            onToggle={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
          >
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}

/** Puntos: opciones rápidas + valor libre. */
export function PointsField({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  options: readonly number[];
}) {
  return (
    <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
      <div className="chips">
        {options.map((p) => (
          <Chip key={p} selected={value === p} onToggle={() => onChange(p)}>
            ⭐ +{p}
          </Chip>
        ))}
      </div>
      <div className="row points-input">
        <label htmlFor={id} className="small muted">Otro valor</label>
        <input
          id={id}
          className="input"
          type="number"
          inputMode="numeric"
          min={0}
          step={10}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

export function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="toggle-row">
      <div className="grow">
        <p style={{ fontWeight: 700 }}>{label}</p>
        {hint && <p className="tiny muted">{hint}</p>}
      </div>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

export function EmojiPicker({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="emoji-picker" role="radiogroup" aria-label="Ícono">
      {options.map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={e === value}
          className="emoji-picker__opt"
          onClick={() => {
            haptic();
            onChange(e);
          }}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

/** Lista escrita "una por línea" (preparación, instrucciones). */
export const linesToText = (l: string[]) => l.join('\n');
export const textToLines = (t: string) => t.split('\n');
export const tagsToText = (l: string[]) => l.join(', ');
export const textToTags = (t: string) =>
  t
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * Selector de imagen: la reduce, la guarda en el almacén de medios y
 * devuelve sus ids (imagen completa + miniatura).
 */
export function ImageField({
  imageId,
  onChange,
  label = 'Imagen',
}: {
  imageId?: string;
  onChange: (ids: { imageId?: string; thumbId?: string }) => void;
  label?: string;
}) {
  const url = useMedia(imageId);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const { full, thumb } = await processImage(file);
      const [imageId, thumbId] = await Promise.all([media.put(full), media.put(thumb)]);
      primeMedia(imageId, full);
      primeMedia(thumbId, thumb);
      onChange({ imageId, thumbId });
    } catch {
      setError('No pudimos leer esa imagen. Prueben con un JPG o PNG.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <label>{label}</label>
      <button type="button" className={`image-field ${url ? 'has-image' : ''}`} onClick={() => input.current?.click()}>
        {url ? <img src={url} alt="" /> : <span className="image-field__empty">{busy ? 'Guardando…' : '🖼️ Elegir imagen'}</span>}
      </button>
      {url && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>Cambiar</Button>
          <Button variant="ghost" size="sm" onClick={() => onChange({ imageId: undefined, thumbId: undefined })}>Quitar</Button>
        </div>
      )}
      {error && <p className="tiny" style={{ color: 'var(--rose-700)' }}>{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Confirmación dentro de la app (el navegador no siempre muestra confirm()). */
export function ConfirmModal({
  open,
  emoji,
  title,
  text,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  emoji: string;
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="stack">
        <div className="celebrate-emoji">{emoji}</div>
        <h2 className="title">{title}</h2>
        <p className="small muted">{text}</p>
        <Button variant="primary" block onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="ghost" block onClick={onClose}>Cancelar</Button>
      </div>
    </Modal>
  );
}

/** Barra inferior fija con el botón principal del editor. */
export function SaveBar({ children }: { children: ReactNode }) {
  return <div className="save-bar">{children}</div>;
}

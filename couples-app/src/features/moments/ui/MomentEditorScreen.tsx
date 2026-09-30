import { useState } from 'react';
import { navigate } from '../../../app/router';
import { useToday } from '../../../app/useToday';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, ScreenHeader } from '../../../ui/display';
import { ChipSelect, ConfirmModal, EmojiPicker, FormSection, SaveBar, TextField, ToggleRow } from '../../../ui/forms';
import { createMoment, deleteMoment, updateMoment, type MomentInput } from '../actions';
import { kindInfo, MOMENT_KINDS } from '../kinds';
import type { MomentKind } from '../model';

const EMOJIS = ['❤️', '💋', '🌹', '🎂', '💕', '⭐', '💍', '🏡', '✈️', '🌅', '🐶', '🥂', '🎁', '📸', '🌙', '✨'];

/** Crear / editar una fecha importante. */
export function MomentEditorScreen({ id, kind }: { id?: string; kind?: string | null }) {
  const s = useAppState();
  const today = useToday();
  const existing = id ? s.importantDates.find((m) => m.id === id) : undefined;
  if (id && !existing) {
    return (
      <>
        <ScreenHeader onBack={() => navigate('/nosotros/momentos')} backLabel="Momentos" title="Fecha" />
        <EmptyState emoji="🫧" title="Esta fecha ya no existe" />
      </>
    );
  }
  const k = kindInfo((kind as MomentKind) || 'first-date');
  const initial: MomentInput = existing
    ? { ...existing }
    : { kind: k.id, title: k.defaultTitle, date: today, emoji: k.emoji, note: '', recurring: k.recurring };
  return <Editor key={id ?? 'new'} id={id} initial={initial} />;
}

function Editor({ id, initial }: { id?: string; initial: MomentInput }) {
  const [f, setF] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof MomentInput>(k: K, v: MomentInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.title.trim() && f.date;

  const chooseKind = (kind: MomentKind) => {
    const prev = kindInfo(f.kind);
    const next = kindInfo(kind);
    setF((x) => ({
      ...x,
      kind,
      // Solo cambia título/ícono si seguían siendo los sugeridos.
      title: !x.title || x.title === prev.defaultTitle ? next.defaultTitle : x.title,
      emoji: x.emoji === prev.emoji ? next.emoji : x.emoji,
      recurring: next.recurring,
    }));
  };
  const save = () => {
    dispatch(id ? updateMoment(id, f) : createMoment(f));
    navigate('/nosotros/momentos');
  };

  return (
    <div className="stack editor" style={{ '--gap': '22px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/nosotros/momentos')}
        backLabel="Momentos"
        eyebrow="❤️ Fecha importante"
        right={
          <Button variant="soft" size="sm" disabled={!valid} onClick={save}>
            Guardar
          </Button>
        }
        title={id ? <>Editar <em>fecha</em></> : <>Nueva <em>fecha</em></>}
      />
      <FormSection title="Tipo">
        <ChipSelect options={MOMENT_KINDS} value={f.kind} onChange={chooseKind} />
      </FormSection>
      <TextField id="mo-title" label="Nombre" required value={f.title} maxLength={60} placeholder="Ej. Nuestro viaje a Ensenada" onChange={(v) => set('title', v)} />
      <div className="field">
        <label htmlFor="mo-date">Fecha<span className="req"> *</span></label>
        <input id="mo-date" type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} />
      </div>
      <FormSection title="Ícono">
        <EmojiPicker value={f.emoji} options={EMOJIS} onChange={(v) => set('emoji', v)} />
      </FormSection>
      <TextField id="mo-note" label="Descripción (opcional)" rows={2} maxLength={160} value={f.note ?? ''} onChange={(v) => set('note', v)} />
      <div className="card card--flat">
        <ToggleRow label="Se celebra cada año" hint="Aparece en próximas fechas con su cuenta regresiva" checked={f.recurring} onChange={() => set('recurring', !f.recurring)} />
      </div>
      <SaveBar>
        <Button variant="primary" size="lg" block disabled={!valid} onClick={save}>
          Guardar fecha
        </Button>
      </SaveBar>
      {id && (
        <Button variant="danger" block onClick={() => setConfirm(true)}>
          🗑️ Eliminar fecha
        </Button>
      )}
      <ConfirmModal
        open={confirm}
        emoji="🗑️"
        title="¿Eliminar esta fecha?"
        text="Se quita de su historia y de las próximas fechas."
        confirmLabel="Sí, eliminar"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch(deleteMoment(id!));
          navigate('/nosotros/momentos');
        }}
      />
    </div>
  );
}

import { useState } from 'react';
import { navigate } from '../../../app/router';
import { useToday } from '../../../app/useToday';
import { addDays } from '../../../domain/time';
import { dispatch, useAppState } from '../../../store/store';
import { Button, Chip } from '../../../ui/controls';
import { EmptyState, ScreenHeader } from '../../../ui/display';
import { ConfirmModal, FormSection, ImageField, SaveBar, TextField } from '../../../ui/forms';
import { createLetter, deleteLetter, updateLetter, type LetterInput } from '../actions';
import { canEditLetter, findLetter } from '../service';

/** Escribir / editar una carta (solo mientras nadie la haya abierto). */
export function LetterEditorScreen({ id }: { id?: string }) {
  const s = useAppState();
  const existing = id ? findLetter(s, id) : undefined;
  if (id && (!existing || !canEditLetter(existing))) {
    return (
      <>
        <ScreenHeader onBack={() => navigate('/nosotros/cartas')} backLabel="Cartas" title="Carta" />
        <EmptyState emoji="💌" title={existing ? 'Esta carta ya se abrió' : 'Esta carta ya no existe'}>
          Las cartas abiertas se guardan tal como se escribieron.
        </EmptyState>
      </>
    );
  }
  const [p1, p2] = s.profile.partners;
  const initial: LetterInput = existing
    ? { ...existing, unlockOn: existing.unlockOn ?? '' }
    : { title: '', message: '', unlockOn: '', fromId: p1.id, toId: p2.id };
  return <Editor key={id ?? 'new'} id={id} initial={initial} />;
}

function Editor({ id, initial }: { id?: string; initial: LetterInput }) {
  const s = useAppState();
  const today = useToday();
  const [f, setF] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof LetterInput>(k: K, v: LetterInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.title.trim() && f.message.trim();
  const save = () => {
    dispatch(id ? updateLetter(id, f) : createLetter(f));
    navigate('/nosotros/cartas');
  };

  return (
    <div className="stack editor" style={{ '--gap': '22px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/nosotros/cartas')}
        backLabel="Cartas"
        eyebrow="💌 Carta para el futuro"
        right={
          <Button variant="soft" size="sm" disabled={!valid} onClick={save}>
            Guardar
          </Button>
        }
        title={id ? <>Editar <em>carta</em></> : <>Nueva <em>carta</em></>}
      />

      <FormSection title="De">
        <div className="chips">
          {s.profile.partners.map((p) => (
            <Chip key={p.id} emoji={p.avatar} selected={f.fromId === p.id} onToggle={() => setF((x) => ({ ...x, fromId: p.id, toId: s.profile.partners.find((o) => o.id !== p.id)?.id }))}>
              {p.name}
            </Chip>
          ))}
        </div>
      </FormSection>

      <TextField id="lt-title" label="Título" required value={f.title} maxLength={60} placeholder="Ej. Para nuestro primer aniversario" onChange={(v) => set('title', v)} />
      <TextField id="lt-message" label="Mensaje" required big rows={8} value={f.message} placeholder="Escribe lo que quieras que lea ese día…" onChange={(v) => set('message', v)} />

      <div className="field">
        <label htmlFor="lt-unlock">Fecha de desbloqueo (opcional)</label>
        <input
          id="lt-unlock"
          type="date"
          className="input"
          min={addDays(today, 1)}
          value={f.unlockOn ?? ''}
          onChange={(e) => set('unlockOn', e.target.value)}
        />
        <p className="tiny muted" style={{ paddingLeft: 4 }}>
          {f.unlockOn ? 'Nadie podrá leerla antes de ese día.' : 'Sin fecha: se puede abrir de inmediato.'}
          {f.unlockOn && (
            <button type="button" className="link" style={{ marginLeft: 8 }} onClick={() => set('unlockOn', '')}>
              Quitar fecha
            </button>
          )}
        </p>
      </div>

      <ImageField label="Foto (opcional)" imageId={f.imageId} onChange={(ids) => setF((x) => ({ ...x, ...ids }))} />

      <SaveBar>
        <Button variant="primary" size="lg" block disabled={!valid} onClick={save}>
          {f.unlockOn ? '🔒 Guardar carta' : '💌 Guardar carta'}
        </Button>
      </SaveBar>
      {id && (
        <Button variant="danger" block onClick={() => setConfirm(true)}>
          🗑️ Eliminar carta
        </Button>
      )}
      <ConfirmModal
        open={confirm}
        emoji="🗑️"
        title="¿Eliminar esta carta?"
        text="No se podrá recuperar."
        confirmLabel="Sí, eliminar"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch(deleteLetter(id!));
          navigate('/nosotros/cartas');
        }}
      />
    </div>
  );
}

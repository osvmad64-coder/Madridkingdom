import { useState } from 'react';
import { navigate } from '../../../app/router';
import { useToday } from '../../../app/useToday';
import { addDays } from '../../../domain/time';
import { dispatch, useAppState } from '../../../store/store';
import { Button, Chip } from '../../../ui/controls';
import { ScreenHeader } from '../../../ui/display';
import { FormSection, ImageField, SaveBar, TextField } from '../../../ui/forms';
import { createLetter, type LetterInput } from '../actions';

/** Escribir una carta. Al guardarse queda sellada (no se puede editar). */
export function LetterEditorScreen() {
  const s = useAppState();
  const [p1, p2] = s.profile.partners;
  return <Editor initial={{ title: '', message: '', unlockOn: '', fromId: p1.id, toId: p2.id }} />;
}

function Editor({ initial }: { initial: LetterInput }) {
  const s = useAppState();
  const today = useToday();
  const [f, setF] = useState(initial);
  const set = <K extends keyof LetterInput>(k: K, v: LetterInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.title.trim() && f.message.trim();
  const save = () => {
    dispatch(createLetter(f));
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
        title={<>Nueva <em>carta</em></>}
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
      <p className="tiny muted center">🔒 Al guardarla queda sellada: no se podrá editar ni leer antes de su fecha.</p>
    </div>
  );
}

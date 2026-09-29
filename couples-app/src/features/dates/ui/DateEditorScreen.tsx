import { useState } from 'react';
import { navigate } from '../../../app/router';
import { gameConfig } from '../../../config/game';
import {
  BUDGETS,
  CATEGORIES,
  DURATIONS,
  ENERGIES,
  LOCATIONS,
  MOODS,
} from '../../../content/dateOptions';
import type { Level } from '../../../models/types';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, ScreenHeader } from '../../../ui/display';
import {
  ChipMulti,
  ChipSelect,
  ConfirmModal,
  EmojiPicker,
  FormSection,
  ImageField,
  linesToText,
  PointsField,
  SaveBar,
  tagsToText,
  TextField,
  textToLines,
  textToTags,
  ToggleRow,
} from '../../../ui/forms';
import { createDateIdea, deleteDateIdea, updateDateIdea } from '../actions';
import type { DateInput } from '../model';
import { findIdea } from '../service';

const EMOJIS = ['💕', '🌅', '🍷', '🍝', '🧺', '🎬', '🍿', '🎨', '🌳', '🚗', '☕', '🎲', '🏠', '🛁', '🌙', '✨'];

export const LEVELS: { id: Level; label: string }[] = [
  { id: 1, label: 'Baja' },
  { id: 2, label: 'Media' },
  { id: 3, label: 'Alta' },
];

const blank = (): DateInput => ({
  title: '',
  emoji: '💕',
  description: '',
  category: 'romantic',
  tags: [],
  budget: 'low',
  duration: 'hours',
  location: [],
  energy: 'medium',
  mood: [],
  spontaneity: 2,
  difficulty: 1,
  preparation: [],
  instructions: [],
  optionalTwist: '',
  points: gameConfig.points.defaultDatePoints,
});

/** Crear / editar una cita de la biblioteca personal. */
export function DateEditorScreen({ id }: { id?: string }) {
  const s = useAppState();
  const existing = id ? findIdea(s.dateIdeas, id) : undefined;
  if (id && !existing) {
    return (
      <>
        <ScreenHeader onBack={() => navigate('/citas/nuestras')} backLabel="Nuestras citas" title="Cita" />
        <EmptyState emoji="🫧" title="Esta cita ya no existe" />
      </>
    );
  }
  const initial: DateInput = existing ? { ...existing, optionalTwist: existing.optionalTwist ?? '' } : blank();
  return <Editor key={id ?? 'new'} id={id} initial={initial} favorite={id ? s.dates.favorites.includes(id) : false} />;
}

function Editor({ id, initial, favorite }: { id?: string; initial: DateInput; favorite: boolean }) {
  const [f, setF] = useState(initial);
  const [fav, setFav] = useState(favorite);
  const [tags, setTags] = useState(tagsToText(initial.tags));
  const [prep, setPrep] = useState(linesToText(initial.preparation));
  const [steps, setSteps] = useState(linesToText(initial.instructions));
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof DateInput>(k: K, v: DateInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const back = () => navigate(id ? `/citas/idea/${id}` : '/citas/nuestras');
  const save = () => {
    const input: DateInput = { ...f, tags: textToTags(tags), preparation: textToLines(prep), instructions: textToLines(steps) };
    dispatch(id ? updateDateIdea(id, input, fav) : createDateIdea(input, fav));
    navigate(id ? `/citas/idea/${id}` : '/citas/nuestras');
  };

  return (
    <div className="stack editor" style={{ '--gap': '22px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={back}
        backLabel={id ? 'Cita' : 'Nuestras citas'}
        eyebrow="💕 Nuestra biblioteca"
        right={
          <Button variant="soft" size="sm" disabled={!f.title.trim()} onClick={save}>
            Guardar
          </Button>
        }
        title={id ? <>Editar <em>cita</em></> : <>Nueva <em>cita</em></>}
      />

      <FormSection title="Ícono">
        <EmojiPicker value={f.emoji} options={EMOJIS} onChange={(v) => set('emoji', v)} />
      </FormSection>
      <TextField id="date-title" label="Título" required value={f.title} maxLength={60} placeholder="Ej. Picnic sorpresa" onChange={(v) => set('title', v)} />
      <TextField id="date-desc" label="Descripción" rows={3} value={f.description} placeholder="¿De qué se trata?" onChange={(v) => set('description', v)} />
      <ImageField label="Imagen (opcional)" imageId={f.imageId} onChange={(ids) => set('imageId', ids.imageId)} />

      <FormSection title="Categoría">
        <ChipSelect options={CATEGORIES} value={f.category} onChange={(v) => set('category', v)} />
      </FormSection>

      <div className="form-divider"><span>Filtros de esta cita</span></div>

      <FormSection title="Presupuesto">
        <ChipSelect options={BUDGETS} value={f.budget} onChange={(v) => set('budget', v)} />
      </FormSection>
      <FormSection title="Lugar" hint="Pueden elegir varios">
        <ChipMulti options={LOCATIONS} value={f.location} onChange={(v) => set('location', v)} />
      </FormSection>
      <FormSection title="Duración">
        <ChipSelect options={DURATIONS} value={f.duration} onChange={(v) => set('duration', v)} />
      </FormSection>
      <FormSection title="Mood" hint="Pueden elegir varios">
        <ChipMulti options={MOODS} value={f.mood} onChange={(v) => set('mood', v)} />
      </FormSection>
      <FormSection title="Energía">
        <ChipSelect options={ENERGIES} value={f.energy} onChange={(v) => set('energy', v)} />
      </FormSection>
      <FormSection title="Espontaneidad">
        <ChipSelect options={LEVELS} value={f.spontaneity} onChange={(v) => set('spontaneity', v)} />
      </FormSection>
      <FormSection title="Dificultad">
        <ChipSelect options={LEVELS} value={f.difficulty} onChange={(v) => set('difficulty', v)} />
      </FormSection>
      <TextField id="date-tags" label="Tags (separados por coma)" value={tags} placeholder="picnic, sorpresa" onChange={setTags} />

      <div className="form-divider"><span>La dinámica</span></div>

      <TextField id="date-prep" label="Preparación (una por línea)" rows={3} value={prep} placeholder={'Manta\nAlgo de tomar'} onChange={setPrep} />
      <TextField id="date-steps" label="Instrucciones (un paso por línea)" rows={5} value={steps} placeholder={'Cada uno elige…\nDespués…'} onChange={setSteps} />
      <TextField id="date-twist" label="Twist opcional" rows={2} value={f.optionalTwist ?? ''} onChange={(v) => set('optionalTwist', v)} />

      <FormSection title="Puntos al realizarla">
        <PointsField id="date-points" value={f.points} options={gameConfig.dateNight.pointOptions} onChange={(v) => set('points', v)} />
      </FormSection>

      <div className="card card--flat">
        <ToggleRow label="❤️ Favorita" checked={fav} onChange={() => setFav(!fav)} />
      </div>


      <SaveBar>
        <Button variant="primary" size="lg" block disabled={!f.title.trim()} onClick={save}>
          Guardar cita
        </Button>
      </SaveBar>
      {id && (
        <Button variant="danger" block onClick={() => setConfirm(true)}>
          🗑️ Eliminar cita
        </Button>
      )}

      <ConfirmModal
        open={confirm}
        emoji="🗑️"
        title="¿Eliminar esta cita?"
        text="Si ya la realizaron, se queda en su historial. Se quita de favoritas y de pendientes."
        confirmLabel="Sí, eliminar"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch(deleteDateIdea(id!));
          navigate('/citas/nuestras');
        }}
      />
    </div>
  );
}

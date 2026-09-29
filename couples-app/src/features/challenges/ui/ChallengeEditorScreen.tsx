import { useState } from 'react';
import { navigate } from '../../../app/router';
import { gameConfig } from '../../../config/game';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, ScreenHeader } from '../../../ui/display';
import {
  ChipSelect,
  ConfirmModal,
  EmojiPicker,
  FormSection,
  PointsField,
  SaveBar,
  tagsToText,
  TextField,
  textToTags,
  ToggleRow,
} from '../../../ui/forms';
import { createChallenge, deleteChallenge, updateChallenge } from '../actions';
import type { ChallengeInput } from '../model';
import { CHALLENGE_TYPES, DIFFICULTIES, findChallenge } from '../service';

const EMOJIS = ['❤️', '💋', '🔥', '😘', '🫶', '🤫', '🙈', '✋', '👅', '⏳', '🌶️', '🍷', '🛁', '🕯️', '🎁', '✨'];

/** Crear / editar un reto privado. */
export function ChallengeEditorScreen({ id }: { id?: string }) {
  const s = useAppState();
  const existing = id ? findChallenge(s, id) : undefined;
  if (id && !existing) {
    return (
      <>
        <ScreenHeader onBack={() => navigate('/ajustes/retos')} backLabel="Mis retos" title="Reto" />
        <EmptyState emoji="🫧" title="Este reto ya no existe" />
      </>
    );
  }
  return <Editor key={id ?? 'new'} id={id} initial={existing ? toInput(existing) : blank()} />;
}

const blank = (): ChallengeInput => ({
  title: '',
  description: '',
  text: '',
  emoji: '❤️',
  type: 'romantic',
  difficulty: 'medium',
  tags: [],
  points: gameConfig.challenges.defaultPoints,
  active: true,
});

function toInput(c: NonNullable<ReturnType<typeof findChallenge>>): ChallengeInput {
  return {
    title: c.title,
    description: c.description === c.text ? '' : c.description,
    text: c.text ?? '',
    emoji: c.emoji,
    type: c.type,
    difficulty: c.difficulty,
    tags: c.tags,
    points: c.reward.points,
    active: c.active,
  };
}

function Editor({ id, initial }: { id?: string; initial: ChallengeInput }) {
  const [f, setF] = useState(initial);
  const [tags, setTags] = useState(tagsToText(initial.tags));
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof ChallengeInput>(k: K, v: ChallengeInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.title.trim() && (f.text.trim() || f.description.trim());

  const save = () => {
    const input = { ...f, tags: textToTags(tags) };
    dispatch(id ? updateChallenge(id, input) : createChallenge(input));
    navigate('/ajustes/retos');
  };

  return (
    <div className="stack editor" style={{ '--gap': '22px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/ajustes/retos')}
        backLabel="Mis retos"
        eyebrow="❤️ Reto privado"
        right={
          <Button variant="soft" size="sm" disabled={!valid} onClick={save}>
            Guardar
          </Button>
        }
        title={id ? <>Editar <em>reto</em></> : <>Nuevo <em>reto</em></>}
      />

      <FormSection title="Ícono">
        <EmojiPicker value={f.emoji} options={EMOJIS} onChange={(v) => set('emoji', v)} />
      </FormSection>

      <TextField id="ch-title" label="Título" required value={f.title} maxLength={60} placeholder="Ej. Solo con el tacto" onChange={(v) => set('title', v)} />
      <TextField
        id="ch-text"
        label="Texto completo del reto"
        required
        big
        rows={6}
        value={f.text}
        placeholder="Escriban el reto tal como quieren leerlo ese día…"
        onChange={(v) => set('text', v)}
      />
      <TextField id="ch-desc" label="Descripción corta (opcional)" rows={2} value={f.description} maxLength={140} placeholder="Si la dejan vacía se usa el inicio del texto" onChange={(v) => set('description', v)} />

      <FormSection title="Tipo">
        <ChipSelect options={CHALLENGE_TYPES} value={f.type} onChange={(v) => set('type', v)} />
      </FormSection>
      <FormSection title="Intensidad">
        <ChipSelect options={DIFFICULTIES} value={f.difficulty} onChange={(v) => set('difficulty', v)} />
      </FormSection>
      <TextField id="ch-tags" label="Tags (separados por coma)" value={tags} placeholder="besos, tacto" onChange={setTags} />

      <FormSection title="Puntos al completarlo">
        <PointsField id="ch-points" value={f.points} options={gameConfig.challenges.pointOptions} onChange={(v) => set('points', v)} />
      </FormSection>

      <div className="card card--flat">
        <ToggleRow label="Activo" hint="Puede salir en los próximos sorteos del calendario" checked={f.active} onChange={() => set('active', !f.active)} />
      </div>


      <SaveBar>
        <Button variant="primary" size="lg" block disabled={!valid} onClick={save}>
          Guardar reto
        </Button>
      </SaveBar>
      {id && (
        <Button variant="danger" block onClick={() => setConfirm(true)}>
          🗑️ Eliminar reto
        </Button>
      )}

      <ConfirmModal
        open={confirm}
        emoji="🗑️"
        title="¿Eliminar este reto?"
        text="Los días en que ya lo completaron conservan su registro. Los días pendientes recibirán otro reto al azar."
        confirmLabel="Sí, eliminar"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch(deleteChallenge(id!));
          navigate('/ajustes/retos');
        }}
      />
    </div>
  );
}

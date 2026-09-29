import { useState } from 'react';
import { navigate } from '../../../app/router';
import { gameConfig } from '../../../config/game';
import { POSITION_CATEGORIES } from '../../../content/positionOptions';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, ScreenHeader } from '../../../ui/display';
import {
  ChipSelect,
  ConfirmModal,
  FormSection,
  ImageField,
  PointsField,
  SaveBar,
  tagsToText,
  TextField,
  textToTags,
  ToggleRow,
} from '../../../ui/forms';
import { DIFFICULTIES } from '../../challenges/service';
import { createPosition, deletePosition, updatePosition, type PositionInput } from '../actions';
import { findPosition } from '../service';

/** Crear / editar una posición especial. */
export function PositionEditorScreen({ id }: { id?: string }) {
  const s = useAppState();
  const existing = id ? findPosition(s, id) : undefined;
  if (id && !existing) {
    return (
      <>
        <ScreenHeader onBack={() => navigate('/ajustes/posiciones')} backLabel="Posiciones" title="Posición" />
        <EmptyState emoji="🫧" title="Esta posición ya no existe" />
      </>
    );
  }
  const initial: PositionInput = existing
    ? { ...existing }
    : {
        name: '',
        description: '',
        category: POSITION_CATEGORIES[0].id,
        difficulty: 'medium',
        points: gameConfig.positions.defaultPoints,
        tags: [],
        active: true,
      };
  return <Editor key={id ?? 'new'} id={id} initial={initial} />;
}

function Editor({ id, initial }: { id?: string; initial: PositionInput }) {
  const [f, setF] = useState(initial);
  const [tags, setTags] = useState(tagsToText(initial.tags));
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof PositionInput>(k: K, v: PositionInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const input = { ...f, tags: textToTags(tags) };
    dispatch(id ? updatePosition(id, input) : createPosition(input));
    navigate('/ajustes/posiciones');
  };

  return (
    <div className="stack editor" style={{ '--gap': '22px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/ajustes/posiciones')}
        backLabel="Posiciones"
        eyebrow="💋 Posición especial"
        right={
          <Button variant="soft" size="sm" disabled={!f.name.trim()} onClick={save}>
            Guardar
          </Button>
        }
        title={id ? <>Editar <em>posición</em></> : <>Nueva <em>posición</em></>}
      />

      <ImageField label="Imagen (opcional)" imageId={f.imageId} onChange={(ids) => setF((x) => ({ ...x, ...ids }))} />
      <p className="tiny muted" style={{ marginTop: -12 }}>Usen solo ilustraciones propias o que tengan derecho a usar. Se guardan solo en este teléfono.</p>

      <TextField id="pos-name" label="Nombre" required value={f.name} maxLength={50} onChange={(v) => set('name', v)} />
      <TextField id="pos-desc" label="Descripción" rows={4} value={f.description} onChange={(v) => set('description', v)} />

      <FormSection title="Categoría">
        <ChipSelect options={POSITION_CATEGORIES} value={f.category} onChange={(v) => set('category', v)} />
      </FormSection>
      <FormSection title="Dificultad">
        <ChipSelect options={DIFFICULTIES} value={f.difficulty} onChange={(v) => set('difficulty', v)} />
      </FormSection>
      <TextField id="pos-tags" label="Tags (separados por coma)" value={tags} onChange={setTags} />

      <FormSection title="Bonus al completarla">
        <PointsField id="pos-points" value={f.points} options={gameConfig.positions.pointOptions} onChange={(v) => set('points', v)} />
      </FormSection>

      <div className="card card--flat">
        <ToggleRow label="Activa" hint="Puede salir como bonus en días con reto" checked={f.active} onChange={() => set('active', !f.active)} />
      </div>


      <SaveBar>
        <Button variant="primary" size="lg" block disabled={!f.name.trim()} onClick={save}>
          Guardar posición
        </Button>
      </SaveBar>
      {id && (
        <Button variant="danger" block onClick={() => setConfirm(true)}>
          🗑️ Eliminar posición
        </Button>
      )}

      <ConfirmModal
        open={confirm}
        emoji="🗑️"
        title="¿Eliminar esta posición?"
        text="Los días en que ya la completaron conservan su registro. Los días pendientes reciben otra posición o se quedan solo con el reto."
        confirmLabel="Sí, eliminar"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch(deletePosition(id!));
          navigate('/ajustes/posiciones');
        }}
      />
    </div>
  );
}

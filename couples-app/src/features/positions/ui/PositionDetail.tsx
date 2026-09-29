import { useState } from 'react';
import { positionCategory } from '../../../content/positionOptions';
import type { DayKey } from '../../../models/types';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { formatNumber } from '../../../ui/display';
import { Icon } from '../../../ui/Icon';
import { useMedia } from '../../../ui/useMedia';
import { canCompleteOn, DIFFICULTY_LABEL } from '../../challenges/service';
import { completePosition, undoPosition } from '../actions';
import type { PositionAssignment } from '../model';
import { positionPool, resolvePosition } from '../service';
import { PositionPicker } from './PositionPicker';

/** 💋 Posición especial de un día (bonus independiente del reto). */
export function PositionDetail({ assignment, today }: { assignment: PositionAssignment; today: DayKey }) {
  const s = useAppState();
  const p = resolvePosition(s, assignment);
  const img = useMedia(p.imageId ?? p.thumbId);
  const [picker, setPicker] = useState(false);
  const done = assignment.status === 'completed';
  const available = canCompleteOn(assignment.day, today);
  const cat = positionCategory(p.category);
  const canSwap = !done && positionPool(s).length > 1;

  return (
    <section className={`card position-detail ${done ? 'is-done' : ''} anim-fade-up`}>
      <div className="position-detail__media">
        {img ? <img src={img} alt={p.name} /> : <span aria-hidden="true">💋</span>}
        <span className="badge position-detail__badge">💋 Posición especial</span>
      </div>
      <div className="stack" style={{ '--gap': '6px', padding: '16px 18px 18px' } as React.CSSProperties}>
        <p className="eyebrow">{cat.emoji} {cat.label} · {DIFFICULTY_LABEL[p.difficulty]}</p>
        <p className="title">{p.name}</p>
        {p.description && <p className="small muted">{p.description}</p>}
        <div className="row between card-actions" style={{ marginTop: 8 }}>
          <span className="badge badge--gold">🔥 Bonus +{formatNumber(p.points)}</span>
          {done ? (
            <div className="row" style={{ '--gap': '4px' } as React.CSSProperties}>
              <span className="badge badge--success"><Icon name="check" size={14} strokeWidth={3} /> Completada</span>
              <Button variant="ghost" size="sm" onClick={() => dispatch(undoPosition(assignment.day))}>Deshacer</Button>
            </div>
          ) : available ? (
            <Button variant="primary" size="sm" onClick={() => dispatch(completePosition(assignment.day))}>
              ¡Completada!
            </Button>
          ) : (
            <span className="tiny muted">Disponible ese día</span>
          )}
        </div>
        {canSwap && (
          <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setPicker(true)}>
            Cambiar posición
          </button>
        )}
      </div>
      <PositionPicker day={assignment.day} currentId={assignment.positionId} open={picker} onClose={() => setPicker(false)} />
    </section>
  );
}

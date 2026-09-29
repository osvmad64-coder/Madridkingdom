import { useEffect, useState } from 'react';
import { gameConfig } from '../../config/game';
import { pointsInRange } from '../../domain/points';
import { dayLabel } from '../../domain/time';
import type { DayKey } from '../../models/types';
import { registerHeart, removeHeartsForDay, setDayNote } from '../../store/actions';
import { selectAssignment, selectHeartsByDay } from '../../store/selectors';
import { dispatch, useAppState } from '../../store/store';
import { Button } from '../../ui/controls';
import { formatNumber } from '../../ui/display';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/overlays';
import { ChallengeCard } from '../../features/challenges/ui/ChallengeCard';
import { positionAssignment } from '../../features/positions/service';
import { PositionDetail } from '../../features/positions/ui/PositionDetail';

/** Hoja inferior al tocar un día del calendario. */
export function DaySheet({ day, today, onClose }: { day: DayKey | null; today: DayKey; onClose: () => void }) {
  return (
    <Sheet open={!!day} onClose={onClose} label="Detalle del día">
      {day && <DayContent day={day} today={today} />}
    </Sheet>
  );
}

function DayContent({ day, today }: { day: DayKey; today: DayKey }) {
  const s = useAppState();
  const hearts = selectHeartsByDay(s).get(day) ?? [];
  const assignment = selectAssignment(s, day);
  const position = positionAssignment(s, day);
  const dayPoints = pointsInRange(s.ledger, day, day);
  const dayEvents = s.ledger.filter((e) => e.day === day);
  const future = day > today;
  const [note, setNote] = useState(s.dayNotes[day] ?? '');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => setNote(s.dayNotes[day] ?? ''), [day, s.dayNotes]);
  const dirty = note.trim() !== (s.dayNotes[day] ?? '');

  return (
    <div className="stack day-sheet" style={{ '--gap': '18px' } as React.CSSProperties}>
      <div className="row between">
        <div>
          <p className="eyebrow">{day === today ? 'Hoy' : future ? 'Próximamente' : 'Día'}</p>
          <h2 className="title" style={{ fontSize: 'var(--fs-2xl)' }}>{dayLabel(day)}</h2>
        </div>
        <span className="badge badge--gold num">⭐ {formatNumber(dayPoints)}</span>
      </div>

      {/* Registro ❤️ */}
      <div className="heart-register">
        <button
          type="button"
          className={`heart-button ${hearts.length ? 'is-on' : ''}`}
          disabled={future}
          onClick={() => dispatch(registerHeart(day))}
          aria-label="Registrar corazón"
        >
          <span className="heart-button__icon" key={hearts.length}>
            <Icon name="heart" size={54} filled={hearts.length > 0} strokeWidth={1.8} />
          </span>
        </button>
        <div className="center">
          {future ? (
            <p className="muted small">Este día todavía no llega ✨</p>
          ) : hearts.length ? (
            <>
              <p style={{ fontWeight: 700 }}>
                {hearts.length === 1 ? '❤️ Registrado' : `❤️ ×${hearts.length} registrados`}
              </p>
              <p className="tiny muted">Toca el corazón para sumar otro registro</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 700 }}>Toca para registrar</p>
              <p className="tiny muted">+{gameConfig.points.perHeart} puntos</p>
            </>
          )}
        </div>
        {hearts.length > 0 &&
          (confirmRemove ? (
            <div className="row">
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  dispatch(removeHeartsForDay(day));
                  setConfirmRemove(false);
                }}
              >
                Sí, quitar
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
              Quitar registro
            </Button>
          ))}
      </div>

      {assignment && (
        <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <p className="eyebrow">🎯 Reto del día</p>
          <ChallengeCard assignment={assignment} today={today} />
        </div>
      )}

      {position && (
        <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <p className="eyebrow">💋 Posición especial</p>
          <PositionDetail assignment={position} today={today} />
        </div>
      )}

      {dayEvents.length > 0 && (
        <div className="card card--flat day-points">
          <p className="eyebrow">⭐ Puntos obtenidos</p>
          {dayEvents.map((e) => (
            <div key={e.id} className="row between small">
              <span className="muted">{e.label}</span>
              <span className="num" style={{ fontWeight: 700 }}>+{formatNumber(e.amount)}</span>
            </div>
          ))}
          <div className="row between day-points__total">
            <span>Total del día</span>
            <span className="num">⭐ {formatNumber(dayPoints)}</span>
          </div>
        </div>
      )}

      {/* Nota */}
      <div className="field">
        <label htmlFor="day-note">📝 Nota privada (opcional)</label>
        <textarea
          id="day-note"
          className="input"
          rows={3}
          placeholder="Algo que quieran recordar de este día…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => dirty && dispatch(setDayNote(day, note))}
        />
        {dirty && (
          <Button variant="soft" size="sm" onClick={() => dispatch(setDayNote(day, note))} style={{ alignSelf: 'flex-end' }}>
            Guardar nota
          </Button>
        )}
      </div>
    </div>
  );
}

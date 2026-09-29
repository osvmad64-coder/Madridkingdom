import { CHALLENGE_TYPE_LABEL, DIFFICULTY_LABEL, canCompleteOn } from '../../domain/challenges';
import { challengeReward } from '../../domain/points';
import { shortDayLabel } from '../../domain/time';
import type { ChallengeAssignment, DayKey } from '../../models/types';
import { completeChallenge, undoChallenge } from '../../store/actions';
import { findChallenge } from '../../store/selectors';
import { dispatch, useAppState } from '../../store/store';
import { Button } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { formatNumber } from '../../ui/display';

/** Tarjeta de reto reutilizada en Inicio, calendario y hoja del día. */
export function ChallengeCard({
  assignment,
  today,
  compact,
}: {
  assignment: ChallengeAssignment;
  today: DayKey;
  compact?: boolean;
}) {
  const s = useAppState();
  const c = findChallenge(s, assignment.challengeId);
  if (!c) return null;
  const done = assignment.status === 'completed';
  const available = canCompleteOn(assignment.day, today);
  const pts = challengeReward(c.reward.points);

  return (
    <section className={`card challenge-card ${done ? 'is-done' : ''} anim-fade-up`} data-tone={done ? 'mint' : 'butter'}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="challenge-card__emoji">{c.emoji}</span>
        <div className="grow stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <div className="row" style={{ '--gap': '6px', flexWrap: 'wrap' } as React.CSSProperties}>
            <span className="eyebrow">🎯 {assignment.day === today ? 'Reto de hoy' : shortDayLabel(assignment.day)} · {CHALLENGE_TYPE_LABEL[c.type]}</span>
          </div>
          <p className="title">{c.title}</p>
          {!compact || !done ? <p className="small muted">{c.description}</p> : null}
          {!compact && (
            <div className="chips" style={{ marginTop: 4 }}>
              <span className="chip chip--static">{DIFFICULTY_LABEL[c.difficulty]}</span>
            </div>
          )}
        </div>
      </div>
      <div className="row between" style={{ marginTop: 14 }}>
        <span className="badge badge--gold">⭐ +{formatNumber(pts)}</span>
        {done ? (
          <div className="row" style={{ '--gap': '4px' } as React.CSSProperties}>
            <span className="badge badge--success">
              <Icon name="check" size={14} strokeWidth={3} /> Completado
            </span>
            {!compact && (
              <Button variant="ghost" size="sm" onClick={() => dispatch(undoChallenge(assignment.day))}>
                Deshacer
              </Button>
            )}
          </div>
        ) : available ? (
          <Button variant="primary" size="sm" onClick={() => dispatch(completeChallenge(assignment.day))}>
            ¡Lo hicimos!
          </Button>
        ) : (
          <span className="tiny muted">Se desbloquea ese día</span>
        )}
      </div>
    </section>
  );
}

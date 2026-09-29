import { challengeReward } from '../../../domain/points';
import { shortDayLabel } from '../../../domain/time';
import type { ChallengeAssignment, DayKey } from '../../../models/types';
import { completeChallenge, undoChallenge } from '../actions';
import { canCompleteOn, CHALLENGE_TYPE_LABEL, DIFFICULTY_LABEL, resolveChallenge } from '../service';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { formatNumber } from '../../../ui/display';
import { Icon } from '../../../ui/Icon';

/** Reto del día (calendario, hoja del día e Inicio). */
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
  const c = resolveChallenge(s, assignment);
  const done = assignment.status === 'completed';
  const available = canCompleteOn(assignment.day, today);
  const pts = challengeReward(c.points);
  const body = c.text || c.description;

  return (
    <section className={`card challenge-card ${done ? 'is-done' : ''} anim-fade-up`} data-tone={done ? 'mint' : 'rose'}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="challenge-card__emoji">{c.emoji}</span>
        <div className="grow stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <span className="eyebrow">
            ❤️ Reto privado · {assignment.day === today ? 'hoy' : shortDayLabel(assignment.day)}
          </span>
          <p className="title">{c.title}</p>
        </div>
      </div>
      {(!compact || !done) && body && <p className="challenge-card__text">{body}</p>}
      {!compact && (
        <div className="chips" style={{ marginTop: 10 }}>
          <span className="chip chip--static">{CHALLENGE_TYPE_LABEL[c.type]}</span>
          {c.difficulty && <span className="chip chip--static">{DIFFICULTY_LABEL[c.difficulty]}</span>}
        </div>
      )}
      <div className="row between card-actions" style={{ marginTop: 14 }}>
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

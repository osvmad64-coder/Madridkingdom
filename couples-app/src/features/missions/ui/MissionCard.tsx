import { dispatch } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { formatNumber, ProgressBar } from '../../../ui/display';
import { Icon } from '../../../ui/Icon';
import { claimMission } from '../actions';
import type { MissionDef } from '../library';
import type { MonthlyMission } from '../model';
import { AREA_LABEL, TIER_LABEL, type MissionProgress } from '../service';

/** Tarjeta de misión: progreso automático y reclamo de puntos (una vez). */
export function MissionCard({
  month,
  mission: m,
  progress: p,
  def,
  compact,
}: {
  month: string;
  mission: MonthlyMission;
  progress: MissionProgress;
  def?: MissionDef;
  compact?: boolean;
}) {
  const claimed = !!m.claimedAt;
  return (
    <article className={`card mission-card ${p.done ? 'is-done' : ''} ${claimed ? 'is-claimed' : ''} ${compact ? 'is-compact' : ''}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="mission-card__emoji">{claimed ? '✓' : m.emoji}</span>
        <div className="grow" style={{ minWidth: 0 }}>
          <p className="eyebrow">
            {AREA_LABEL[m.area]} · {TIER_LABEL[m.tier]}
          </p>
          <p className="mission-card__title">{m.title}</p>
          {!compact && def?.hint && !p.done && <p className="tiny muted">{def.hint(m.params)}</p>}
        </div>
      </div>
      {!claimed && (
        <div className="mission-card__progress">
          <div className="row between small">
            <span className="num" style={{ fontWeight: 700 }}>
              {p.value} / {p.target}
            </span>
            <span className="muted num">{Math.round(p.ratio * 100)}%</span>
          </div>
          <ProgressBar value={p.ratio} variant={p.done ? 'gold' : undefined} />
        </div>
      )}
      <div className="row between mission-card__foot">
        {claimed ? (
          <span className="badge badge--success">
            <Icon name="check" size={14} strokeWidth={3} /> Misión completada · +{formatNumber(m.points)}
          </span>
        ) : (
          <span className="badge badge--gold">⭐ +{formatNumber(m.points)} puntos</span>
        )}
        {p.done && !claimed && (
          <Button variant="primary" size="sm" onClick={() => dispatch(claimMission(month, m.id))}>
            Reclamar
          </Button>
        )}
      </div>
    </article>
  );
}

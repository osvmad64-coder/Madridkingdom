import { navigate } from '../../../app/router';
import { dayMonthLabel, longDayLabel } from '../../../domain/time';
import type { AppState, DayKey } from '../../../models/types';
import { Button } from '../../../ui/controls';
import { countdownLabel, durationBetween, durationLabel, nextAnniversary, relationshipStart } from '../service';

/** ❤️ "Juntos desde hace…" — se calcula con la fecha de hoy, nunca es fijo. */
export function TogetherCard({ s, today, compact }: { s: AppState; today: DayKey; compact?: boolean }) {
  const start = relationshipStart(s);
  if (!start || start > today) {
    return (
      <section className="card together-card together-card--empty anim-fade-up">
        <p className="eyebrow">❤️ Nuestra historia</p>
        <p className="title">¿Cuándo empezó todo?</p>
        <p className="small muted">Agreguen la fecha en que empezaron y la app contará el tiempo juntos.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/nosotros/momentos/nueva?kind=start')}>
          + Agregar fecha de inicio
        </Button>
      </section>
    );
  }
  const d = durationBetween(start, today);
  return (
    <button type="button" className="card card--tap together-card anim-fade-up" onClick={() => navigate('/nosotros/momentos')}>
      <p className="eyebrow">❤️ Juntos desde hace</p>
      <p className="together-card__value">{durationLabel(d)}</p>
      <p className="small muted">
        {d.totalDays.toLocaleString('es-MX')} días · desde el {longDayLabel(start)}
      </p>
      {!compact && <span className="together-card__hearts" aria-hidden="true">💕</span>}
    </button>
  );
}

/** 💕 Próximo aniversario con cuenta regresiva (y celebración el día). */
export function AnniversaryCard({ s, today }: { s: AppState; today: DayKey }) {
  const next = nextAnniversary(s, today);
  if (!next) return null;
  const isToday = next.daysLeft === 0;
  return (
    <section className={`card anniversary-card ${isToday ? 'is-today' : ''} anim-fade-up`}>
      {isToday && (
        <div className="anniversary-card__confetti" aria-hidden="true">
          {['💕', '✨', '❤️', '🎉', '💖', '✨', '🥂', '💕'].map((e, i) => (
            <span key={i} style={{ ['--i' as string]: i }}>{e}</span>
          ))}
        </div>
      )}
      <p className="eyebrow">{isToday ? '🎉 Hoy' : 'Nuestro próximo aniversario ❤️'}</p>
      {isToday ? (
        <p className="anniversary-card__title">¡Feliz aniversario!</p>
      ) : (
        <div className="row" style={{ alignItems: 'baseline', '--gap': '8px' } as React.CSSProperties}>
          <span className="anniversary-card__days num">{next.daysLeft}</span>
          <span className="anniversary-card__unit">{next.daysLeft === 1 ? 'día' : 'días'}</span>
        </div>
      )}
      <p className="small">
        {dayMonthLabel(next.day)}
        {next.years ? ` · cumplimos ${next.years} ${next.years === 1 ? 'año' : 'años'}` : ''}
      </p>
      {!isToday && <p className="tiny muted">{countdownLabel(next.daysLeft)}</p>}
    </section>
  );
}

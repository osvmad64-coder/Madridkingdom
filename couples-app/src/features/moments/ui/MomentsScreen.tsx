import { navigate } from '../../../app/router';
import { useToday } from '../../../app/useToday';
import { dayMonthLabel, longDayLabel } from '../../../domain/time';
import { useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, ScreenHeader, SectionHead } from '../../../ui/display';
import { countdownLabel, durationBetween, timeline, upcomingMoments } from '../service';
import { AnniversaryCard, TogetherCard } from './MomentCards';

/** ❤️ Nuestros momentos: contador, próximo aniversario y la historia en timeline. */
export function MomentsScreen() {
  const s = useAppState();
  const today = useToday();
  const story = timeline(s);
  const upcoming = upcomingMoments(s, today).filter((o) => o.moment?.kind !== 'start').slice(0, 3);

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/nosotros')}
        backLabel="Nosotros"
        eyebrow="Nuestra historia"
        title={<>Nuestros <em>momentos</em></>}
      />
      <TogetherCard s={s} today={today} />
      <AnniversaryCard s={s} today={today} />

      {upcoming.length > 0 && (
        <>
          <SectionHead title="Próximas fechas" />
          <div className="list">
            {upcoming.map((o) => (
              <button key={o.moment!.id} type="button" className="list-row" onClick={() => navigate(`/nosotros/momentos/${o.moment!.id}`)}>
                <span className="list-row__icon" data-tone="rose">{o.moment!.emoji}</span>
                <div className="grow">
                  <p style={{ fontWeight: 700 }}>{o.moment!.title}</p>
                  <p className="tiny muted">{dayMonthLabel(o.day)}</p>
                </div>
                <span className={`badge ${o.daysLeft === 0 ? 'badge--gold' : ''}`}>{countdownLabel(o.daysLeft)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <Button variant="primary" size="lg" block onClick={() => navigate('/nosotros/momentos/nueva')}>
        + Nueva fecha
      </Button>

      <SectionHead title="Nuestra historia" />
      {story.length ? (
        <ol className="timeline stagger">
          {story.map((m) => {
            const ago = m.date <= today ? durationBetween(m.date, today) : null;
            return (
              <li key={m.id}>
                <span className="timeline__dot">{m.emoji}</span>
                <button type="button" className="timeline__card" onClick={() => navigate(`/nosotros/momentos/${m.id}`)}>
                  <span className="timeline__title">{m.title}</span>
                  <span className="timeline__date">{longDayLabel(m.date)}</span>
                  {m.note && <span className="small muted">{m.note}</span>}
                  {ago && ago.totalDays > 0 && (
                    <span className="tiny muted">
                      hace {ago.years ? `${ago.years} ${ago.years === 1 ? 'año' : 'años'}` : ago.months ? `${ago.months} ${ago.months === 1 ? 'mes' : 'meses'}` : `${ago.days} ${ago.days === 1 ? 'día' : 'días'}`}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState emoji="📖" title="Su historia empieza aquí">
          Agreguen su primera cita, su primer beso o el día en que empezaron.
        </EmptyState>
      )}
    </div>
  );
}

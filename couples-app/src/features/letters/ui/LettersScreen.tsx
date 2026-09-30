import { navigate } from '../../../app/router';
import { useToday } from '../../../app/useToday';
import { dayMonthLabel, diffDays, longDayLabel, toDayKey } from '../../../domain/time';
import type { AppState } from '../../../models/types';
import { useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, ScreenHeader, SectionHead } from '../../../ui/display';
import type { FutureLetter } from '../model';
import { lettersByStatus } from '../service';

export function partnerName(s: AppState, id?: string) {
  return s.profile.partners.find((p) => p.id === id)?.name;
}

export function fromTo(s: AppState, l: FutureLetter) {
  const from = partnerName(s, l.fromId);
  const to = partnerName(s, l.toId);
  if (from && to) return `De ${from} para ${to}`;
  if (from) return `De ${from}`;
  if (to) return `Para ${to}`;
  return '';
}

/** 💌 Cartas para el futuro. El estado se revisa con la fecha real de hoy. */
export function LettersScreen() {
  const s = useAppState();
  const today = useToday();
  const { locked, ready, opened } = lettersByStatus(s, today);
  const empty = !locked.length && !ready.length && !opened.length;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/nosotros')}
        backLabel="Nosotros"
        eyebrow="💌 Solo para nosotros"
        title={<>Cartas para el <em>futuro</em></>}
      />
      <Button variant="primary" size="lg" block onClick={() => navigate('/nosotros/cartas/nueva')}>
        + Nueva carta
      </Button>

      {empty && (
        <EmptyState emoji="💌" title="Escríbanse algo para después">
          Una carta puede abrirse hoy o esperar hasta la fecha que ustedes elijan.
        </EmptyState>
      )}

      {ready.length > 0 && (
        <div className="stack stagger" style={{ '--gap': '12px' } as React.CSSProperties}>
          {ready.map((l) => (
            <button key={l.id} type="button" className="letter-ready card--tap" onClick={() => navigate(`/nosotros/cartas/${l.id}`)}>
              <span className="letter-ready__env" aria-hidden="true">💌</span>
              <span className="grow">
                <span className="letter-ready__title">Tu carta está lista</span>
                <span className="small">{fromTo(s, l) || 'Toca para abrirla'}</span>
              </span>
              <span className="letter-ready__cta">Abrir</span>
            </button>
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <SectionHead title="Esperando su día" />
          <div className="stack stagger" style={{ '--gap': '12px' } as React.CSSProperties}>
            {locked.map((l) => {
              const left = diffDays(today, l.unlockOn!);
              return (
                <article key={l.id} className="card letter-locked">
                  <span className="letter-locked__lock" aria-hidden="true">🔒</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <p className="letter-locked__title">Hay una carta esperando</p>
                    <p className="small muted">Se desbloquea el {dayMonthLabel(l.unlockOn!)}{l.unlockOn!.slice(0, 4) !== today.slice(0, 4) ? ` de ${l.unlockOn!.slice(0, 4)}` : ''}</p>
                    <p className="tiny muted">
                      {left === 1 ? 'Falta 1 día' : `Faltan ${left} días`}{fromTo(s, l) ? ` · ${fromTo(s, l)}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/nosotros/cartas/editar/${l.id}`)}>
                    Editar
                  </Button>
                </article>
              );
            })}
          </div>
        </>
      )}

      {opened.length > 0 && (
        <>
          <SectionHead title="Cartas abiertas" />
          <div className="list">
            {opened.map((l) => (
              <button key={l.id} type="button" className="list-row" onClick={() => navigate(`/nosotros/cartas/${l.id}`)}>
                <span className="list-row__icon" data-tone="peach">✉️</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700 }}>{l.title}</p>
                  <p className="tiny muted">
                    Escrita el {longDayLabel(l.writtenOn)} · abierta el {dayMonthLabel(toDayKey(new Date(l.openedAt!)))}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

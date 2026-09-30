import { useState } from 'react';
import { navigate } from '../../../app/router';
import { useToday } from '../../../app/useToday';
import { daysInMonth, monthKeyOf, monthLabel, monthName } from '../../../domain/time';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, formatNumber, ProgressBar, ScreenHeader, SectionHead } from '../../../ui/display';
import { claimMonthBonus } from '../actions';
import { missionHistory, monthSummary } from '../service';
import { MissionCard } from './MissionCard';

/** 🎯 Misiones del mes: las elige la app; ustedes solo las cumplen. */
export function MissionsScreen() {
  const s = useAppState();
  const today = useToday();
  const month = monthKeyOf(today);
  const sum = monthSummary(s, month);
  const history = missionHistory(s, month);
  const daysLeft = daysInMonth(month) - Number(today.slice(8)) + 1;
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/nosotros')}
        backLabel="Nosotros"
        eyebrow={`🎯 ${daysLeft === 1 ? 'Último día' : `Quedan ${daysLeft} días`}`}
        title={<>Misiones de <em>{monthName(month)}</em> ❤️</>}
      />

      {sum ? (
        <>
          <section className={`card missions-summary ${sum.month.bonusClaimedAt ? 'is-complete' : ''} anim-fade-up`}>
            <div className="row between">
              <p style={{ fontWeight: 800 }}>
                {sum.done} / {sum.total} completadas
              </p>
              <span className="badge badge--gold">🏆 +{formatNumber(sum.month.bonusPoints)}</span>
            </div>
            <ProgressBar value={sum.total ? sum.done / sum.total : 0} variant="gold" />
            {sum.month.bonusClaimedAt ? (
              <p className="small">✓ ¡Completamos el mes! Bonus cobrado.</p>
            ) : sum.bonusAvailable ? (
              <Button variant="primary" block onClick={() => dispatch(claimMonthBonus(month))}>
                🏆 Reclamar bonus del mes
              </Button>
            ) : (
              <p className="small muted">Completen todas para ganar el bonus del mes.</p>
            )}
          </section>

          <div className="stack stagger" style={{ '--gap': '12px' } as React.CSSProperties}>
            {sum.items.map((i) => (
              <MissionCard key={i.mission.id} month={month} mission={i.mission} progress={i.progress} def={i.def} />
            ))}
          </div>
          <p className="tiny muted center">
            La app elige nuevas misiones cada mes. El progreso se cuenta solo con lo que registran.
          </p>
        </>
      ) : (
        <EmptyState emoji="🎯" title="Preparando sus misiones…" />
      )}

      {history.length > 0 && (
        <>
          <SectionHead title="Meses anteriores" />
          <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            {history.map((m) => {
              const h = monthSummary(s, m)!;
              const open = openMonth === m;
              return (
                <div key={m} className="card card--flat history-month">
                  <button type="button" className="row between history-month__head" onClick={() => setOpenMonth(open ? null : m)} aria-expanded={open}>
                    <span style={{ fontWeight: 800 }}>{monthLabel(m)}</span>
                    <span className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                      <span className="badge">{h.done}/{h.total}</span>
                      {h.month.bonusClaimedAt && <span className="badge badge--gold">🏆</span>}
                    </span>
                  </button>
                  {open && (
                    <div className="stack" style={{ '--gap': '8px', marginTop: 12 } as React.CSSProperties}>
                      {h.items.map((i) => (
                        <MissionCard key={i.mission.id} month={m} mission={i.mission} progress={i.progress} def={i.def} compact />
                      ))}
                      {h.bonusAvailable && (
                        <Button variant="soft" size="sm" onClick={() => dispatch(claimMonthBonus(m))}>
                          🏆 Reclamar bonus de {monthName(m)}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

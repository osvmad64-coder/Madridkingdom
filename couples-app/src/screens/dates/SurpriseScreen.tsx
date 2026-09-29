import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from '../../app/router';
import { SURPRISE_THINKING } from '../../content/dateOptions';
import { activeFilterCount, EMPTY_FILTERS, filterIdeas, pickIdea, randomPool, recentToAvoid } from '../../features/dates/service';
import { setFilters } from '../../store/uiState';
import { todayKey } from '../../domain/time';
import type { DateIdea } from '../../models/types';
import { markShown, planDate } from '../../store/actions';
import { dispatch, store } from '../../store/store';
import { Button } from '../../ui/controls';
import { EmptyState, ScreenHeader } from '../../ui/display';
import { haptic } from '../../ui/haptics';
import { DateCard } from './DateCard';

/** 🎲 Sorpréndenos: pequeña animación de "pensando" y revelación del plan. */

const STEP_MS = 520;

export function SurpriseScreen() {
  const [phase, setPhase] = useState<'thinking' | 'reveal' | 'empty'>('thinking');
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState<DateIdea | null>(null);
  const [filtered, setFiltered] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const roll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    const s = store.getState();
    // Solo citas que existen en la biblioteca, con los filtros elegidos (si hay).
    const pool = randomPool(filterIdeas(s.dateIdeas, { filters: s.dates.filters, settings: s.settings }), s.settings.randomIngredients);
    const avoid = recentToAvoid(s.dates.recent, s.settings.avoidRepeatDays, Date.now());
    const pick = pickIdea(pool, avoid, { exclude: idea?.id });
    setFiltered(activeFilterCount(s.dates.filters) > 0);
    if (!pick) {
      setPhase('empty');
      return;
    }
    setPhase('thinking');
    setStep(0);
    SURPRISE_THINKING.forEach((_, i) => {
      timers.current.push(setTimeout(() => { setStep(i); haptic(4); }, i * STEP_MS));
    });
    timers.current.push(
      setTimeout(() => {
        setIdea(pick);
        dispatch(markShown(pick.id));
        setPhase('reveal');
        haptic([10, 30, 20]);
      }, SURPRISE_THINKING.length * STEP_MS),
    );
  }, [idea]);

  useEffect(() => {
    roll();
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader onBack={() => navigate('/citas')} backLabel="Date night" eyebrow="Sorpréndenos" title={phase === 'reveal' ? <>✨ Tenemos <em>un plan</em></> : <>Un <em>momento…</em></>} />

      {phase === 'thinking' && (
        <div className="thinking">
          <div className="thinking__dice">🎲</div>
          <p className="thinking__text" key={step}>{SURPRISE_THINKING[step]}</p>
          <div className="thinking__dots">
            {SURPRISE_THINKING.map((_, i) => (
              <i key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
        </div>
      )}

      {phase === 'reveal' && idea && (
        <>
          <DateCard
            idea={idea}
            onAnother={roll}
            onStart={() => {
              dispatch(planDate(idea.id, todayKey()));
              navigate(`/citas/idea/${idea.id}`);
            }}
            onOpen={() => navigate(`/citas/idea/${idea.id}`)}
          />
          <button type="button" className="link center" onClick={() => navigate('/citas/random')}>
            ⚙️ Ajustar qué incluye nuestro Random
          </button>
        </>
      )}

      {phase === 'reveal' && filtered && (
        <p className="tiny muted center">Elegida entre las citas que cumplen sus filtros.</p>
      )}

      {phase === 'empty' && (
        <EmptyState emoji="🫧" title={filtered ? 'Ninguna cita coincide' : 'Nada que sortear todavía'}>
          <div className="stack" style={{ alignItems: 'center', marginTop: 8 }}>
            {filtered ? 'Ninguna de sus citas cumple estos filtros.' : 'Agreguen citas a su biblioteca o revisen su Random.'}
            {filtered ? (
              <Button variant="soft" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); roll(); }}>Quitar filtros</Button>
            ) : (
              <Button variant="soft" size="sm" onClick={() => navigate('/citas/nueva')}>+ Agregar cita</Button>
            )}
          </div>
        </EmptyState>
      )}
    </div>
  );
}

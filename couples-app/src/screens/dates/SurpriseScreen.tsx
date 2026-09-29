import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from '../../app/router';
import { SURPRISE_THINKING } from '../../content/dateOptions';
import { filterIdeas, pickIdea, randomPool } from '../../domain/dateNight';
import { todayKey } from '../../domain/time';
import type { DateIdea } from '../../models/types';
import { markShown, planDate } from '../../store/actions';
import { selectDateLibrary } from '../../store/selectors';
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
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const roll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    const s = store.getState();
    const pool = randomPool(filterIdeas(selectDateLibrary(), { settings: s.settings }), s.settings.randomIngredients);
    const pick = pickIdea(pool, s.dates.recent, { exclude: idea?.id });
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

      {phase === 'empty' && (
        <EmptyState emoji="🫧" title="Nada que sortear">
          <div className="stack" style={{ alignItems: 'center', marginTop: 8 }}>
            Activen más opciones en su Random.
            <Button variant="soft" size="sm" onClick={() => navigate('/citas/random')}>Configurar Random</Button>
          </div>
        </EmptyState>
      )}
    </div>
  );
}

import { useState } from 'react';
import { navigate } from '../../app/router';
import { MOODS, labelOf } from '../../content/dateOptions';
import { findIdea } from '../../domain/dateNight';
import { dateReward } from '../../domain/points';
import { shortDayLabel, todayKey } from '../../domain/time';
import type { DateIdea, DynamicKind } from '../../models/types';
import { completeDate, planDate, removeDateLog } from '../../store/actions';
import { selectDateLibrary } from '../../store/selectors';
import { dispatch, useAppState } from '../../store/store';
import { Button } from '../../ui/controls';
import { EmptyState, formatNumber, ScreenHeader, SectionHead } from '../../ui/display';
import { Icon } from '../../ui/Icon';
import { FavoriteButton, useIdeaMeta } from './DateCard';

const DYNAMIC_LABEL: Record<DynamicKind, string> = {
  challenge: '🏁 Reto',
  'random-decision': '🎲 Decisión al azar',
  game: '🎮 Juego',
  twist: '🌀 Twist',
  rules: '📜 Reglas',
  surprise: '🎁 Sorpresa',
  questions: '💬 Preguntas',
  competition: '🏆 Competencia',
  creativity: '🎨 Creatividad',
};

export function IdeaDetail({ id }: { id: string }) {
  const idea = findIdea(selectDateLibrary(), id);
  if (!idea) {
    return (
      <>
        <ScreenHeader onBack={() => navigate('/citas')} title="Cita" />
        <EmptyState emoji="🫧" title="No encontramos esta cita" />
      </>
    );
  }
  return <IdeaView key={idea.id} idea={idea} />;
}

function IdeaView({ idea }: { idea: DateIdea }) {
  const s = useAppState();
  const [planDay, setPlanDay] = useState('');
  const { cat, meta } = useIdeaMeta(idea);
  const today = todayKey();
  const planned = s.dates.logs.find((l) => l.ideaId === idea.id && l.status === 'planned');
  const doneCount = s.dates.logs.filter((l) => l.ideaId === idea.id && l.status === 'done').length;
  const inProgress = planned && (!planned.plannedFor || planned.plannedFor <= today);

  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <ScreenHeader onBack={() => navigate('/citas')} backLabel="Date night" eyebrow={`${cat?.emoji} ${cat?.label}`} title={idea.title} right={<FavoriteButton ideaId={idea.id} />} />

      <div className="idea-hero anim-fade-up" data-tone={cat?.tone}>
        <span>{idea.emoji}</span>
      </div>

      <p className="idea-lead">{idea.description}</p>

      <div className="date-meta">
        {meta.map((m) => (
          <div key={m.k} className="date-meta__item">
            <span className="date-meta__emoji">{m.v?.emoji}</span>
            <span>
              <span className="tiny muted">{m.k}</span>
              <span className="date-meta__value">{m.v?.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="chips">
        <span className="badge badge--gold">⭐ +{formatNumber(dateReward(idea.points))}</span>
        {idea.mood.map((m) => {
          const o = labelOf(MOODS, m);
          return <span key={m} className="chip chip--static">{o?.emoji} {o?.label}</span>;
        })}
        {idea.dynamics.map((d) => (
          <span key={d} className="chip chip--static">{DYNAMIC_LABEL[d]}</span>
        ))}
      </div>

      {idea.preparation.length > 0 && (
        <>
          <SectionHead title="Preparación" />
          <ul className="prep-list">
            {idea.preparation.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}

      <SectionHead title="La dinámica" />
      <ol className="steps">
        {idea.instructions.map((step, i) => (
          <li key={i}>
            <span className="steps__n">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {idea.optionalTwist && (
        <div className="card twist" data-tone="lilac">
          <p className="eyebrow">🌀 Twist opcional</p>
          <p style={{ marginTop: 6 }}>{idea.optionalTwist}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="card idea-actions">
        {inProgress ? (
          <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            <p className="title">✨ ¡Cita en marcha!</p>
            <p className="small muted">Cuando terminen, márquenla para guardarla en su historial.</p>
            <Button variant="primary" size="lg" block onClick={() => dispatch(completeDate(idea.id))}>
              <Icon name="check" size={20} strokeWidth={3} /> ¡La hicimos!
            </Button>
            <Button variant="ghost" size="sm" onClick={() => dispatch(removeDateLog(planned!.id))}>
              Cancelar plan
            </Button>
          </div>
        ) : (
          <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            {planned?.plannedFor && (
              <p className="badge" style={{ alignSelf: 'flex-start' }}>📅 Planeada para el {shortDayLabel(planned.plannedFor)}</p>
            )}
            <Button variant="primary" size="lg" block onClick={() => dispatch(planDate(idea.id, today))}>
              <Icon name="play" size={18} filled strokeWidth={0} /> Empezar ahora
            </Button>
            <div className="row">
              <input
                type="date"
                className="input grow"
                aria-label="Fecha para planear"
                min={today}
                value={planDay}
                onChange={(e) => setPlanDay(e.target.value)}
              />
              <Button variant="soft" disabled={!planDay} onClick={() => { dispatch(planDate(idea.id, planDay)); setPlanDay(''); }}>
                📅 Planear
              </Button>
            </div>
          </div>
        )}
        {doneCount > 0 && <p className="tiny muted center" style={{ marginTop: 12 }}>La han hecho {doneCount} {doneCount === 1 ? 'vez' : 'veces'} 💕</p>}
      </div>
    </div>
  );
}

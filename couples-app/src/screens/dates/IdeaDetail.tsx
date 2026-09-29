import { useState } from 'react';
import { navigate } from '../../app/router';
import { LEVEL_LABEL, MOODS, labelOf } from '../../content/dateOptions';
import { dateReward } from '../../domain/points';
import { shortDayLabel, todayKey } from '../../domain/time';
import { completeDate, deleteDateIdea, planDate, removeDateLog } from '../../features/dates/actions';
import { findIdea } from '../../features/dates/service';
import type { DateIdea } from '../../models/types';
import { dispatch, useAppState } from '../../store/store';
import { Button } from '../../ui/controls';
import { EmptyState, formatNumber, ScreenHeader, SectionHead } from '../../ui/display';
import { ConfirmModal } from '../../ui/forms';
import { Icon } from '../../ui/Icon';
import { useMedia } from '../../ui/useMedia';
import { FavoriteButton, useIdeaMeta } from './DateCard';

export function IdeaDetail({ id }: { id: string }) {
  const s = useAppState();
  const idea = findIdea(s.dateIdeas, id);
  if (!idea) {
    return (
      <>
        <ScreenHeader onBack={() => navigate('/citas/nuestras')} backLabel="Nuestras citas" title="Cita" />
        <EmptyState emoji="🫧" title="Esta cita ya no está en su biblioteca" />
      </>
    );
  }
  return <IdeaView key={idea.id} idea={idea} />;
}

function IdeaView({ idea }: { idea: DateIdea }) {
  const s = useAppState();
  const [planDay, setPlanDay] = useState('');
  const [confirm, setConfirm] = useState(false);
  const { cat, meta } = useIdeaMeta(idea);
  const img = useMedia(idea.imageId);
  const today = todayKey();
  const planned = s.dates.logs.find((l) => l.ideaId === idea.id && l.status === 'planned');
  const doneCount = s.dates.logs.filter((l) => l.ideaId === idea.id && l.status === 'done').length;
  const inProgress = planned && (!planned.plannedFor || planned.plannedFor <= today);

  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/citas/nuestras')}
        backLabel="Nuestras citas"
        eyebrow={`${cat?.emoji} ${cat?.label}`}
        title={idea.title}
        right={<FavoriteButton ideaId={idea.id} />}
      />

      <div className={`idea-hero anim-fade-up ${img ? 'has-image' : ''}`} data-tone={cat?.tone}>
        {img ? <img src={img} alt="" /> : <span>{idea.emoji}</span>}
      </div>

      {idea.description && <p className="idea-lead">{idea.description}</p>}

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
        <span className="chip chip--static">⚡ Espontaneidad {LEVEL_LABEL[idea.spontaneity]}</span>
        <span className="chip chip--static">🧩 Dificultad {LEVEL_LABEL[idea.difficulty]}</span>
        {idea.tags.map((t) => (
          <span key={t} className="chip chip--static">#{t}</span>
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

      {idea.instructions.length > 0 && (
        <>
          <SectionHead title="La dinámica" />
          <ol className="steps">
            {idea.instructions.map((step, i) => (
              <li key={i}>
                <span className="steps__n">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </>
      )}

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
              <Icon name="check" size={20} strokeWidth={3} /> Marcar como realizada
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
            <Button variant="outline" block onClick={() => dispatch(completeDate(idea.id))}>
              ✅ Marcar como realizada
            </Button>
          </div>
        )}
        {doneCount > 0 && (
          <p className="tiny muted center" style={{ marginTop: 12 }}>
            La han hecho {doneCount} {doneCount === 1 ? 'vez' : 'veces'} 💕
          </p>
        )}
      </div>

      <div className="row">
        <Button variant="outline" className="grow" onClick={() => navigate(`/citas/editar/${idea.id}`)}>
          ✏️ Editar
        </Button>
        <Button variant="danger" className="grow" onClick={() => setConfirm(true)}>
          🗑️ Eliminar
        </Button>
      </div>

      <ConfirmModal
        open={confirm}
        emoji="🗑️"
        title="¿Eliminar esta cita?"
        text="Si ya la realizaron, se queda en su historial. Se quita de favoritas y de pendientes."
        confirmLabel="Sí, eliminar"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch(deleteDateIdea(idea.id));
          navigate('/citas/nuestras');
        }}
      />
    </div>
  );
}

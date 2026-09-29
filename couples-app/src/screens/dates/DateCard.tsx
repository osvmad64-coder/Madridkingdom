import { BUDGETS, CATEGORIES, DURATIONS, ENERGIES, LOCATIONS, labelOf } from '../../content/dateOptions';
import { dateReward } from '../../domain/points';
import type { DateIdea } from '../../models/types';
import { toggleFavorite } from '../../features/dates/actions';
import { useMedia } from '../../ui/useMedia';
import { dispatch, useAppState } from '../../store/store';
import { Button } from '../../ui/controls';
import { formatNumber } from '../../ui/display';
import { Icon } from '../../ui/Icon';

/** Tarjeta grande de una cita (resultado de filtros o de Sorpréndenos). */

export function useIdeaMeta(idea: DateIdea) {
  const cat = CATEGORIES.find((c) => c.id === idea.category);
  return {
    cat,
    meta: [
      { k: 'Presupuesto', v: labelOf(BUDGETS, idea.budget) },
      { k: 'Duración', v: labelOf(DURATIONS, idea.duration) },
      { k: 'Lugar', v: labelOf(LOCATIONS, idea.location[0] ?? 'anywhere') },
      { k: 'Energía', v: labelOf(ENERGIES, idea.energy) },
    ],
  };
}

export function FavoriteButton({ ideaId }: { ideaId: string }) {
  const s = useAppState();
  const fav = s.dates.favorites.includes(ideaId);
  return (
    <button
      type="button"
      className={`fav-btn ${fav ? 'is-on' : ''}`}
      aria-pressed={fav}
      aria-label={fav ? 'Quitar de favoritas' : 'Guardar en favoritas'}
      onClick={() => dispatch(toggleFavorite(ideaId))}
    >
      <Icon name="heart" size={24} filled={fav} />
    </button>
  );
}

interface Props {
  idea: DateIdea;
  onAnother?: () => void;
  onStart: () => void;
  onOpen?: () => void;
}

export function DateCard({ idea, onAnother, onStart, onOpen }: Props) {
  const { cat, meta } = useIdeaMeta(idea);
  const img = useMedia(idea.imageId);
  return (
    <article className="date-card anim-pop" key={idea.id}>
      <div className={`date-card__hero ${img ? 'has-image' : ''}`} data-tone={cat?.tone}>
        {img ? <img src={img} alt="" /> : <span className="date-card__emoji">{idea.emoji}</span>}
        <span className="badge date-card__cat">
          {cat?.emoji} {cat?.label}
        </span>
      </div>
      <div className="date-card__body">
        <button type="button" className="date-card__title-btn" onClick={onOpen}>
          <h2 className="date-card__title">{idea.title}</h2>
        </button>
        <p className="muted">{idea.description}</p>
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
        <div className="row between">
          <span className="badge badge--gold">⭐ +{formatNumber(dateReward(idea.points))} pts</span>
          {onOpen && (
            <button type="button" className="link" onClick={onOpen}>
              Ver dinámica →
            </button>
          )}
        </div>
        <div className="date-card__actions">
          <FavoriteButton ideaId={idea.id} />
          {onAnother && (
            <Button variant="outline" onClick={onAnother}>
              🎲 Otra
            </Button>
          )}
          <Button variant="primary" className="grow" onClick={onStart}>
            <Icon name="play" size={18} filled strokeWidth={0} /> Empezar
          </Button>
        </div>
      </div>
    </article>
  );
}

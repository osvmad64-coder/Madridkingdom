import { BUDGETS, CATEGORIES, DURATIONS, LOCATIONS, labelOf } from '../../../content/dateOptions';
import type { DateSnapshot } from '../../../models/types';
import { dispatch, useAppState } from '../../../store/store';
import { Icon } from '../../../ui/Icon';
import { useMedia } from '../../../ui/useMedia';
import { toggleFavorite } from '../actions';

/** Tarjeta de cita para la biblioteca: nombre, $, ⏱, 📍 y ❤️. */
export function IdeaLibraryCard({
  ideaId,
  data,
  imageId,
  sub,
  deleted,
  onOpen,
}: {
  ideaId: string;
  data: DateSnapshot;
  imageId?: string;
  sub?: string;
  deleted?: boolean;
  onOpen?: () => void;
}) {
  const s = useAppState();
  const fav = s.dates.favorites.includes(ideaId);
  const img = useMedia(imageId);
  const cat = CATEGORIES.find((c) => c.id === data.category);
  const budget = labelOf(BUDGETS, data.budget);
  const duration = labelOf(DURATIONS, data.duration);
  const loc = labelOf(LOCATIONS, data.location[0] ?? 'anywhere');

  return (
    <article className={`idea-card ${deleted ? 'is-deleted' : ''}`}>
      <button type="button" className="idea-card__main" onClick={onOpen} disabled={!onOpen}>
        <span className="idea-card__media" data-tone={cat?.tone}>
          {img ? <img src={img} alt="" /> : <span aria-hidden="true">{data.emoji}</span>}
        </span>
        <span className="idea-card__body">
          <span className="idea-card__title">{data.title}</span>
          {sub && <span className="tiny muted">{sub}</span>}
          <span className="idea-card__meta">
            <span>{budget?.emoji} {budget?.label}</span>
            <span>⏱ {duration?.label}</span>
            <span>📍 {loc?.label}</span>
          </span>
        </span>
      </button>
      {!deleted && (
        <button
          type="button"
          className={`fav-btn fav-btn--sm ${fav ? 'is-on' : ''}`}
          aria-pressed={fav}
          aria-label={fav ? 'Quitar de favoritas' : 'Guardar en favoritas'}
          onClick={() => dispatch(toggleFavorite(ideaId))}
        >
          <Icon name="heart" size={20} filled={fav} />
        </button>
      )}
    </article>
  );
}

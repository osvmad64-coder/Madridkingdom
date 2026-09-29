import { positionCategory } from '../../../content/positionOptions';
import { useMedia } from '../../../ui/useMedia';
import { formatNumber } from '../../../ui/display';
import { DIFFICULTY_LABEL } from '../../challenges/service';
import type { Position } from '../model';

/** Miniatura de una posición (imagen o marcador elegante si no tiene). */
export function PositionThumb({ thumbId, imageId, size = 64 }: { thumbId?: string; imageId?: string; size?: number }) {
  const url = useMedia(thumbId ?? imageId);
  return (
    <span className="position-thumb" style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" /> : <span aria-hidden="true">💋</span>}
    </span>
  );
}

/** Tarjeta de posición para la biblioteca. */
export function PositionCard({ position: p, onOpen }: { position: Position; onOpen: () => void }) {
  const cat = positionCategory(p.category);
  return (
    <button type="button" className={`card card--tap position-card ${p.active ? '' : 'is-inactive'}`} onClick={onOpen}>
      <PositionThumb thumbId={p.thumbId} imageId={p.imageId} size={72} />
      <div className="grow" style={{ minWidth: 0 }}>
        <p className="eyebrow">{cat.emoji} {cat.label} · {DIFFICULTY_LABEL[p.difficulty]}</p>
        <p className="library-card__title">{p.name}</p>
        <p className="tiny muted clamp-2">{p.description || 'Sin descripción'}</p>
        <div className="row" style={{ '--gap': '6px', marginTop: 6 } as React.CSSProperties}>
          <span className="badge badge--gold">⭐ +{formatNumber(p.points)}</span>
          {!p.active && <span className="badge">Inactiva</span>}
        </div>
      </div>
    </button>
  );
}

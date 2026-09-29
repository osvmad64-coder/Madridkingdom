import type { DayKey } from '../../../models/types';
import { dispatch, useAppState } from '../../../store/store';
import { Sheet } from '../../../ui/overlays';
import { swapPosition } from '../actions';
import { positionPool } from '../service';
import { PositionThumb } from './PositionCard';

/** Hoja para elegir otra posición activa para un día. */
export function PositionPicker({
  day,
  currentId,
  open,
  onClose,
}: {
  day: DayKey;
  currentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const s = useAppState();
  const pool = positionPool(s);
  return (
    <Sheet open={open} onClose={onClose} label="Elegir posición">
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h2 className="title" style={{ fontSize: 'var(--fs-2xl)' }}>Elegir posición</h2>
        <div className="picker-grid">
          {pool.map((p) => (
            <button
              key={p.id}
              type="button"
              className="picker-item"
              aria-pressed={p.id === currentId}
              onClick={() => {
                dispatch(swapPosition(day, p.id));
                onClose();
              }}
            >
              <PositionThumb thumbId={p.thumbId} imageId={p.imageId} size={88} />
              <span className="small" style={{ fontWeight: 700 }}>{p.name}</span>
              <span className="tiny muted">+{p.points}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

import { BUDGETS, DURATIONS, ENERGIES, LOCATIONS, MOODS, type Option } from '../../content/dateOptions';
import { activeFilterCount, EMPTY_FILTERS, filterIdeas } from '../../domain/dateNight';
import type { DateCategory, DateFilters } from '../../models/types';
import { selectDateLibrary } from '../../store/selectors';
import { useAppState } from '../../store/store';
import { setFilters, toggleFilter, useFilters } from '../../store/uiState';
import { Button, Chip } from '../../ui/controls';
import { Sheet } from '../../ui/overlays';

/** Hoja de filtros con chips (sin dropdowns). */

const GROUPS: { key: keyof DateFilters; title: string; options: Option<string>[] }[] = [
  { key: 'budget', title: 'Presupuesto', options: BUDGETS },
  { key: 'location', title: 'Lugar', options: LOCATIONS },
  { key: 'duration', title: 'Duración', options: DURATIONS },
  { key: 'mood', title: 'Mood', options: MOODS },
  { key: 'energy', title: 'Energía', options: ENERGIES },
];

export function FilterSheet({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category?: DateCategory | null;
}) {
  const s = useAppState();
  const filters = useFilters();
  const count = filterIdeas(selectDateLibrary(), { filters, category, settings: s.settings }).length;

  return (
    <Sheet open={open} onClose={onClose} label="Filtros">
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div className="row between">
          <h2 className="title" style={{ fontSize: 'var(--fs-2xl)' }}>Filtros</h2>
          {activeFilterCount(filters) > 0 && (
            <button type="button" className="link" onClick={() => setFilters(EMPTY_FILTERS)}>
              Limpiar
            </button>
          )}
        </div>
        {GROUPS.map((g) => (
          <div key={g.key} className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <p className="eyebrow">{g.title}</p>
            <div className="chips">
              {g.options.map((o) => (
                <Chip
                  key={o.id}
                  emoji={o.emoji}
                  selected={(filters[g.key] as string[]).includes(o.id)}
                  onToggle={() => toggleFilter(g.key, o.id as never)}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
        <Button variant="primary" size="lg" block onClick={onClose} disabled={count === 0}>
          {count === 0 ? 'Sin ideas con estos filtros' : `Ver ${count} ${count === 1 ? 'idea' : 'ideas'}`}
        </Button>
      </div>
    </Sheet>
  );
}

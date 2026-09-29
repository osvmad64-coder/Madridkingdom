import { useEffect, useMemo, useState } from 'react';
import { navigate } from '../../app/router';
import { CATEGORIES } from '../../content/dateOptions';
import { activeFilterCount, EMPTY_FILTERS, filterIdeas, pickIdea } from '../../domain/dateNight';
import { todayKey } from '../../domain/time';
import type { DateCategory } from '../../models/types';
import { markShown, planDate } from '../../store/actions';
import { selectDateLibrary } from '../../store/selectors';
import { dispatch, store, useAppState } from '../../store/store';
import { setFilters, useFilters } from '../../store/uiState';
import { Button, Chip } from '../../ui/controls';
import { EmptyState, ScreenHeader, SectionHead } from '../../ui/display';
import { Icon } from '../../ui/Icon';
import { DateCard } from './DateCard';
import { FilterSheet } from './FilterSheet';

/** Generador de citas: categoría + filtros → una tarjeta grande. */
export function ExploreScreen({ category: initial }: { category: string | null }) {
  const s = useAppState();
  const filters = useFilters();
  const [category, setCategory] = useState<DateCategory | null>((initial as DateCategory) || null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const matches = useMemo(
    () => filterIdeas(selectDateLibrary(), { filters, category, settings: s.settings }),
    [filters, category, s.settings],
  );
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Elegir una idea cuando cambian los resultados.
  useEffect(() => {
    const pick = pickIdea(matches, store.getState().dates.recent);
    setCurrentId(pick?.id ?? null);
    if (pick) dispatch(markShown(pick.id));
  }, [matches]);

  const current = matches.find((i) => i.id === currentId) ?? null;
  const categories = CATEGORIES.filter((c) => s.settings.enabledCategories.includes(c.id));
  const nFilters = activeFilterCount(filters);

  const another = () => {
    const pick = pickIdea(matches, s.dates.recent, { exclude: currentId ?? undefined });
    if (pick) {
      setCurrentId(pick.id);
      dispatch(markShown(pick.id));
    }
  };
  const start = (id: string) => {
    dispatch(planDate(id, todayKey()));
    navigate(`/citas/idea/${id}`);
  };

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/citas')}
        backLabel="Date night"
        eyebrow={`${matches.length} ${matches.length === 1 ? 'idea' : 'ideas'}`}
        title={category ? <>{CATEGORIES.find((c) => c.id === category)?.label}</> : <>Ideas para <em>hoy</em></>}
        right={
          <Button variant={nFilters ? 'soft' : 'outline'} icon aria-label="Filtros" onClick={() => setFiltersOpen(true)}>
            <Icon name="filter" size={20} />
            {nFilters > 0 && <span className="dot-count">{nFilters}</span>}
          </Button>
        }
      />

      <div className="chips chips--scroll">
        <Chip selected={!category} onToggle={() => setCategory(null)}>Todas</Chip>
        {categories.map((c) => (
          <Chip key={c.id} emoji={c.emoji} selected={category === c.id} onToggle={() => setCategory(category === c.id ? null : c.id)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {current ? (
        <DateCard
          idea={current}
          onAnother={matches.length > 1 ? another : undefined}
          onStart={() => start(current.id)}
          onOpen={() => navigate(`/citas/idea/${current.id}`)}
        />
      ) : (
        <EmptyState emoji="🫧" title="Ninguna idea con estos filtros">
          <div className="stack" style={{ alignItems: 'center', marginTop: 8 }}>
            Prueben quitar algún filtro.
            <Button variant="soft" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setCategory(null); }}>
              Limpiar filtros
            </Button>
          </div>
        </EmptyState>
      )}

      {matches.length > 1 && (
        <>
          <SectionHead title="Todas las opciones" />
          <div className="list">
            {matches.map((i) => (
              <button key={i.id} type="button" className="list-row" onClick={() => navigate(`/citas/idea/${i.id}`)}>
                <span className="list-row__icon" data-tone={CATEGORIES.find((c) => c.id === i.category)?.tone}>{i.emoji}</span>
                <div className="grow">
                  <p style={{ fontWeight: 700 }}>{i.title}</p>
                  <p className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.description}</p>
                </div>
                {s.dates.favorites.includes(i.id) && <span aria-label="Favorita">❤️</span>}
              </button>
            ))}
          </div>
        </>
      )}

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} category={category} />
    </div>
  );
}

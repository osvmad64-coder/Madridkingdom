import { useState } from 'react';
import { navigate } from '../../app/router';
import { CATEGORIES } from '../../content/dateOptions';
import { activeFilterCount, filterIdeas, plannedLogs } from '../../domain/dateNight';
import { selectDateLibrary } from '../../store/selectors';
import { useAppState } from '../../store/store';
import { useFilters } from '../../store/uiState';
import { Button } from '../../ui/controls';
import { ScreenHeader, SectionHead } from '../../ui/display';
import { Icon } from '../../ui/Icon';
import { FilterSheet } from './FilterSheet';

export function DatesHome() {
  const s = useAppState();
  const filters = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const library = selectDateLibrary();
  const categories = CATEGORIES.filter((c) => s.settings.enabledCategories.includes(c.id));
  const nFilters = activeFilterCount(filters);
  const pending = plannedLogs(s.dates.logs).length;

  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <ScreenHeader
        eyebrow="Date night"
        title={<>¿No saben <em>qué hacer?</em></>}
      />

      <button type="button" className="surprise-hero anim-fade-up" onClick={() => navigate('/citas/sorpresa')}>
        <span className="surprise-hero__sparkles" aria-hidden="true">✦ ✧ ✦</span>
        <span className="surprise-hero__dice" aria-hidden="true">🎲</span>
        <span className="surprise-hero__label">Sorpréndenos</span>
        <span className="surprise-hero__sub">Yo tengo una idea.</span>
      </button>

      <div className="row">
        <Button variant="outline" className="grow" onClick={() => setFiltersOpen(true)}>
          <Icon name="filter" size={18} /> Filtros{nFilters ? ` · ${nFilters}` : ''}
        </Button>
        <Button variant="outline" className="grow" onClick={() => navigate('/citas/nuestras')}>
          💕 Nuestras citas{pending ? ` · ${pending}` : ''}
        </Button>
      </div>

      <SectionHead
        title="Categorías"
        action={
          <button type="button" className="link" onClick={() => navigate('/citas/explorar')}>
            Ver todas
          </button>
        }
      />
      <div className="category-grid stagger">
        {categories.map((c) => {
          const n = filterIdeas(library, { category: c.id, settings: s.settings }).length;
          return (
            <button
              key={c.id}
              type="button"
              className="category-tile"
              data-tone={c.tone}
              onClick={() => navigate(`/citas/explorar?cat=${c.id}`)}
            >
              <span className="category-tile__emoji">{c.emoji}</span>
              <span className="category-tile__label">{c.label}</span>
              <span className="tiny muted">{n} {n === 1 ? 'idea' : 'ideas'}</span>
            </button>
          );
        })}
      </div>

      <button type="button" className="card card--tap card--sm row" onClick={() => navigate('/citas/random')}>
        <span className="list-row__icon" data-tone="lilac">⚙️</span>
        <div className="grow">
          <p style={{ fontWeight: 700 }}>Nuestro Random</p>
          <p className="tiny muted">Elijan qué puede incluir Sorpréndenos</p>
        </div>
        <Icon name="chevronRight" size={20} />
      </button>

      <FilterSheet
        open={filtersOpen}
        onClose={() => {
          setFiltersOpen(false);
          if (activeFilterCount(filters)) navigate('/citas/explorar');
        }}
      />
    </div>
  );
}

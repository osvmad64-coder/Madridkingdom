import { useState } from 'react';
import { navigate } from '../../app/router';
import { CATEGORIES } from '../../content/dateOptions';
import { activeFilterCount, filterIdeas } from '../../features/dates/service';
import { selectDateLibrary } from '../../store/selectors';
import { useAppState } from '../../store/store';
import { useFilters } from '../../store/uiState';
import { Button } from '../../ui/controls';
import { EmptyState, ScreenHeader, SectionHead } from '../../ui/display';
import { Icon } from '../../ui/Icon';
import { FilterSheet } from './FilterSheet';

/** 💕 Date Night: portada de la biblioteca personal. */
export function DatesHome() {
  const s = useAppState();
  const filters = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const library = selectDateLibrary(s);
  const nFilters = activeFilterCount(filters);
  const matching = filterIdeas(library, { filters, settings: s.settings }).length;
  const categories = CATEGORIES.filter((c) => s.settings.enabledCategories.includes(c.id))
    .map((c) => ({ ...c, n: filterIdeas(library, { category: c.id, settings: s.settings }).length }))
    .filter((c) => c.n > 0);

  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <ScreenHeader eyebrow="Date night" title={<>Nuestras <em>citas</em></>} />

      <p className="dates-count anim-fade-up">
        {library.length === 0
          ? 'Aquí van a vivir sus planes. Empiecen agregando el primero.'
          : `Tenemos ${library.length} ${library.length === 1 ? 'plan guardado' : 'planes guardados'}.`}
      </p>

      {library.length > 0 && (
        <button type="button" className="surprise-hero anim-fade-up" onClick={() => navigate('/citas/sorpresa')}>
          <span className="surprise-hero__sparkles" aria-hidden="true">✦ ✧ ✦</span>
          <span className="surprise-hero__dice" aria-hidden="true">🎲</span>
          <span className="surprise-hero__label">Sorpréndenos</span>
          <span className="surprise-hero__sub">
            {nFilters ? `Entre ${matching} ${matching === 1 ? 'cita' : 'citas'} con sus filtros` : 'Entre todas nuestras citas'}
          </span>
        </button>
      )}

      <div className="row">
        {library.length > 0 && (
          <Button variant={nFilters ? 'soft' : 'outline'} className="grow" onClick={() => setFiltersOpen(true)}>
            <Icon name="filter" size={18} /> Filtrar{nFilters ? ` · ${nFilters}` : ''}
          </Button>
        )}
        <Button variant={library.length ? 'outline' : 'primary'} className="grow" onClick={() => navigate('/citas/nueva')}>
          + Agregar
        </Button>
      </div>

      {library.length === 0 ? (
        <EmptyState emoji="💕" title="Su colección empieza aquí">
          Cada cita que agreguen guarda sus propios filtros: presupuesto, lugar, duración, mood y energía. Sorpréndenos elegirá solo entre ellas.
        </EmptyState>
      ) : (
        <>
          <button type="button" className="card card--tap card--sm row" onClick={() => navigate('/citas/nuestras')}>
            <span className="list-row__icon" data-tone="rose">📚</span>
            <div className="grow">
              <p style={{ fontWeight: 700 }}>Biblioteca</p>
              <p className="tiny muted">Todas, favoritas, realizadas y pendientes</p>
            </div>
            <Icon name="chevronRight" size={20} />
          </button>

          {categories.length > 0 && (
            <>
              <SectionHead title="Por categoría" />
              <div className="category-grid stagger">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="category-tile"
                    data-tone={c.tone}
                    onClick={() => navigate(`/citas/explorar?cat=${c.id}`)}
                  >
                    <span className="category-tile__emoji">{c.emoji}</span>
                    <span className="category-tile__label">{c.label}</span>
                    <span className="tiny muted">{c.n} {c.n === 1 ? 'cita' : 'citas'}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <button type="button" className="card card--tap card--sm row" onClick={() => navigate('/citas/random')}>
            <span className="list-row__icon" data-tone="lilac">⚙️</span>
            <div className="grow">
              <p style={{ fontWeight: 700 }}>Nuestro Random</p>
              <p className="tiny muted">Qué puede incluir Sorpréndenos</p>
            </div>
            <Icon name="chevronRight" size={20} />
          </button>
        </>
      )}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onShow={() => {
          setFiltersOpen(false);
          navigate('/citas/explorar');
        }}
      />
    </div>
  );
}

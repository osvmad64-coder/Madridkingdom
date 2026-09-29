import { useState } from 'react';
import { navigate } from '../../app/router';
import { CATEGORIES } from '../../content/dateOptions';
import { doneLogs, findIdea, plannedLogs } from '../../domain/dateNight';
import { shortDayLabel, todayKey } from '../../domain/time';
import type { DateIdea } from '../../models/types';
import { removeDateLog } from '../../store/actions';
import { selectDateLibrary } from '../../store/selectors';
import { dispatch, useAppState } from '../../store/store';
import { Segmented } from '../../ui/controls';
import { EmptyState, ScreenHeader, StatTile } from '../../ui/display';
import { Icon } from '../../ui/Icon';

/** 💕 Nuestras citas: favoritas, pendientes/próximas y realizadas. */

type Tab = 'favorites' | 'pending' | 'done';
const TABS: { id: Tab; label: string }[] = [
  { id: 'favorites', label: 'Favoritas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'done', label: 'Realizadas' },
];

export function OurDatesScreen({ initialTab }: { initialTab: string | null }) {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>((TABS.find((t) => t.id === initialTab)?.id as Tab) ?? 'favorites');
  const lib = selectDateLibrary();
  const today = todayKey();
  const favorites = s.dates.favorites.map((id) => findIdea(lib, id)).filter(Boolean) as DateIdea[];
  const pending = plannedLogs(s.dates.logs);
  const done = doneLogs(s.dates.logs);

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader onBack={() => navigate('/citas')} backLabel="Date night" eyebrow="Historial" title={<>Nuestras <em>citas</em></>} />

      <div className="grid-3">
        <StatTile emoji="💕" value={done.length} label="realizadas" />
        <StatTile emoji="❤️" value={favorites.length} label="favoritas" />
        <StatTile emoji="📅" value={pending.length} label="pendientes" />
      </div>

      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab === 'favorites' &&
        (favorites.length ? (
          <div className="list stagger" key="fav">
            {favorites.map((i) => (
              <IdeaRow key={i.id} idea={i} right={<span>❤️</span>} />
            ))}
          </div>
        ) : (
          <EmptyState emoji="🤍" title="Sin favoritas todavía">Toquen ❤️ en una cita para guardarla aquí.</EmptyState>
        ))}

      {tab === 'pending' &&
        (pending.length ? (
          <div className="list stagger" key="pen">
            {pending.map((l) => {
              const i = findIdea(lib, l.ideaId);
              if (!i) return null;
              const upcoming = l.plannedFor && l.plannedFor > today;
              return (
                <IdeaRow
                  key={l.id}
                  idea={i}
                  sub={upcoming ? `Próxima · ${shortDayLabel(l.plannedFor!)}` : 'En marcha'}
                  right={
                    <button type="button" className="btn btn--ghost btn--icon" aria-label="Quitar" onClick={(e) => { e.stopPropagation(); dispatch(removeDateLog(l.id)); }}>
                      <Icon name="close" size={18} />
                    </button>
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState emoji="📅" title="Nada pendiente">Toquen “Empezar” o “Planear” en una cita.</EmptyState>
        ))}

      {tab === 'done' &&
        (done.length ? (
          <div className="list stagger" key="done">
            {done.map((l) => {
              const i = findIdea(lib, l.ideaId);
              if (!i) return null;
              return <IdeaRow key={l.id} idea={i} sub={`✓ ${l.doneDay ? shortDayLabel(l.doneDay) : ''}`} right={<span className="badge badge--success">Hecha</span>} />;
            })}
          </div>
        ) : (
          <EmptyState emoji="🌙" title="Aún no hay citas realizadas">Su primera cita está a un 🎲 de distancia.</EmptyState>
        ))}
    </div>
  );
}

function IdeaRow({ idea, sub, right }: { idea: DateIdea; sub?: string; right?: React.ReactNode }) {
  const tone = CATEGORIES.find((c) => c.id === idea.category)?.tone;
  return (
    <div className="list-row" role="button" tabIndex={0} onClick={() => navigate(`/citas/idea/${idea.id}`)}>
      <span className="list-row__icon" data-tone={tone}>{idea.emoji}</span>
      <div className="grow">
        <p style={{ fontWeight: 700 }}>{idea.title}</p>
        <p className="tiny muted">{sub ?? CATEGORIES.find((c) => c.id === idea.category)?.label}</p>
      </div>
      {right}
    </div>
  );
}

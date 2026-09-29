import { useState } from 'react';
import { navigate } from '../../app/router';
import { dateSnapshot, doneLogs, logView, plannedLogs } from '../../features/dates/service';
import { removeDateLog } from '../../features/dates/actions';
import { IdeaLibraryCard } from '../../features/dates/ui/IdeaLibraryCard';
import { shortDayLabel, todayKey } from '../../domain/time';
import { dispatch, useAppState } from '../../store/store';
import { Button, Segmented } from '../../ui/controls';
import { EmptyState, ScreenHeader } from '../../ui/display';

/** 💕 Nuestras citas: la biblioteca personal (todas, favoritas, realizadas, pendientes). */

type Tab = 'all' | 'favorites' | 'done' | 'pending';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'favorites', label: 'Favoritas' },
  { id: 'done', label: 'Realizadas' },
  { id: 'pending', label: 'Pendientes' },
];

export function OurDatesScreen({ initialTab }: { initialTab: string | null }) {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>((TABS.find((t) => t.id === initialTab)?.id as Tab) ?? 'all');
  const lib = s.dateIdeas;
  const today = todayKey();
  const favorites = lib.filter((i) => s.dates.favorites.includes(i.id));
  const pending = plannedLogs(s.dates.logs);
  const done = doneLogs(s.dates.logs);

  const ideaCard = (i: (typeof lib)[number], sub?: string) => (
    <IdeaLibraryCard key={i.id} ideaId={i.id} data={dateSnapshot(i)} imageId={i.imageId} sub={sub} onOpen={() => navigate(`/citas/idea/${i.id}`)} />
  );

  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/citas')}
        backLabel="Date night"
        eyebrow={`${lib.length} ${lib.length === 1 ? 'plan guardado' : 'planes guardados'}`}
        title={<>Nuestra <em>biblioteca</em></>}
      />
      <Button variant="primary" size="lg" block onClick={() => navigate('/citas/nueva')}>
        + Nueva cita
      </Button>
      <Segmented options={TABS} value={tab} onChange={setTab} />

      <div className="stack stagger" style={{ '--gap': '10px' } as React.CSSProperties} key={tab}>
        {tab === 'all' &&
          (lib.length ? lib.map((i) => ideaCard(i)) : (
            <EmptyState emoji="💕" title="Aún no hay citas">Agreguen la primera con “+ Nueva cita”.</EmptyState>
          ))}

        {tab === 'favorites' &&
          (favorites.length ? favorites.map((i) => ideaCard(i)) : (
            <EmptyState emoji="🤍" title="Sin favoritas todavía">Toquen ❤️ en una cita para guardarla aquí.</EmptyState>
          ))}

        {tab === 'done' &&
          (done.length ? (
            done.map((l) => {
              const v = logView(l, lib);
              if (!v) return null;
              const when = l.doneDay ? `✓ Realizada el ${shortDayLabel(l.doneDay)}` : '✓ Realizada';
              return (
                <IdeaLibraryCard
                  key={l.id}
                  ideaId={l.ideaId}
                  data={v}
                  imageId={v.idea?.imageId}
                  deleted={v.deleted}
                  sub={v.deleted ? `${when} · ya no está en la biblioteca` : when}
                  onOpen={v.deleted ? undefined : () => navigate(`/citas/idea/${l.ideaId}`)}
                />
              );
            })
          ) : (
            <EmptyState emoji="🌙" title="Aún no hay citas realizadas">Márquenlas con “✅ Marcar como realizada”.</EmptyState>
          ))}

        {tab === 'pending' &&
          (pending.length ? (
            pending.map((l) => {
              const v = logView(l, lib);
              if (!v) return null;
              const upcoming = l.plannedFor && l.plannedFor > today;
              return (
                <div key={l.id} className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
                  <IdeaLibraryCard
                    ideaId={l.ideaId}
                    data={v}
                    imageId={v.idea?.imageId}
                    sub={upcoming ? `📅 Próxima · ${shortDayLabel(l.plannedFor!)}` : '✨ En marcha'}
                    onOpen={() => navigate(`/citas/idea/${l.ideaId}`)}
                  />
                  <button type="button" className="link" style={{ alignSelf: 'flex-end' }} onClick={() => dispatch(removeDateLog(l.id))}>
                    Quitar de pendientes
                  </button>
                </div>
              );
            })
          ) : (
            <EmptyState emoji="📅" title="Nada pendiente">Toquen “Empezar” o “Planear” en una cita.</EmptyState>
          ))}
      </div>
    </div>
  );
}

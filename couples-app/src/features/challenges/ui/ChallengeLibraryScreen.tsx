import { useState } from 'react';
import { navigate } from '../../../app/router';
import { dispatch, useAppState } from '../../../store/store';
import { Button, Segmented } from '../../../ui/controls';
import { EmptyState, formatNumber, ScreenHeader } from '../../../ui/display';
import { setChallengeActive } from '../actions';
import { CHALLENGE_TYPE_LABEL } from '../service';

type Tab = 'all' | 'active' | 'inactive';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'inactive', label: 'Inactivos' },
];

/** 🎯 Mis retos: biblioteca de retos privados. */
export function ChallengeLibraryScreen() {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>('all');
  const list = s.challenges.filter((c) => (tab === 'all' ? true : tab === 'active' ? c.active : !c.active));
  const activeCount = s.challenges.filter((c) => c.active).length;

  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/ajustes')}
        backLabel="Ajustes"
        eyebrow="🔒 Contenido privado"
        title={<>Mis <em>retos</em></>}
      />
      <p className="small muted">
        {activeCount} activos de {s.challenges.length}. Solo los activos pueden salir en el calendario.
      </p>
      <Button variant="primary" size="lg" block onClick={() => navigate('/ajustes/retos/nuevo')}>
        + Crear reto
      </Button>
      <Segmented options={TABS} value={tab} onChange={setTab} />

      {list.length ? (
        <div className="stack stagger" style={{ '--gap': '12px' } as React.CSSProperties} key={tab}>
          {list.map((c) => (
            <article key={c.id} className={`card library-card ${c.active ? '' : 'is-inactive'}`}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="library-card__emoji">{c.emoji}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className="eyebrow">❤️ Reto privado · {CHALLENGE_TYPE_LABEL[c.type]}</p>
                  <p className="library-card__title">{c.title}</p>
                  <p className="small muted clamp-2">{c.text || c.description}</p>
                </div>
              </div>
              <div className="row between library-card__foot">
                <span className="badge badge--gold">⭐ +{formatNumber(c.reward.points)} puntos</span>
                <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/ajustes/retos/${c.id}`)}>
                    Editar
                  </Button>
                  <Button variant={c.active ? 'ghost' : 'soft'} size="sm" onClick={() => dispatch(setChallengeActive(c.id, !c.active))}>
                    {c.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState emoji="🎯" title={tab === 'inactive' ? 'No hay retos inactivos' : 'Aún no hay retos'}>
          Creen su primer reto privado con “+ Crear reto”.
        </EmptyState>
      )}
    </div>
  );
}

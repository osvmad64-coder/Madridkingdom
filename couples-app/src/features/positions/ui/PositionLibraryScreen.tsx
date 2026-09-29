import { useState } from 'react';
import { navigate } from '../../../app/router';
import { gameConfig } from '../../../config/game';
import { updateSettings } from '../../../store/actions';
import { dispatch, useAppState } from '../../../store/store';
import { Button, Segmented } from '../../../ui/controls';
import { EmptyState, ScreenHeader } from '../../../ui/display';
import { PositionCard } from './PositionCard';

type Tab = 'all' | 'active' | 'inactive';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Activas' },
  { id: 'inactive', label: 'Inactivas' },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** 💋 Biblioteca de posiciones + frecuencia (positionFrequency). */
export function PositionLibraryScreen() {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>('all');
  const list = s.positions.filter((p) => (tab === 'all' ? true : tab === 'active' ? p.active : !p.active));
  const freq = s.settings.positionFrequency;

  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <ScreenHeader
        onBack={() => navigate('/ajustes')}
        backLabel="Ajustes"
        eyebrow="🔒 Contenido privado"
        title={<>Posiciones <em>especiales</em></>}
      />

      <section className="card card--flat stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <p style={{ fontWeight: 700 }}>Frecuencia</p>
        <p className="tiny muted">
          De los días con reto, cuántos reciben también una posición. Aplica a los días que aún no se sortean.
        </p>
        <Segmented
          options={gameConfig.positions.frequencyOptions.map((f) => ({ id: String(f), label: pct(f) }))}
          value={String(freq)}
          onChange={(v) => dispatch(updateSettings({ positionFrequency: Number(v) }))}
        />
      </section>

      <Button variant="primary" size="lg" block onClick={() => navigate('/ajustes/posiciones/nueva')}>
        + Agregar posición
      </Button>
      {s.positions.length > 0 && <Segmented options={TABS} value={tab} onChange={setTab} />}

      {list.length ? (
        <div className="stack stagger" style={{ '--gap': '12px' } as React.CSSProperties} key={tab}>
          {list.map((p) => (
            <PositionCard key={p.id} position={p} onOpen={() => navigate(`/ajustes/posiciones/${p.id}`)} />
          ))}
        </div>
      ) : (
        <EmptyState emoji="💋" title={s.positions.length ? 'Nada por aquí' : 'Su biblioteca está vacía'}>
          Agreguen posiciones con su nombre, descripción e imagen. Solo usen imágenes que tengan derecho a usar.
        </EmptyState>
      )}
    </div>
  );
}

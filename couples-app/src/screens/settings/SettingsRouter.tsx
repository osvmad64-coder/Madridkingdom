import type { Route } from '../../app/router';
import { ChallengeEditorScreen } from '../../features/challenges/ui/ChallengeEditorScreen';
import { ChallengeLibraryScreen } from '../../features/challenges/ui/ChallengeLibraryScreen';
import { PositionEditorScreen } from '../../features/positions/ui/PositionEditorScreen';
import { PositionLibraryScreen } from '../../features/positions/ui/PositionLibraryScreen';
import { SettingsScreen } from './SettingsScreen';

/** Sub-rutas de Ajustes: /ajustes/retos, /ajustes/posiciones… */
export function SettingsRouter({ route }: { route: Route }) {
  const [, sub, id] = route.segments;
  if (sub === 'retos') {
    if (id === 'nuevo') return <ChallengeEditorScreen />;
    if (id) return <ChallengeEditorScreen id={id} />;
    return <ChallengeLibraryScreen />;
  }
  if (sub === 'posiciones') {
    if (id === 'nueva') return <PositionEditorScreen />;
    if (id) return <PositionEditorScreen id={id} />;
    return <PositionLibraryScreen />;
  }
  return <SettingsScreen />;
}

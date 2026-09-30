import { useEffect } from 'react';
import type { Route } from '../../app/router';
import { ensureCurrentPeriod } from '../../store/actions';
import { dispatch, useAppState } from '../../store/store';
import { LetterEditorScreen } from '../../features/letters/ui/LetterEditorScreen';
import { LetterReadScreen } from '../../features/letters/ui/LetterReadScreen';
import { LettersScreen } from '../../features/letters/ui/LettersScreen';
import { MissionsScreen } from '../../features/missions/ui/MissionsScreen';
import { MomentEditorScreen } from '../../features/moments/ui/MomentEditorScreen';
import { MomentsScreen } from '../../features/moments/ui/MomentsScreen';
import { UsScreen } from './UsScreen';

/** Sub-rutas de Nosotros: /nosotros/momentos, /nosotros/cartas, /nosotros/misiones. */
export function UsRouter({ route }: { route: Route }) {
  const [, sub, a, b] = route.segments;
  // Si el estado se reemplazó (respaldo importado, datos de ejemplo), crea las misiones del mes.
  const hasMonth = Object.keys(useAppState().monthlyMissions).length > 0;
  useEffect(() => {
    if (!hasMonth) dispatch(ensureCurrentPeriod);
  }, [hasMonth]);
  if (sub === 'momentos') {
    if (a === 'nueva') return <MomentEditorScreen kind={route.query.get('kind')} />;
    if (a) return <MomentEditorScreen id={a} />;
    return <MomentsScreen />;
  }
  if (sub === 'cartas') {
    if (a === 'nueva') return <LetterEditorScreen />;
    if (a === 'editar' && b) return <LetterEditorScreen id={b} />;
    if (a) return <LetterReadScreen id={a} />;
    return <LettersScreen />;
  }
  if (sub === 'misiones') return <MissionsScreen />;
  return <UsScreen />;
}

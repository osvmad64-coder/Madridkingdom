import { useEffect, useRef, type ReactNode } from 'react';
import { HomeScreen } from '../screens/home/HomeScreen';
import { IntimacyScreen } from '../screens/intimacy/IntimacyScreen';
import { DatesRouter } from '../screens/dates/DatesRouter';
import { UsRouter } from '../screens/us/UsRouter';
import { ensureCurrentPeriod } from '../store/actions';
import { dispatch } from '../store/store';
import { useToday } from './useToday';
import { SettingsRouter } from '../screens/settings/SettingsRouter';
import { FxLayer } from '../ui/FxLayer';
import { useRoute, type TabId } from './router';
import { TabBar } from './TabBar';

const SECTION: Partial<Record<TabId, string>> = { dates: 'dates' };

export function App() {
  const route = useRoute();
  const scrollRef = useRef<HTMLElement>(null);
  // Al abrir la app y cada vez que cambia el día (o el mes): preparar el periodo.
  // Al cambiar `today` toda la app se vuelve a dibujar con la fecha nueva.
  const today = useToday();
  useEffect(() => {
    dispatch(ensureCurrentPeriod);
  }, [today]);

  // Cada cambio de pantalla empieza arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [route.key]);

  let screen: ReactNode;
  switch (route.tab) {
    case 'intimacy':
      screen = <IntimacyScreen />;
      break;
    case 'dates':
      screen = <DatesRouter route={route} />;
      break;
    case 'us':
      screen = <UsRouter route={route} />;
      break;
    case 'settings':
      screen = <SettingsRouter route={route} />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <div className="app-frame" data-section={SECTION[route.tab]}>
      <main ref={scrollRef} className="screen" key={route.key}>
        {screen}
      </main>
      <TabBar active={route.tab} />
      <div id="overlay-root" />
      <FxLayer />
    </div>
  );
}

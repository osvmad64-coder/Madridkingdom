import { useEffect, useRef, type ReactNode } from 'react';
import { HomeScreen } from '../screens/home/HomeScreen';
import { IntimacyScreen } from '../screens/intimacy/IntimacyScreen';
import { DatesRouter } from '../screens/dates/DatesRouter';
import { UsScreen } from '../screens/us/UsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { FxLayer } from '../ui/FxLayer';
import { useRoute, type TabId } from './router';
import { TabBar } from './TabBar';

const SECTION: Partial<Record<TabId, string>> = { dates: 'dates' };

export function App() {
  const route = useRoute();
  const scrollRef = useRef<HTMLElement>(null);

  // Cada cambio de pantalla empieza arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [route.path]);

  let screen: ReactNode;
  switch (route.tab) {
    case 'intimacy':
      screen = <IntimacyScreen />;
      break;
    case 'dates':
      screen = <DatesRouter route={route} />;
      break;
    case 'us':
      screen = <UsScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <div className="app-frame" data-section={SECTION[route.tab]}>
      <main ref={scrollRef} className="screen" key={route.path}>
        {screen}
      </main>
      <TabBar active={route.tab} />
      <div id="overlay-root" />
      <FxLayer />
    </div>
  );
}

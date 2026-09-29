import { Icon, type IconName } from '../ui/Icon';
import { haptic } from '../ui/haptics';
import { navigate, TAB_PATH, type TabId } from './router';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'intimacy', label: 'Intimidad', icon: 'heart' },
  { id: 'dates', label: 'Citas', icon: 'sparkle' },
  { id: 'us', label: 'Nosotros', icon: 'chart' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
];

export function TabBar({ active }: { active: TabId }) {
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            className="tab"
            aria-current={on ? 'page' : undefined}
            onClick={() => {
              haptic();
              navigate(TAB_PATH[t.id]);
            }}
          >
            <Icon name={t.icon} size={24} filled={on && t.icon === 'heart'} strokeWidth={on ? 2.3 : 2} />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

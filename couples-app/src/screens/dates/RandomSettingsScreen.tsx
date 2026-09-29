import { navigate } from '../../app/router';
import { RANDOM_INGREDIENTS } from '../../content/dateOptions';
import { filterIdeas, randomPool } from '../../features/dates/service';
import { toggleIngredient } from '../../store/actions';
import { dispatch, useAppState } from '../../store/store';
import { Button } from '../../ui/controls';
import { ScreenHeader } from '../../ui/display';
import { Icon } from '../../ui/Icon';
import { haptic } from '../../ui/haptics';

/** Random personalizado: qué puede incluir "Sorpréndenos". Se guarda localmente. */
export function RandomSettingsScreen() {
  const s = useAppState();
  const ing = s.settings.randomIngredients;
  const pool = randomPool(filterIdeas(s.dateIdeas, { settings: s.settings }), ing);

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader onBack={() => navigate('/citas')} backLabel="Date night" eyebrow="Random personalizado" title={<>¿Qué puede incluir nuestro <em>Random?</em></>} />

      <div className="check-grid stagger">
        {RANDOM_INGREDIENTS.map((o) => {
          const on = ing[o.id];
          return (
            <button
              key={o.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              className="check-tile"
              onClick={() => {
                haptic();
                dispatch(toggleIngredient(o.id));
              }}
            >
              <span className="check-tile__emoji">{o.emoji}</span>
              <span className="check-tile__label">{o.label}</span>
              <span className="check-tile__box">{on && <Icon name="check" size={14} strokeWidth={3.2} />}</span>
            </button>
          );
        })}
      </div>

      <p className="small muted center">
        {pool.length} {pool.length === 1 ? 'cita posible' : 'citas posibles'} en su Random · se guarda automáticamente
      </p>

      <Button variant="primary" size="lg" block disabled={!pool.length} onClick={() => navigate('/citas/sorpresa')}>
        🎲 Sorpréndenos
      </Button>
    </div>
  );
}

import type { Route } from '../../app/router';
import { DatesHome } from './DatesHome';
import { ExploreScreen } from './ExploreScreen';
import { IdeaDetail } from './IdeaDetail';
import { OurDatesScreen } from './OurDatesScreen';
import { RandomSettingsScreen } from './RandomSettingsScreen';
import { SurpriseScreen } from './SurpriseScreen';

/** Sub-rutas de Date Night: /citas/... */
export function DatesRouter({ route }: { route: Route }) {
  const [, sub, id] = route.segments;
  switch (sub) {
    case 'explorar':
      return <ExploreScreen category={route.query.get('cat')} />;
    case 'sorpresa':
      return <SurpriseScreen />;
    case 'idea':
      return <IdeaDetail id={id} />;
    case 'nuestras':
      return <OurDatesScreen initialTab={route.query.get('tab')} />;
    case 'random':
      return <RandomSettingsScreen />;
    default:
      return <DatesHome />;
  }
}

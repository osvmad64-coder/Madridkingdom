import type { Bucket } from '../../domain/stats';
import { formatNumber } from '../../ui/display';

/** Gráfica de barras sencilla (SVG/CSS, sin librerías). */
export function BarChart({ buckets, showEvery = 1 }: { buckets: Bucket[]; showEvery?: number }) {
  const max = Math.max(1, ...buckets.map((b) => b.points));
  return (
    <div className="bar-chart" role="img" aria-label="Evolución de puntos">
      {buckets.map((b, i) => (
        <div key={i} className={`bar-chart__col ${b.isCurrent ? 'is-current' : ''}`}>
          <div className="bar-chart__track">
            <span
              className="bar-chart__bar"
              style={{ height: `${(b.points / max) * 100}%`, animationDelay: `${i * 18}ms` }}
              title={`${formatNumber(b.points)} pts`}
            />
          </div>
          <span className="bar-chart__label">{i % showEvery === 0 || b.isCurrent ? b.label : ''}</span>
        </div>
      ))}
    </div>
  );
}

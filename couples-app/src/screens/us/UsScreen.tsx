import { useMemo, useState } from 'react';
import { evaluateAchievements } from '../../domain/achievements';
import { allAssignments } from '../../domain/challenges';
import { bestPeriod, compare, computePeriodStats, type Comparison, type Period, type Range } from '../../domain/stats';
import { shortDayLabel, todayKey, monthLabel } from '../../domain/time';
import { selectAchievements, selectHeartDays, selectMetrics, selectStreaks, selectTotalPoints } from '../../store/selectors';
import { useAppState } from '../../store/store';
import { Segmented } from '../../ui/controls';
import { AnimatedNumber, formatNumber, ProgressBar, ScreenHeader, SectionHead, StatTile } from '../../ui/display';
import { BarChart } from './BarChart';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];

export function UsScreen() {
  const s = useAppState();
  const today = todayKey();
  const [period, setPeriod] = useState<Period>('week');

  const input = useMemo(
    () => ({ heartDays: selectHeartDays(s), ledger: s.ledger, assignments: allAssignments(s.challengeSchedule) }),
    [s],
  );
  const cur = computePeriodStats(period, today, input);
  const streak = selectStreaks(s, today);
  const total = selectTotalPoints(s);

  const week = compare(computePeriodStats('week', today, input).heartDays, computePeriodStats('week', today, input, -1).heartDays);
  const month = compare(computePeriodStats('month', today, input).heartDays, computePeriodStats('month', today, input, -1).heartDays);
  const bestW = bestPeriod('week', input);
  const bestM = bestPeriod('month', input);
  const achievements = evaluateAchievements(selectAchievements(), selectMetrics(s), s.achievementsUnlocked);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader eyebrow="Nosotros" title={<>Nuestro <em>progreso</em></>} />

      <div className="card us-hero anim-fade-up" data-tone="rose">
        <p className="eyebrow">⭐ Puntos totales</p>
        <p className="us-hero__value"><AnimatedNumber value={total} /></p>
        <div className="row" style={{ '--gap': '8px', flexWrap: 'wrap' } as React.CSSProperties}>
          <span className="badge badge--streak">🔥 {streak.current} racha actual</span>
          <span className="badge badge--gold">🏆 {streak.best} récord</span>
        </div>
      </div>

      <Segmented options={PERIODS} value={period} onChange={setPeriod} />

      <div className="grid-2 stagger" key={period}>
        <StatTile emoji="❤️" value={cur.heartDays} label="días registrados" />
        <StatTile emoji="⭐" value={formatNumber(cur.points)} label="puntos" />
        <StatTile emoji="🎯" value={cur.challenges} label="retos completados" />
        <StatTile emoji="🔥" value={cur.bestStreak} label="mejor racha del periodo" />
      </div>

      <section className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <p style={{ fontWeight: 700 }}>📈 Evolución de puntos</p>
          <span className="tiny muted">{rangeLabel(period, cur.range)}</span>
        </div>
        <BarChart buckets={cur.buckets} showEvery={period === 'month' ? 5 : 1} />
      </section>

      <SectionHead title="Comparado con nosotros" />
      <div className="grid-2 stagger">
        <CompareCard title="Esta semana" vs="vs semana anterior" c={week} />
        <CompareCard title="Este mes" vs="vs mes anterior" c={month} />
        <BestCard title="Mejor semana" value={bestW?.heartDays} sub={bestW ? `desde ${shortDayLabel(bestW.range.from)}` : '—'} />
        <BestCard title="Mejor mes" value={bestM?.heartDays} sub={bestM ? monthLabel(bestM.range.from.slice(0, 7)) : '—'} />
      </div>

      <SectionHead title="Logros" action={<span className="tiny muted">{unlocked}/{achievements.length}</span>} />
      <div className="achievements stagger">
        {achievements.map(({ achievement: a, progress, unlocked, value }) => (
          <div key={a.id} className={`achievement ${unlocked ? 'is-unlocked' : ''}`}>
            <span className="achievement__emoji">{unlocked ? a.emoji : '🔒'}</span>
            <p className="achievement__title">{a.title}</p>
            <p className="tiny muted">{a.description}</p>
            {!unlocked && (
              <>
                <ProgressBar value={progress} />
                <span className="tiny muted num">{formatNumber(value)} / {formatNumber(a.target)}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function rangeLabel(period: Period, r: Range) {
  if (period === 'year') return r.from.slice(0, 4);
  if (period === 'month') return monthLabel(r.from.slice(0, 7));
  return `${shortDayLabel(r.from)} – ${shortDayLabel(r.to)}`;
}

function CompareCard({ title, vs, c }: { title: string; vs: string; c: Comparison }) {
  const diff = c.current - c.previous;
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  return (
    <div className="stat compare">
      <span className="tiny muted" style={{ fontWeight: 700 }}>{title}</span>
      <span className="stat__value">{c.current} <small className="tiny muted">días ❤️</small></span>
      <span className={`compare__delta is-${tone}`}>
        {tone === 'up' ? '▲' : tone === 'down' ? '▼' : '='} {diff > 0 ? '+' : ''}{diff} {vs}
      </span>
    </div>
  );
}

function BestCard({ title, value, sub }: { title: string; value?: number; sub: string }) {
  return (
    <div className="stat compare" data-tone="butter">
      <span className="tiny muted" style={{ fontWeight: 700 }}>🏆 {title}</span>
      <span className="stat__value">{value ?? 0} <small className="tiny muted">días ❤️</small></span>
      <span className="tiny muted">{sub}</span>
    </div>
  );
}

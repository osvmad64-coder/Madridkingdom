import { useEffect, useState } from 'react';
import { pointsInRange } from '../../domain/points';
import { addMonths, daysInMonth, monthKeyOf, todayKey } from '../../domain/time';
import type { DayKey } from '../../models/types';
import { ensureCalendarMonth } from '../../store/actions';
import { selectHeartsByDay, selectStreaks } from '../../store/selectors';
import { dispatch, useAppState } from '../../store/store';
import { formatNumber, ScreenHeader, SectionHead } from '../../ui/display';
import { Calendar } from './Calendar';
import { ChallengeCard } from '../../features/challenges/ui/ChallengeCard';
import { DaySheet } from './DaySheet';

export function IntimacyScreen() {
  const s = useAppState();
  const today = todayKey();
  const [month, setMonth] = useState(monthKeyOf(today));
  const [selected, setSelected] = useState<DayKey | null>(null);

  useEffect(() => {
    dispatch(ensureCalendarMonth(month));
  }, [month]);

  const heartsByDay = selectHeartsByDay(s);
  const streak = selectStreaks(s, today);
  const schedule = s.challengeSchedule[month] ?? {};
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const monthHearts = [...heartsByDay.keys()].filter((d) => d >= from && d <= to).length;
  const monthPoints = pointsInRange(s.ledger, from, to);
  const openChallenges = Object.values(schedule)
    .filter((a) => a.status === 'pending' && a.day >= today)
    .sort((a, b) => a.day.localeCompare(b.day));
  const nextChallenge = schedule[today] ?? openChallenges[0];

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader eyebrow="Our intimacy" title={<>Nuestro <em>calendario</em></>} />

      <div className="intimacy-strip anim-fade-up">
        <div>
          <span className="intimacy-strip__value">🔥 {streak.current}</span>
          <span className="tiny muted">racha</span>
        </div>
        <div>
          <span className="intimacy-strip__value">❤️ {monthHearts}</span>
          <span className="tiny muted">este mes</span>
        </div>
        <div>
          <span className="intimacy-strip__value">⭐ {formatNumber(monthPoints)}</span>
          <span className="tiny muted">puntos mes</span>
        </div>
        <div>
          <span className="intimacy-strip__value">🏆 {streak.best}</span>
          <span className="tiny muted">récord</span>
        </div>
      </div>

      <Calendar
        month={month}
        today={today}
        heartsByDay={heartsByDay}
        challenges={schedule}
        positions={s.positionSchedule[month]?.days ?? {}}
        notes={s.dayNotes}
        onSelect={setSelected}
        onMonthChange={(d) => setMonth((m) => addMonths(m, d))}
      />

      {nextChallenge && (
        <>
          <SectionHead title={nextChallenge.day === today ? 'Reto de hoy' : 'Próximo reto'} />
          <ChallengeCard assignment={nextChallenge} today={today} />
        </>
      )}

      <DaySheet day={selected} today={today} onClose={() => setSelected(null)} />
    </div>
  );
}

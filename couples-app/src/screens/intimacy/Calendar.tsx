import { useRef } from 'react';
import type { ChallengeAssignment, DayKey, HeartEntry, MonthKey, PositionAssignment } from '../../models/types';
import { monthDays, monthLabel, WEEKDAYS_SHORT, weekdayIndex } from '../../domain/time';
import { Icon } from '../../ui/Icon';
import { haptic } from '../../ui/haptics';

/** Calendario mensual. Solo presenta: recibe datos y callbacks. */

interface Props {
  month: MonthKey;
  today: DayKey;
  heartsByDay: Map<DayKey, HeartEntry[]>;
  challenges: Record<DayKey, ChallengeAssignment>;
  positions: Record<DayKey, PositionAssignment>;
  notes: Record<DayKey, string>;
  onSelect: (day: DayKey) => void;
  onMonthChange: (delta: number) => void;
}

export function Calendar({ month, today, heartsByDay, challenges, positions, notes, onSelect, onMonthChange }: Props) {
  const days = monthDays(month);
  const lead = weekdayIndex(days[0]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  return (
    <section
      className="card calendar"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onMonthChange(dx < 0 ? 1 : -1);
      }}
    >
      <div className="row between calendar__head">
        <button type="button" className="btn btn--ghost btn--icon" aria-label="Mes anterior" onClick={() => onMonthChange(-1)}>
          <Icon name="chevronLeft" size={22} />
        </button>
        <p className="title calendar__month">{monthLabel(month)}</p>
        <button type="button" className="btn btn--ghost btn--icon" aria-label="Mes siguiente" onClick={() => onMonthChange(1)}>
          <Icon name="chevronRight" size={22} />
        </button>
      </div>
      <div className="calendar__grid calendar__weekdays">
        {WEEKDAYS_SHORT.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="calendar__grid anim-fade-up" key={month}>
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {days.map((day) => {
          const hearts = heartsByDay.get(day)?.length ?? 0;
          const ch = challenges[day];
          const pos = positions[day];
          const isToday = day === today;
          const future = day > today;
          const cls = [
            'cal-day',
            hearts && 'has-heart',
            isToday && 'is-today',
            future && 'is-future',
            ch && 'has-challenge',
            ch?.status === 'completed' && 'challenge-done',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={day}
              type="button"
              className={cls}
              aria-label={`${Number(day.slice(8))}${hearts ? ', con corazón' : ''}${ch ? ', con reto' : ''}${pos ? ', con posición especial' : ''}`}
              onClick={() => {
                haptic();
                onSelect(day);
              }}
            >
              <span className="cal-day__num">{Number(day.slice(8))}</span>
              {hearts > 0 && (
                <span className="cal-day__heart" aria-hidden="true">
                  <Icon name="heart" size={16} filled strokeWidth={1.5} />
                  {hearts > 1 && <span className="cal-day__count">{hearts}</span>}
                </span>
              )}
              <span className="cal-day__marks" aria-hidden="true">
                {ch && <i className="mark-challenge" />}
                {pos && <i className={`mark-position ${pos.status === 'completed' ? 'is-done' : ''}`} />}
                {notes[day] && <i className="mark-note" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar__legend tiny muted">
        <span><i className="legend-heart" /> registrado</span>
        <span><i className="mark-challenge" /> reto</span>
        <span><i className="mark-position" /> posición</span>
        <span><i className="mark-note" /> nota</span>
      </div>
    </section>
  );
}

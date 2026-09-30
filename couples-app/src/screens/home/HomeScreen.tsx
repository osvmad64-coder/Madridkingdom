import { useEffect } from 'react';
import { DAILY_MESSAGES } from '../../content/messages';
import { findIdea, plannedLogs } from '../../features/dates/service';
import { positionAssignment } from '../../features/positions/service';
import { pointsInRange } from '../../domain/points';
import { hashString } from '../../domain/random';
import { nextMilestone, previousMilestoneDays } from '../../domain/streaks';
import { dayLabel, monthKeyOf, shortDayLabel, startOfWeek, todayKey } from '../../domain/time';
import { navigate } from '../../app/router';
import { ensureCalendarMonth, registerHeart } from '../../store/actions';
import {
  selectDateLibrary,
  selectHeartsByDay,
  selectRecentActivity,
  selectStreaks,
  selectTotalPoints,
} from '../../store/selectors';
import { dispatch, useAppState } from '../../store/store';
import { Button } from '../../ui/controls';
import { AnimatedNumber, AvatarPair, EmptyState, ProgressBar, SectionHead, formatNumber } from '../../ui/display';
import { ChallengeCard } from '../../features/challenges/ui/ChallengeCard';
import { greeting, streakLine } from './copy';

export function HomeScreen() {
  const s = useAppState();
  const today = todayKey();
  useEffect(() => {
    dispatch(ensureCalendarMonth(monthKeyOf(today)));
  }, [today]);

  const streak = selectStreaks(s, today);
  const total = selectTotalPoints(s);
  const weekPts = pointsInRange(s.ledger, startOfWeek(today), today);
  const todayHearts = selectHeartsByDay(s).get(today)?.length ?? 0;
  const next = nextMilestone(streak.current);
  const prevMilestone = previousMilestoneDays(streak.current);
  const assignment = s.challengeSchedule[monthKeyOf(today)]?.[today];
  const todayPosition = positionAssignment(s, today);
  const message = s.profile.message?.trim() || DAILY_MESSAGES[hashString(today) % DAILY_MESSAGES.length];
  const upcoming = plannedLogs(s.dates.logs)[0];
  const upcomingIdea = upcoming && findIdea(selectDateLibrary(s), upcoming.ideaId);
  const activity = selectRecentActivity(s);
  const [p1, p2] = s.profile.partners;

  return (
    <div className="stack home" style={{ '--gap': '18px' } as React.CSSProperties}>
      <header className="row between anim-fade-up">
        <AvatarPair partners={s.profile.partners} />
        <button type="button" className="badge badge--streak home__streak-pill" onClick={() => navigate('/intimidad')}>
          <span className={streak.current ? 'anim-flicker' : ''}>🔥</span> {streak.current}
        </button>
      </header>

      <section className="anim-fade-up">
        <p className="eyebrow">{dayLabel(today)}</p>
        <h1 className="display home__title">
          {greeting()}, <em>{p1.name}</em> &amp; <em>{p2.name}</em>
        </h1>
        <p className="muted home__subtitle">¿Qué hacemos hoy?</p>
      </section>

      {/* Hoy */}
      <section className="card home-today anim-fade-up">
        <div className="row" style={{ '--gap': '14px' } as React.CSSProperties}>
          <div className={`home-today__heart ${todayHearts ? 'is-on anim-beat' : ''}`} key={todayHearts}>
            {todayHearts ? '❤️' : '🤍'}
          </div>
          <div className="grow">
            <p className="title">{todayHearts ? 'Hoy ya hay ❤️' : 'Hoy aún no hay ❤️'}</p>
            <p className="small muted">{streakLine(streak.current, streak.activeToday)}</p>
          </div>
        </div>
        {!todayHearts && (
          <Button variant="primary" size="lg" block onClick={() => dispatch(registerHeart(today))} aria-label="Registrar hoy">
            ❤️ Registrar hoy
          </Button>
        )}
      </section>

      {/* Racha y puntos */}
      <div className="grid-2 stagger">
        <button type="button" className="card card--tap card--sm home-metric" data-tone="peach" onClick={() => navigate('/intimidad')}>
          <span className="home-metric__icon">🔥</span>
          <span className="home-metric__value">
            {streak.current} <small>{streak.current === 1 ? 'día' : 'días'}</small>
          </span>
          <span className="tiny muted">{next ? `${next.days - streak.current} ${next.days - streak.current === 1 ? 'día' : 'días'} para la meta de ${next.days} 🔥` : '¡Leyendas!'}</span>
          {next && <ProgressBar variant="streak" value={(streak.current - prevMilestone) / (next.days - prevMilestone)} />}
        </button>
        <button type="button" className="card card--tap card--sm home-metric" data-tone="butter" onClick={() => navigate('/nosotros')}>
          <span className="home-metric__icon">⭐</span>
          <span className="home-metric__value">
            <AnimatedNumber value={total} />
          </span>
          <span className="tiny muted">+{formatNumber(weekPts)} esta semana</span>
          <ProgressBar variant="gold" value={(total % 1000) / 1000} />
        </button>
      </div>

      {assignment && <ChallengeCard assignment={assignment} today={today} compact />}
      {todayPosition && (
        <button type="button" className="card card--tap card--sm row home-position" onClick={() => navigate('/intimidad')}>
          <span className="list-row__icon" data-tone="coral">💋</span>
          <div className="grow">
            <p className="eyebrow">Bonus de hoy</p>
            <p style={{ fontWeight: 700 }}>{todayPosition.status === 'completed' ? 'Posición especial completada ✓' : 'Hoy hay posición especial'}</p>
          </div>
          <span className="badge badge--gold">+{formatNumber(todayPosition.snapshot.points)}</span>
        </button>
      )}

      {/* Sorpréndenos */}
      <button type="button" className="home-surprise card--tap" onClick={() => navigate('/citas/sorpresa')}>
        <div className="grow">
          <p className="eyebrow home-surprise__eyebrow">Date night</p>
          <p className="home-surprise__title">Sorpréndenos</p>
          <p className="small">¿No saben qué hacer? Yo tengo una idea.</p>
        </div>
        <span className="home-surprise__dice">🎲</span>
      </button>

      {/* Mensaje */}
      <section className="card card--tint home-message anim-fade-up">
        <span className="eyebrow">💌 Para nosotros</span>
        <p className="home-message__text">“{message}”</p>
      </section>

      {upcoming && upcomingIdea && (
        <button type="button" className="card card--tap card--sm row" onClick={() => navigate(`/citas/idea/${upcomingIdea.id}`)}>
          <span className="list-row__icon" data-tone="lilac">{upcomingIdea.emoji}</span>
          <div className="grow">
            <p className="eyebrow">Próxima cita</p>
            <p style={{ fontWeight: 700 }}>{upcomingIdea.title}</p>
          </div>
          <span className="badge">{upcoming.plannedFor ? shortDayLabel(upcoming.plannedFor) : 'Pendiente'}</span>
        </button>
      )}

      <SectionHead title="Actividad reciente" />
      {activity.length ? (
        <div className="list stagger">
          {activity.map((e) => (
            <div key={e.id} className="list-row">
              <span className="list-row__icon">{ACTIVITY_ICON[e.source]}</span>
              <div className="grow">
                <p className="small" style={{ fontWeight: 600 }}>{e.label}</p>
                <p className="tiny muted">{shortDayLabel(e.day)}</p>
              </div>
              <span className="badge badge--gold num">+{formatNumber(e.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState emoji="🌷" title="Su historia empieza hoy">
          Registren su primer ❤️ o prueben una cita sorpresa.
        </EmptyState>
      )}
    </div>
  );
}

const ACTIVITY_ICON = {
  heart: '❤️',
  streak: '🔥',
  challenge: '🎯',
  position: '💋',
  mission: '🏆',
  date: '💕',
  achievement: '🏆',
  bonus: '✨',
} as const;

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSchedule,
  upsertScheduled,
  getCurrentApprovedWeight,
  reseedRehabDemo,
} from '@/services/rehab/rehabStore';
import { getSessions } from '@/services/historyStore';
import { EXERCISES, getExerciseById } from '@/data/exercises';
import { saveSessionConfig, saveScheduledLink } from '@/services/sessionConfigStore';
import { weekStartOf } from '@/services/rehab/weeklyAnalysis';
import type { ScheduledSession } from '@/types/rehab';
import { clampWeight, WEIGHT_MIN_KG, WEIGHT_MAX_KG, WEIGHT_INCREMENT_KG } from '@/types/rehab';
import { formatShortDate } from '@/utils/format';
import './CalendarPage.css';

type View = 'week' | 'month';

/** My Rehabilitation Schedule — interactive calendar with weekly overview. */
export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('week');
  const [tick, setTick] = useState(0);
  const [weekAnchor, setWeekAnchor] = useState(() => weekStartOf(new Date()));
  const [showAdd, setShowAdd] = useState(false);

  const schedule = useMemo(() => getSchedule(), [tick]);
  const sessions = useMemo(() => getSessions(), [tick]);
  const currentWeight = useMemo(() => getCurrentApprovedWeight(), [tick]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAnchor);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const weekSessions = schedule.filter((s) =>
    sameWeek(new Date(s.dateTime), weekAnchor)
  );
  const scheduledCount = weekSessions.filter((s) => s.status !== 'rest').length;
  const completedCount = weekSessions.filter((s) => s.status === 'completed').length;
  const adherence =
    scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  // Weekly overview metrics from actual stored sessions this week.
  const weekStored = sessions.filter((s) =>
    sameWeek(new Date(s.completedAt), weekAnchor)
  );
  const totalReps = weekStored.reduce((a, s) => a + s.repsCompleted, 0);
  const totalDurationMs = weekStored.reduce((a, s) => a + s.durationMs, 0);
  const avgFlexion = weekStored.length
    ? Math.round(weekStored.reduce((a, s) => a + s.maxFlexion, 0) / weekStored.length)
    : 0;
  const nextSession = [...schedule]
    .filter((s) => s.status === 'upcoming' && new Date(s.dateTime) >= new Date())
    .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))[0];

  const launch = (s: ScheduledSession) => {
    saveSessionConfig(s.exerciseId, {
      targetReps: s.reps,
      targetAngle: s.targetAngle,
    });
    saveScheduledLink(s.exerciseId, s.id);
    navigate(`/exercise/${s.exerciseId}`);
  };

  return (
    <div className="page">
      <div className="row row--between row--wrap">
        <h1 style={{ margin: 0 }}>My Rehabilitation Schedule</h1>
        <div className="row row--wrap">
          <button className="btn btn--ghost" onClick={() => { reseedRehabDemo(); setTick((t) => t + 1); }}>
            Reset demo data
          </button>
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            + Add session
          </button>
        </div>
      </div>

      {/* Weekly overview */}
      <div className="week-overview card">
        <h2 style={{ marginTop: 0 }}>Weekly Rehabilitation Overview</h2>
        <div className="week-overview__grid">
          <Ov big={`${completedCount}/${scheduledCount}`} label="Sessions completed" />
          <Ov big={`${adherence}%`} label="Weekly adherence" />
          <Ov big={`${totalReps}`} label="Total repetitions" />
          <Ov big={`${avgFlexion}°`} label="Avg max knee flexion" />
          <Ov big={`${Math.round(totalDurationMs / 60000)} min`} label="Exercise time" />
          <Ov
            big={`${currentWeight.kg.toFixed(1)} kg`}
            label={`Brace setting${currentWeight.status === 'pending' ? ' (pending)' : ''}`}
          />
        </div>
        {nextSession && (
          <p className="week-overview__next">
            Next session: <strong>{nextSession.exerciseName}</strong> ·{' '}
            {new Date(nextSession.dateTime).toLocaleString(undefined, {
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {nextSession.plannedWeightKg.toFixed(1)} kg
          </p>
        )}
      </div>

      {/* View controls */}
      <div className="row row--between row--wrap" style={{ marginTop: 24 }}>
        <div className="cal-tabs" role="tablist">
          <button role="tab" aria-selected={view === 'week'} className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}>
            Week
          </button>
          <button role="tab" aria-selected={view === 'month'} className={view === 'month' ? 'is-active' : ''} onClick={() => setView('month')}>
            Month
          </button>
        </div>
        <div className="row">
          <button className="btn btn--ghost" onClick={() => shiftWeek(-1)}>
            ← Prev
          </button>
          <span className="cal-range">
            {formatShortDate(weekAnchor.toISOString())} –{' '}
            {formatShortDate(weekDays[6].toISOString())}
          </span>
          <button className="btn btn--ghost" onClick={() => shiftWeek(1)}>
            Next →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span><i className="dot dot--completed" />Completed</span>
        <span><i className="dot dot--upcoming" />Upcoming</span>
        <span><i className="dot dot--missed" />Missed</span>
        <span><i className="dot dot--rest" />Rest day</span>
      </div>

      {view === 'week' ? (
        <WeekGrid days={weekDays} schedule={schedule} onLaunch={launch} />
      ) : (
        <MonthGrid anchor={weekAnchor} schedule={schedule} onLaunch={launch} />
      )}

      {showAdd && (
        <AddSessionDialog
          defaultWeight={currentWeight.kg}
          onClose={() => setShowAdd(false)}
          onAdd={(s) => {
            upsertScheduled(s);
            setShowAdd(false);
            setTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );

  function shiftWeek(delta: number) {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + delta * 7);
    setWeekAnchor(d);
  }
}

function Ov({ big, label }: { big: string; label: string }) {
  return (
    <div className="ov">
      <span className="ov__big">{big}</span>
      <span className="ov__label">{label}</span>
    </div>
  );
}

function WeekGrid({
  days,
  schedule,
  onLaunch,
}: {
  days: Date[];
  schedule: ScheduledSession[];
  onLaunch: (s: ScheduledSession) => void;
}) {
  return (
    <div className="week-grid">
      {days.map((day) => {
        const items = schedule
          .filter((s) => sameDay(new Date(s.dateTime), day))
          .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime));
        const isToday = sameDay(day, new Date());
        return (
          <div key={day.toISOString()} className={`day-col${isToday ? ' is-today' : ''}`}>
            <div className="day-col__head">
              <span>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <strong>{day.getDate()}</strong>
            </div>
            <div className="day-col__body">
              {items.length === 0 && <span className="day-col__empty">—</span>}
              {items.map((s) => (
                <EventCard key={s.id} s={s} onLaunch={onLaunch} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  anchor,
  schedule,
  onLaunch,
}: {
  anchor: Date;
  schedule: ScheduledSession[];
  onLaunch: (s: ScheduledSession) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));

  return (
    <div className="month-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
        <div key={d} className="month-grid__dow">{d}</div>
      ))}
      {cells.map((day, i) => (
        <div key={i} className={`month-cell${day && sameDay(day, new Date()) ? ' is-today' : ''}`}>
          {day && (
            <>
              <span className="month-cell__date">{day.getDate()}</span>
              {schedule
                .filter((s) => sameDay(new Date(s.dateTime), day))
                .map((s) => (
                  <button
                    key={s.id}
                    className={`month-chip chip--${s.status}`}
                    onClick={() => s.status !== 'rest' && onLaunch(s)}
                    title={`${s.exerciseName} · ${s.plannedWeightKg}kg`}
                  >
                    {s.exerciseName}
                  </button>
                ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function EventCard({
  s,
  onLaunch,
}: {
  s: ScheduledSession;
  onLaunch: (s: ScheduledSession) => void;
}) {
  if (s.status === 'rest') {
    return <div className="event event--rest">Rest day</div>;
  }
  return (
    <button
      className={`event event--${s.status}`}
      onClick={() => onLaunch(s)}
      disabled={s.status === 'completed'}
    >
      <span className="event__time">
        {new Date(s.dateTime).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
      <span className="event__name">{s.exerciseName}</span>
      <span className="event__detail">
        {s.reps} × {s.sets} · {s.plannedWeightKg.toFixed(1)} kg
      </span>
      {s.status === 'completed' && <span className="event__badge">✓ done</span>}
      {s.status === 'missed' && <span className="event__badge event__badge--miss">missed</span>}
    </button>
  );
}

function AddSessionDialog({
  defaultWeight,
  onAdd,
  onClose,
}: {
  defaultWeight: number;
  onAdd: (s: ScheduledSession) => void;
  onClose: () => void;
}) {
  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [sets, setSets] = useState(2);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(defaultWeight);

  const ex = getExerciseById(exerciseId)!;

  const submit = () => {
    const dateTime = new Date(`${date}T${time}`).toISOString();
    onAdd({
      id: `sess-${Date.now()}`,
      dateTime,
      exerciseId,
      exerciseName: ex.name,
      sets,
      reps,
      targetAngle: ex.repConfig.targetAngle,
      plannedWeightKg: clampWeight(weight),
      status: 'upcoming',
      provenance: 'clinician-approved',
    });
  };

  return (
    <div className="quiz-overlay" role="dialog" aria-modal="true">
      <div className="quiz card">
        <h2>Add rehabilitation session</h2>
        <label className="field">
          <span>Exercise</span>
          <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {EXERCISES.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </label>
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Sets</span>
            <input type="number" min={1} max={6} value={sets} onChange={(e) => setSets(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Reps</span>
            <input type="number" min={1} max={30} value={reps} onChange={(e) => setReps(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Planned weight (kg)</span>
            <input
              type="number"
              min={WEIGHT_MIN_KG}
              max={WEIGHT_MAX_KG}
              step={WEIGHT_INCREMENT_KG}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </label>
        </div>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          Planned weight is limited to {WEIGHT_MIN_KG}–{WEIGHT_MAX_KG} kg (device range).
          This schedules a plan; it does not change the physical brace.
        </p>
        <div className="quiz__actions">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={submit}>Add to calendar</button>
        </div>
      </div>
    </div>
  );
}

// ---- date helpers ----
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function sameWeek(d: Date, weekStart: Date): boolean {
  const t = d.getTime();
  return t >= weekStart.getTime() && t < weekStart.getTime() + 7 * 864e5;
}

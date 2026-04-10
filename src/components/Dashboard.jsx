import { useState } from 'react'
import { supabase } from '../lib/supabase'
import TaskCard from './TaskCard'

/* ── Banner para solicitar permiso de notificaciones ──── */
function NotificationBanner() {
  const [perm, setPerm] = useState(() =>
    'Notification' in window ? Notification.permission : 'denied'
  )

  if (perm !== 'default') return null

  async function handleActivar() {
    const result = await Notification.requestPermission()
    setPerm(result)
  }

  return (
    <div className="notif-banner">
      <span className="notif-banner-text">
        🔔 Activa las notificaciones para saber cuándo se completan las tareas
      </span>
      <button className="notif-banner-btn" onClick={handleActivar}>
        Activar
      </button>
    </div>
  )
}

/* ── VotePanel (fuera del componente para evitar recreación en cada render) */
function VotePanel({ taskType, dueDate, targetPerson, people, currentPerson, absenceVotes, onCastVote }) {
  if (!targetPerson || people.length < 2) return null

  function absentCount() {
    return absenceVotes.filter(v =>
      v.task_type === taskType &&
      v.due_date === dueDate &&
      v.target_person_id === targetPerson.id &&
      v.is_absent
    ).length
  }

  function isVotedAbsent() {
    return absentCount() > people.length / 2
  }

  function myVote() {
    if (!currentPerson) return null
    return absenceVotes.find(v =>
      v.task_type === taskType &&
      v.due_date === dueDate &&
      v.target_person_id === targetPerson.id &&
      v.voter_person_id === currentPerson.id
    ) ?? null
  }

  const absent  = absentCount()
  const needed  = Math.floor(people.length / 2) + 1
  const vote    = myVote()
  const isMe    = currentPerson?.id === targetPerson.id
  const skipped = isVotedAbsent()

  return (
    <div className={`vote-panel ${skipped ? 'skipped' : ''}`}>
      <div className="vote-question">
        {isMe ? '¿Confirman que estás disponible?' : `¿Está ${targetPerson.name}?`}
      </div>
      {!isMe && (
        <div className="vote-buttons">
          <button
            className={`vote-btn yes ${vote && !vote.is_absent ? 'active' : ''}`}
            onClick={() => onCastVote(taskType, dueDate, targetPerson.id, false)}
            aria-pressed={!!(vote && !vote.is_absent)}
          >✓ Sí</button>
          <button
            className={`vote-btn no ${vote?.is_absent ? 'active' : ''}`}
            onClick={() => onCastVote(taskType, dueDate, targetPerson.id, true)}
            aria-pressed={!!vote?.is_absent}
          >✗ No</button>
        </div>
      )}
      <div className="vote-tally">
        {absent} de {people.length} votan ausente · faltan {Math.max(0, needed - absent)} para saltar
        {skipped && <span className="vote-skip-label"> · ⏭️ saltado</span>}
      </div>
    </div>
  )
}

/* ── Date helpers ─────────────────────────────────────── */
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function weekMondayStr(ref = new Date()) {
  const d = new Date(ref)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function currentWeekNumber(mondayStr) {
  const epoch = new Date('2025-01-06')
  const d = new Date(mondayStr)
  return Math.floor((d - epoch) / (7 * 24 * 60 * 60 * 1000))
}

function dishwasherStreak(completions) {
  if (!completions.length) return 0
  const doneSet = new Set(completions.map(c => c.due_date))
  let streak = 0
  const d = new Date()
  while (true) {
    const s = d.toISOString().split('T')[0]
    if (!doneSet.has(s)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}


function weekLabel(mondayStr) {
  const monday = new Date(mondayStr)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

/* ── Component ────────────────────────────────────────── */
export default function Dashboard({ people, rooms, completions, absenceVotes, currentPerson, onRefresh }) {
  const [loading, setLoading] = useState(null)

  const today    = todayStr()
  const thisWeek = weekMondayStr()
  const weekNum  = currentWeekNumber(thisWeek)

  const dishComp = completions.filter(c => c.task_type === 'dishwasher')
  const roomComp = completions.filter(c => c.task_type === 'room')
  const dishDone = dishComp.some(c => c.due_date === today)

  /* ── Vote helpers ──────────────────────────────────── */
  function absentCount(taskType, dueDate, personId) {
    return absenceVotes.filter(v =>
      v.task_type === taskType &&
      v.due_date === dueDate &&
      v.target_person_id === personId &&
      v.is_absent
    ).length
  }

  function isVotedAbsent(taskType, dueDate, personId) {
    return absentCount(taskType, dueDate, personId) > people.length / 2
  }

  function myVote(taskType, dueDate, personId) {
    if (!currentPerson) return null
    return absenceVotes.find(v =>
      v.task_type === taskType &&
      v.due_date === dueDate &&
      v.target_person_id === personId &&
      v.voter_person_id === currentPerson.id
    ) ?? null
  }

  async function castVote(taskType, dueDate, targetPersonId, isAbsent) {
    if (!currentPerson) return
    const existing = myVote(taskType, dueDate, targetPersonId)
    // Si pulsa el mismo botón que ya tenía → desmarcar
    if (existing && existing.is_absent === isAbsent) {
      await supabase.from('absence_votes').delete().eq('id', existing.id)
    } else {
      await supabase.from('absence_votes').upsert({
        task_type:        taskType,
        due_date:         dueDate,
        target_person_id: targetPersonId,
        voter_person_id:  currentPerson.id,
        is_absent:        isAbsent,
      }, { onConflict: 'task_type,due_date,target_person_id,voter_person_id' })
    }
    onRefresh()
  }

  /* ── Rotation with skip logic ──────────────────────── */
  function personAtIndex(idx) {
    if (!people.length) return null
    return people[((idx % people.length) + people.length) % people.length]
  }

  function getEffectivePerson(startIdx, taskType, dueDate) {
    for (let skip = 0; skip < people.length; skip++) {
      const person = personAtIndex(startIdx + skip)
      if (!isVotedAbsent(taskType, dueDate, person.id)) return person
    }
    return personAtIndex(startIdx) // fallback: nadie disponible
  }

  // Devuelve [persona_saltada_1, ..., persona_efectiva]
  function getPeopleChain(startIdx, taskType, dueDate) {
    const chain = []
    for (let skip = 0; skip < people.length; skip++) {
      const person = personAtIndex(startIdx + skip)
      chain.push(person)
      if (!isVotedAbsent(taskType, dueDate, person.id)) break
    }
    return chain
  }

  const dishBaseIdx = (() => {
    const epoch = new Date('2025-01-06')
    const d = new Date(today)
    return Math.round((d - epoch) / (24 * 60 * 60 * 1000))
  })()

  // Opción B: ajustar el índice base acumulando los saltos de días anteriores.
  // Si el día N la persona X fue saltada y cubrió Y, el día N+1 empieza desde Y+1
  // (no desde X+1), evitando que Y tenga que hacerlo dos días seguidos.
  // Usamos los 14 días de datos que ya tenemos; antes de eso se asumen 0 saltos.
  const adjustedDishBaseIdx = (() => {
    if (!people.length) return dishBaseIdx
    const LOOKBACK = 14
    let idx = dishBaseIdx - LOOKBACK
    for (let daysAgo = LOOKBACK; daysAgo > 0; daysAgo--) {
      const d = new Date()
      d.setDate(d.getDate() - daysAgo)
      const dateStr = d.toISOString().split('T')[0]
      // Cuántas personas se saltaron ese día (mismo criterio que getEffectivePerson)
      let skips = 0
      for (let s = 0; s < people.length; s++) {
        if (!isVotedAbsent('dishwasher', dateStr, personAtIndex(idx + s).id)) { skips = s; break }
        if (s === people.length - 1) skips = 0 // todos ausentes → fallback, sin salto extra
      }
      idx += 1 + skips
    }
    return idx
  })()

  const originalDishPerson = personAtIndex(adjustedDishBaseIdx)
  const dishPerson         = getEffectivePerson(adjustedDishBaseIdx, 'dishwasher', today)
  const dishSkipped        = originalDishPerson?.id !== dishPerson?.id

  function roomPerson(i)      { return personAtIndex(weekNum + i) }
  function isRoomDone(roomId) { return roomComp.some(c => c.room_id === roomId && c.due_date >= thisWeek) }

  /* ── Actions ───────────────────────────────────────── */
  async function markDone(taskType, person, dueDate) {
    if (!person) return
    setLoading(taskType)
    const { error } = await supabase.from('completions').insert({
      task_type: taskType,
      person_id: person.id,
      due_date:  dueDate,
    })
    if (error) console.error(error)
    setLoading(null)
    onRefresh()
  }

  async function markRoomDone(room, person) {
    if (!person) return
    const key = `room_${room.id}`
    setLoading(key)
    const { error } = await supabase.from('completions').insert({
      task_type: 'room',
      room_id:   room.id,
      person_id: person.id,
      due_date:  thisWeek,
    })
    if (error) console.error(error)
    setLoading(null)
    onRefresh()
  }

  const roomsPending = rooms.some(r => !isRoomDone(r.id)) && people.length > 0
  const hasPending   = (!dishDone || roomsPending) && people.length > 0

  return (
    <div className="dashboard">
      <NotificationBanner />

      {hasPending && (
        <div className="pending-banner">⚡ Tienes tareas pendientes</div>
      )}

      {/* ── Lavavajillas ── */}
      <div className="task-with-vote">
        {dishSkipped && (
          <div className="skip-notice">
            ⏭️ {originalDishPerson?.name} saltado → ahora le toca a {dishPerson?.name}
          </div>
        )}
        <TaskCard
          title="Recoger el lavavajillas"
          emoji="🍽️"
          frequency="Tarea diaria"
          person={dishPerson}
          isDone={dishDone}
          streak={dishwasherStreak(dishComp)}
          streakLabel="días seguidos"
          loading={loading === 'dishwasher'}
          noPeople={!people.length}
          isMyTurn={currentPerson?.id === dishPerson?.id}
          onMarkDone={() => markDone('dishwasher', dishPerson, today)}
        />
        {!dishDone && getPeopleChain(adjustedDishBaseIdx, 'dishwasher', today).map(p => (
          <VotePanel
            key={p.id}
            taskType="dishwasher"
            dueDate={today}
            targetPerson={p}
            people={people}
            currentPerson={currentPerson}
            absenceVotes={absenceVotes}
            onCastVote={castVote}
          />
        ))}
      </div>

      {/* ── Habitaciones ── */}
      {rooms.length > 0 && (
        <div className="rooms-week-section">
          <div className="rooms-week-header">
            <span className="rooms-week-title">Habitaciones</span>
            <span className="rooms-week-range">{weekLabel(thisWeek)}</span>
          </div>

          {!people.length ? (
            <p className="no-people-hint">→ Añade personas en la pestaña "Personas"</p>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room, i) => {
                const person   = roomPerson(i)
                const done     = isRoomDone(room.id)
                const key      = `room_${room.id}`
                const isMyRoom = currentPerson?.id === person?.id
                const initials = person?.name
                  ? person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  : '?'

                return (
                  <div className={`room-card ${done ? 'done' : ''}`} key={room.id}>
                    <div className="room-card-top">
                      <span className="room-card-emoji">{room.emoji}</span>
                      <span className="room-card-name">{room.name}</span>
                    </div>

                    <div className="room-turn-row">
                      <div className="room-turn-info">
                        <span className="turn-label">{isMyRoom ? '¡Te toca a ti!' : 'Le toca a'}</span>
                        <span className="turn-name">{isMyRoom ? 'Tú' : (person?.name ?? '—')}</span>
                      </div>
                      <div className="avatar-sm">{initials}</div>
                    </div>

                    {done ? (
                      <div className="room-done-state">✅ Hecho</div>
                    ) : isMyRoom ? (
                      <button
                        className="room-mark-btn"
                        onClick={() => markRoomDone(room, person)}
                        disabled={loading === key}
                      >
                        {loading === key ? '…' : 'Marcar ✓'}
                      </button>
                    ) : (
                      <div className="room-locked">🔒 No es tu turno</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

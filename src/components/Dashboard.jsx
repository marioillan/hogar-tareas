import { useState } from 'react'
import { supabase } from '../lib/supabase'
import TaskCard from './TaskCard'

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

async function fireNotification(title, body) {
  if (!('Notification' in window)) { alert('Tu navegador no soporta notificaciones.'); return }
  const perm = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission
  if (perm === 'granted') new Notification(title, { body, icon: '/favicon.ico' })
  else alert('Activa los permisos de notificación en tu navegador.')
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
    await supabase.from('absence_votes').upsert({
      task_type:        taskType,
      due_date:         dueDate,
      target_person_id: targetPersonId,
      voter_person_id:  currentPerson.id,
      is_absent:        isAbsent,
    }, { onConflict: 'task_type,due_date,target_person_id,voter_person_id' })
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

  const dishBaseIdx      = (() => {
    const epoch = new Date('2025-01-06')
    const d = new Date(today)
    return Math.round((d - epoch) / (24 * 60 * 60 * 1000))
  })()
  const originalDishPerson = personAtIndex(dishBaseIdx)
  const dishPerson         = getEffectivePerson(dishBaseIdx, 'dishwasher', today)
  const dishSkipped        = originalDishPerson?.id !== dishPerson?.id

  function originalRoomPerson(i) { return personAtIndex(weekNum + i) }
  function roomPerson(i)         { return getEffectivePerson(weekNum + i, 'room', thisWeek) }
  function isRoomDone(roomId)    { return roomComp.some(c => c.room_id === roomId && c.due_date >= thisWeek) }

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

  /* ── Vote panel ────────────────────────────────────── */
  function VotePanel({ taskType, dueDate, targetPerson }) {
    if (!targetPerson || people.length < 2) return null
    const absent  = absentCount(taskType, dueDate, targetPerson.id)
    const needed  = Math.floor(people.length / 2) + 1
    const vote    = myVote(taskType, dueDate, targetPerson.id)
    const isMe    = currentPerson?.id === targetPerson.id
    const skipped = isVotedAbsent(taskType, dueDate, targetPerson.id)

    return (
      <div className={`vote-panel ${skipped ? 'skipped' : ''}`}>
        <div className="vote-question">
          {isMe ? '¿Confirman que estás disponible?' : `¿Está ${targetPerson.name}?`}
        </div>
        {!isMe && (
          <div className="vote-buttons">
            <button
              className={`vote-btn yes ${vote && !vote.is_absent ? 'active' : ''}`}
              onClick={() => castVote(taskType, dueDate, targetPerson.id, false)}
            >✓ Sí</button>
            <button
              className={`vote-btn no ${vote?.is_absent ? 'active' : ''}`}
              onClick={() => castVote(taskType, dueDate, targetPerson.id, true)}
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

  return (
    <div className="dashboard">
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
          onNotify={() => fireNotification('🍽️ Recoger el lavavajillas', `Hoy le toca a ${dishPerson?.name ?? '…'}`)}
        />
        {!dishDone && (
          <VotePanel taskType="dishwasher" dueDate={today} targetPerson={originalDishPerson} />
        )}
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
                const origPerson = originalRoomPerson(i)
                const person     = roomPerson(i)
                const done       = isRoomDone(room.id)
                const key        = `room_${room.id}`
                const isMyRoom   = currentPerson?.id === person?.id
                const skipped    = origPerson?.id !== person?.id
                const initials   = person?.name
                  ? person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  : '?'
                const absent     = absentCount('room', thisWeek, origPerson?.id)
                const needed     = Math.floor(people.length / 2) + 1
                const vote       = myVote('room', thisWeek, origPerson?.id)
                const isOrigMe   = currentPerson?.id === origPerson?.id

                return (
                  <div className={`room-card ${done ? 'done' : ''}`} key={room.id}>
                    <div className="room-card-top">
                      <span className="room-card-emoji">{room.emoji}</span>
                      <span className="room-card-name">{room.name}</span>
                    </div>

                    {skipped && (
                      <div className="room-skip-notice">⏭️ {origPerson?.name} → {person?.name}</div>
                    )}

                    <div className="room-turn-row">
                      <div className="room-turn-info">
                        <span className="turn-label">{isMyRoom ? '¡Te toca a ti!' : 'Le toca a'}</span>
                        <span className="turn-name">{isMyRoom ? 'Tú' : (person?.name ?? '—')}</span>
                      </div>
                      <div className="avatar avatar-sm">{initials}</div>
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
                      <div className="room-locked">🔒 {person?.name}</div>
                    )}

                    {!done && people.length > 1 && origPerson && (
                      <div className="room-vote">
                        {!isOrigMe && (
                          <div className="room-vote-btns">
                            <button
                              className={`vote-btn-sm yes ${vote && !vote.is_absent ? 'active' : ''}`}
                              onClick={() => castVote('room', thisWeek, origPerson.id, false)}
                            >✓</button>
                            <button
                              className={`vote-btn-sm no ${vote?.is_absent ? 'active' : ''}`}
                              onClick={() => castVote('room', thisWeek, origPerson.id, true)}
                            >✗</button>
                            <span className="room-vote-label">¿Está {origPerson.name}?</span>
                          </div>
                        )}
                        {absent > 0 && (
                          <div className="room-vote-tally">
                            {absent}/{people.length} ausente · faltan {Math.max(0, needed - absent)}
                          </div>
                        )}
                      </div>
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

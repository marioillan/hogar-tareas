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

/* ── VotePanel */
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

/* ── Date helpers */
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatCompletedAt(isoStr) {
  return new Date(isoStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/* ── Component */
export default function Dashboard({ people, rooms, completions, absenceVotes, currentPerson, onRefresh }) {
  const [loading, setLoading] = useState(null)

  const today    = todayStr()
  const dishComp = completions
    .filter(c => c.task_type === 'dishwasher')
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
  const roomComp = completions.filter(c => c.task_type === 'room')

  /* ── Vote helpers */
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

  /* ── Rotation helpers (completion-based, not time-based) */
  function personAtIndex(idx) {
    if (!people.length) return null
    return people[((idx % people.length) + people.length) % people.length]
  }

  // Returns the starting index for the person AFTER the last completer
  function nextIdx(lastPersonId, fallback = 0) {
    if (!people.length) return fallback
    if (!lastPersonId) return fallback
    const lastIdx = people.findIndex(p => p.id === lastPersonId)
    return lastIdx === -1 ? fallback : (lastIdx + 1) % people.length
  }

  function getEffectivePerson(startIdx, taskType, dueDate) {
    for (let skip = 0; skip < people.length; skip++) {
      const person = personAtIndex(startIdx + skip)
      if (!isVotedAbsent(taskType, dueDate, person.id)) return person
    }
    return personAtIndex(startIdx)
  }

  function getPeopleChain(startIdx, taskType, dueDate) {
    const chain = []
    for (let skip = 0; skip < people.length; skip++) {
      const person = personAtIndex(startIdx + skip)
      chain.push(person)
      if (!isVotedAbsent(taskType, dueDate, person.id)) break
    }
    return chain
  }

  /* ── Dishwasher: turno basado en la última finalización */
  const lastDishComp       = dishComp[0] ?? null
  const dishStartIdx       = nextIdx(lastDishComp?.person_id, 0)
  const originalDishPerson = personAtIndex(dishStartIdx)
  const dishPerson         = getEffectivePerson(dishStartIdx, 'dishwasher', today)
  const dishSkipped        = originalDishPerson?.id !== dishPerson?.id

  /* ── Rooms: rotación por rondas — la rotación avanza sólo cuando
        TODAS las habitaciones han sido completadas en la ronda actual   */
  const roomRoundData = (() => {
    if (!rooms.length) return { round: 0, doneRoomIds: new Set() }

    const roomIds = rooms.map(r => r.id)
    const sorted  = [...roomComp].sort(
      (a, b) => new Date(a.completed_at) - new Date(b.completed_at)
    )

    let round          = 0
    let doneInRound    = new Set()

    for (const comp of sorted) {
      // Ignorar duplicados dentro de la misma ronda
      if (doneInRound.has(comp.room_id)) continue
      doneInRound.add(comp.room_id)
      // Cuando todas las habitaciones están hechas → nueva ronda
      if (roomIds.every(id => doneInRound.has(id))) {
        round++
        doneInRound = new Set()
      }
    }

    return { round, doneRoomIds: doneInRound }
  })()

  const { round: roomRound, doneRoomIds } = roomRoundData

  function roomPersonForRound(roomIndex) {
    return personAtIndex(roomRound + roomIndex)
  }

  function isRoomDone(roomId) {
    return doneRoomIds.has(roomId)
  }

  function lastRoomCompletion(roomId) {
    return roomComp
      .filter(c => c.room_id === roomId)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0] ?? null
  }

  /* ── Actions */
  async function markDone(taskType, person) {
    if (!person) return
    setLoading(taskType)
    const { error } = await supabase.from('completions').insert({
      task_type: taskType,
      person_id: person.id,
      due_date:  today,
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
      due_date:  today,
    })
    if (error) console.error(error)
    setLoading(null)
    onRefresh()
  }

  const myDishTurn  = currentPerson?.id === dishPerson?.id
  const myRoomTurns = rooms.some((r, i) => !isRoomDone(r.id) && currentPerson?.id === roomPersonForRound(i)?.id)
  const hasPending  = (myDishTurn || myRoomTurns) && people.length > 0

  return (
    <div className="dashboard">
      <NotificationBanner />

      {hasPending && (
        <div className="pending-banner">⚡ Tienes tareas pendientes</div>
      )}

      {/* ── Lavavajillas */}
      <div className="task-with-vote">
        {dishSkipped && (
          <div className="skip-notice">
            ⏭️ {originalDishPerson?.name} saltado → ahora le toca a {dishPerson?.name}
          </div>
        )}
        <TaskCard
          title="Recoger el lavavajillas"
          emoji="🍽️"
          frequency="Por turno"
          person={dishPerson}
          isDone={false}
          streak={dishComp.length}
          streakLabel="veces completado"
          loading={loading === 'dishwasher'}
          noPeople={!people.length}
          isMyTurn={myDishTurn}
          onMarkDone={() => markDone('dishwasher', dishPerson)}
        />
        {lastDishComp && (
          <div className="last-done-hint">
            Último: {lastDishComp.people?.name ?? '?'} · {formatCompletedAt(lastDishComp.completed_at)}
          </div>
        )}
        {getPeopleChain(dishStartIdx, 'dishwasher', today).map(p => (
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

      {/* ── Habitaciones */}
      {rooms.length > 0 && (
        <div className="rooms-week-section">
          <div className="rooms-week-header">
            <span className="rooms-week-title">Habitaciones</span>
          </div>

          {!people.length ? (
            <p className="no-people-hint">→ Añade personas en la pestaña "Personas"</p>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room, i) => {
                const person   = roomPersonForRound(i)
                const done     = isRoomDone(room.id)
                const lastComp = lastRoomCompletion(room.id)
                const key      = `room_${room.id}`
                const isMyRoom = !done && currentPerson?.id === person?.id
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

                    {lastComp && (
                      <div className="last-done-hint">
                        Último: {lastComp.people?.name ?? '?'} · {new Date(lastComp.completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                    )}

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

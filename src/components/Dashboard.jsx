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

/* Week number from a fixed epoch (Mon 2025-01-06 = week 0) */
function currentWeekNumber(mondayStr) {
  const epoch = new Date('2025-01-06')
  const d = new Date(mondayStr)
  return Math.floor((d - epoch) / (7 * 24 * 60 * 60 * 1000))
}

/* ── Streak calculators ───────────────────────────────── */
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

/* ── Notification helper ──────────────────────────────── */
async function fireNotification(title, body) {
  if (!('Notification' in window)) { alert('Tu navegador no soporta notificaciones.'); return }
  const perm = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission
  if (perm === 'granted') new Notification(title, { body, icon: '/favicon.ico' })
  else alert('Activa los permisos de notificación en tu navegador.')
}

/* ── Week label ───────────────────────────────────────── */
function weekLabel(mondayStr) {
  const monday = new Date(mondayStr)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

/* ── Component ────────────────────────────────────────── */
export default function Dashboard({ people, rooms, completions, onRefresh }) {
  const [loading, setLoading] = useState(null)

  const today    = todayStr()
  const thisWeek = weekMondayStr()
  const weekNum  = currentWeekNumber(thisWeek)

  const dishComp = completions.filter(c => c.task_type === 'dishwasher')
  const roomComp = completions.filter(c => c.task_type === 'room')

  const dishDone = dishComp.some(c => c.due_date === today)

  function currentPerson(taskCompletions) {
    if (!people.length) return null
    return people[taskCompletions.length % people.length]
  }

  const dishPerson = currentPerson(dishComp)

  /* Room rotation: room i → person[(weekNum + i) % n] */
  function roomPerson(roomIndex) {
    if (!people.length) return null
    return people[(weekNum + roomIndex) % people.length]
  }

  function isRoomDone(roomId) {
    return roomComp.some(c => c.room_id === roomId && c.due_date >= thisWeek)
  }

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

  const roomsPending = rooms.some((r, i) => !isRoomDone(r.id) && people.length > 0)
  const hasPending   = (!dishDone || roomsPending) && people.length > 0

  return (
    <div className="dashboard">
      {hasPending && (
        <div className="pending-banner">
          ⚡ Tienes tareas pendientes
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
        onMarkDone={() => markDone('dishwasher', dishPerson, today)}
        onNotify={() => fireNotification('🍽️ Recoger el lavavajillas', `Hoy le toca a ${dishPerson?.name ?? '…'}`)}
      />

      {/* ── Rooms section ── */}
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
                const person = roomPerson(i)
                const done   = isRoomDone(room.id)
                const key    = `room_${room.id}`
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
                        <span className="turn-label">Le toca a</span>
                        <span className="turn-name">{person?.name ?? '—'}</span>
                      </div>
                      <div className="avatar avatar-sm">{initials}</div>
                    </div>
                    {done ? (
                      <div className="room-done-state">✅ Hecho</div>
                    ) : (
                      <button
                        className="room-mark-btn"
                        onClick={() => markRoomDone(room, person)}
                        disabled={loading === key}
                      >
                        {loading === key ? '…' : 'Marcar ✓'}
                      </button>
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

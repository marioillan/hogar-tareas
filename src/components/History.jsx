import { useState } from 'react'

const FIXED_LABELS = {
  dishwasher: { emoji: '🍽️', text: 'Recoger el lavavajillas' },
}

function getLabel(c) {
  if (c.task_type === 'room' && c.rooms) {
    return { emoji: c.rooms.emoji ?? '🏠', text: c.rooms.name }
  }
  return FIXED_LABELS[c.task_type] ?? { emoji: '❓', text: c.task_type }
}

export default function History({ completions, rooms }) {
  const [filter, setFilter] = useState('all')

  const filtered = completions.filter(c =>
    filter === 'all' || c.task_type === filter || (filter === 'room' && c.task_type === 'room')
  )

  const total     = completions.length
  const dishCount = completions.filter(c => c.task_type === 'dishwasher').length
  const roomCount = completions.filter(c => c.task_type === 'room').length

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="history">
      <h2 className="section-title">📋 Historial</h2>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{dishCount}</div>
          <div className="stat-label">🍽️ Lavavajillas recogidos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{roomCount}</div>
          <div className="stat-label">🏠 Habitaciones limpiadas</div>
        </div>
      </div>

      {/* Filters */}
      <div className="history-filters">
        {[
          ['all',        'Todos'],
          ['dishwasher', '🍽️ Lavavajillas'],
          ...(roomCount > 0 ? [['room', '🏠 Habitaciones']] : []),
        ].map(([val, label]) => (
          <button
            key={val}
            className={`filter-chip ${filter === val ? 'active' : ''}`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="empty-state">
          {total === 0 ? 'No hay tareas completadas todavía.' : 'No hay resultados para este filtro.'}
        </p>
      ) : (
        <div className="history-list">
          {filtered.map(c => {
            const { emoji, text } = getLabel(c)
            return (
              <div className="history-item" key={c.id}>
                <span className="h-icon">{emoji}</span>
                <div className="h-info">
                  <div className="h-task">{text}</div>
                  <div className="h-person">{c.people?.name ?? 'Persona eliminada'}</div>
                </div>
                <div className="h-date">
                  <div>{formatDate(c.completed_at)}</div>
                  <div>{formatTime(c.completed_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

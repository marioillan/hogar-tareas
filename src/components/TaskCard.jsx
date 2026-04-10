export default function TaskCard({
  title, emoji, frequency,
  person, isDone, streak, streakLabel,
  loading, onMarkDone,
  noPeople, isMyTurn
}) {
  const initials = person?.name
    ? person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className={`task-card ${isDone ? 'done' : ''} ${isMyTurn && !isDone ? 'my-turn' : ''}`}>
      <div className="task-card-header">
        <div className="task-title-group">
          <h2>{emoji} {title}</h2>
          <span className="task-frequency">{frequency}</span>
        </div>
      </div>

      {noPeople ? (
        <p className="no-people-hint">→ Añade personas en la pestaña "Personas"</p>
      ) : (
        <>
          <div className="turn-row">
            <div className="turn-info">
              <span className="turn-label">{isMyTurn ? '¡Hoy te toca a ti!' : 'Turno de'}</span>
              <span className="turn-name">{isMyTurn ? 'Tú' : (person?.name ?? '—')}</span>
            </div>
            <div className="avatar">{initials}</div>
          </div>

          {streak > 0 && (
            <div className="streak-badge">
              🔥 {streak} {streakLabel}
            </div>
          )}

          {isDone ? (
            <div className="done-state">
              <span>✅</span>
              <span>¡Completado! Buen trabajo.</span>
            </div>
          ) : isMyTurn ? (
            <button
              className="mark-done-btn"
              onClick={onMarkDone}
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Marcar como hecho ✓'}
            </button>
          ) : (
            <div className="not-your-turn">
              🔒 Hoy le toca a {person?.name}
            </div>
          )}
        </>
      )}
    </div>
  )
}

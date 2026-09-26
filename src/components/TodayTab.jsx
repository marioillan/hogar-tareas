import { ini, rel } from '../lib/logic'

export default function TodayTab({ ctx, actions }) {
  const { me, members, rooms, log, nm, skipIds, dish, lastE, doneToday, active, weekRooms, joined } = ctx
  const next = dish.next
  const isMyTurn = next.id === me.id
  const doneTodayText = doneToday ? (lastE.person_id === me.id ? 'Hoy ya lo has sacado tú' : `Hoy ya lo sacó ${nm(lastE.person_id)}`) : ''

  const myRooms = weekRooms.filter(w => w.mine)
  const roomSummary = active
    ? { title: myRooms.length ? `Te toca: ${myRooms.map(w => w.room.name).join(', ')}` : 'Esta semana descansas', sub: `${weekRooms.filter(w => w.done).length} de ${rooms.length} zonas hechas` }
    : { title: 'Rotación pendiente', sub: `${joined} de ${members.length} integrantes unidos` }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'dcRise .35s ease both' }}>
      <div className="card" style={{ padding: 20, gap: 18, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="ph ph-fork-knife" />Lavavajillas</span>
          <span className="text-muted" style={{ fontSize: 12 }}>{log.length} veces en total</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, boxShadow: '0 0 0 1px var(--color-accent)', animation: isMyTurn ? 'dcGlow 2.4s ease-in-out infinite' : 'none' }}>{ini(next.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="text-muted" style={{ fontSize: 13 }}>{isMyTurn ? '¡Te toca a ti!' : 'Le toca a'}</div>
            <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-.02em', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{isMyTurn ? 'Tú' : next.name}</div>
          </div>
        </div>

        {skipIds.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontSize: 12, animation: 'dcRise .25s ease both' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="ph ph-skip-forward" />Saltados hoy:</span>
            {skipIds.map(id => (
              <button key={id} className="tag tag-neutral" style={{ border: 0, cursor: 'pointer', gap: 4, font: 'inherit', fontSize: 11 }}
                onClick={() => actions.undoSkip(id)} title="Deshacer salto" aria-label={`Deshacer salto de ${nm(id)}`}>
                {nm(id)}<i className="ph ph-x" />
              </button>
            ))}
          </div>
        )}

        {!doneToday ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 8 }}>
            <button className="btn btn-primary" style={{ minHeight: 46 }} onClick={actions.markDish}>
              <i className="ph ph-check" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isMyTurn ? 'Lo he sacado' : `Lo ha sacado ${next.name}`}</span>
            </button>
            <button className="btn btn-secondary" style={{ minHeight: 46 }} disabled={skipIds.length >= members.length - 1} onClick={actions.skipDish}>
              <i className="ph ph-skip-forward" />No está
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 46, padding: '0 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-900)', color: 'var(--color-accent-200)', fontSize: 14, animation: 'dcRise .3s ease both' }}>
            <i className="ph-fill ph-check-circle" style={{ fontSize: 18, color: 'var(--color-accent)' }} />
            <span style={{ flex: 1 }}>{doneTodayText}</span>
            <span style={{ fontSize: 12, color: 'var(--color-accent-300)' }}>Vuelve mañana</span>
          </div>
        )}

        {lastE && (
          <div className="card-meta"><i className="ph ph-clock-counter-clockwise" />Último: {nm(lastE.person_id)} · {rel(new Date(lastE.done_at).getTime())}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h6 className="text-muted" style={{ margin: 0, fontSize: 11 }}>Próximos turnos</h6>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {dish.up.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 6px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 13, animation: 'dcRise .3s ease both', animationDelay: `${i * 0.06}s` }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 10, background: 'var(--color-neutral-800)', color: 'var(--color-neutral-200)' }}>{i + 2}</span>
              {p.id === me.id ? 'Tú' : p.name}
            </div>
          ))}
        </div>
        <p className="text-muted" style={{ margin: 0, fontSize: 12, textWrap: 'pretty' }}>El turno va a quien menos veces lo ha sacado. Si alguien no está, se salta y lo recupera después.</p>
      </div>

      <div className="card" style={{ padding: 16, gap: 10, boxShadow: 'var(--shadow-sm)' }}>
        <span className="card-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="ph ph-broom" />Limpieza · esta semana</span>
        <div style={{ fontSize: 17, fontWeight: 500 }}>{roomSummary.title}</div>
        <div className="text-muted" style={{ fontSize: 13 }}>{roomSummary.sub}</div>
        <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={() => actions.goTab('tareas')}>Ver rotación<i className="ph ph-arrow-right" /></button>
      </div>
    </div>
  )
}

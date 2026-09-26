import { assignWeek, fmtShort } from '../lib/logic'

const rule = '1px solid color-mix(in srgb, var(--color-text) 7%, transparent)'

function Waiting({ ctx, actions }) {
  const { members, me, isAdmin, joined } = ctx
  const allJoined = joined === members.length
  return (
    <div className="card" style={{ padding: 18, gap: 14, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="card-kicker">Esperando integrantes</span>
        <span style={{ fontSize: 13 }}>{joined} de {members.length}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {members.map((m, i) => (
          <div key={m.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i < joined ? 'var(--color-accent)' : 'var(--color-neutral-800)', boxShadow: i < joined ? '0 0 8px -1px var(--color-accent)' : 'none', transition: 'all .4s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <i className={m.joined ? 'ph-fill ph-check-circle' : 'ph ph-clock'} style={{ color: m.joined ? 'var(--color-accent)' : 'var(--color-neutral-600)', fontSize: 16 }} />
            <span style={{ flex: 1 }}>{m.id === me.id ? `${m.name} (tú)` : m.name}</span>
            <span className="text-muted" style={{ fontSize: 12 }}>{m.joined ? 'Unido' : 'Pendiente'}</span>
          </div>
        ))}
      </div>
      {isAdmin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" style={{ minHeight: 46 }} disabled={!allJoined || ctx.shuffling} onClick={actions.startRandom}><i className="ph ph-shuffle" />Rotación aleatoria</button>
          {!allJoined && <span className="text-muted" style={{ fontSize: 12 }}>La aleatoria se activa cuando estén todos dentro.</span>}
          <button className="btn btn-secondary" style={{ minHeight: 44 }} onClick={actions.openManual}><i className="ph ph-list-numbers" />Asignar manualmente</button>
        </div>
      ) : (
        <p className="text-muted" style={{ margin: 0, fontSize: 13, textWrap: 'pretty' }}>El administrador iniciará la rotación cuando estéis todos.</p>
      )}
    </div>
  )
}

function Manual({ ctx, actions, manual }) {
  const { rooms, nm } = ctx
  return (
    <div className="card" style={{ padding: 18, gap: 14, boxShadow: 'var(--shadow-md)', animation: 'dcRise .3s ease both' }}>
      <div>
        <span className="card-kicker">Asignación manual</span>
        <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13, textWrap: 'pretty' }}>Ordena a las personas. Este orden fija la semana 1 y a partir de ahí rota cada semana.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {manual.map((id, i) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, background: 'var(--color-neutral-800)' }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>{nm(id)}</div>
              <div style={{ fontSize: 11, color: 'var(--color-accent-300)' }}>{rooms.filter((_, ri) => ri % manual.length === i).map(r => r.name).join(', ') || 'Descansa la semana 1'}</div>
            </div>
            <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }} disabled={i === 0} onClick={() => actions.moveManual(i, -1)} aria-label={`Subir a ${nm(id)}`}><i className="ph ph-arrow-up" /></button>
            <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }} disabled={i === manual.length - 1} onClick={() => actions.moveManual(i, 1)} aria-label={`Bajar a ${nm(id)}`}><i className="ph ph-arrow-down" /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
        <button className="btn btn-secondary" style={{ minHeight: 44 }} onClick={actions.cancelManual}>Cancelar</button>
        <button className="btn btn-primary" style={{ minHeight: 44 }} onClick={actions.confirmManual}><i className="ph ph-check" />Confirmar orden</button>
      </div>
    </div>
  )
}

function CurrentWeek({ ctx, actions }) {
  const { week, wDate, weekRooms, nm, isAdmin } = ctx
  const allDone = weekRooms.length > 0 && weekRooms.every(w => w.done)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h6 className="text-muted" style={{ margin: 0, fontSize: 11 }}>Semana {week + 1} · {fmtShort(wDate(week))}</h6>
      {weekRooms.map(w => (
        <div key={w.room.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 12px 12px 14px', boxShadow: w.mine && !w.done ? '0 0 0 1px var(--color-accent-700), 0 0 20px -10px var(--color-accent)' : 'var(--shadow-sm)', opacity: w.done ? 0.6 : 1, transition: 'opacity .3s' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{w.room.name}</div>
            <div style={{ fontSize: 12, color: w.mine ? 'var(--color-accent-300)' : 'var(--color-neutral-400)' }}>{w.mine ? 'Te toca a ti' : nm(w.pid)}</div>
          </div>
          {w.done && <span className="tag tag-accent" style={{ gap: 4, animation: 'dcPop .35s ease both' }}><i className="ph ph-check" />Hecha</span>}
          {(w.mine || isAdmin) && (
            <button className="btn btn-icon btn-secondary" onClick={() => actions.toggleRoom(w)} aria-label={w.done ? `Desmarcar ${w.room.name}` : `Marcar ${w.room.name} como hecha`}>
              <i className={w.done ? 'ph ph-arrow-counter-clockwise' : 'ph ph-check'} style={{ color: w.done ? 'var(--color-neutral-400)' : 'var(--color-accent)' }} />
            </button>
          )}
        </div>
      ))}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8, marginTop: 2 }}>
          <button className="btn btn-primary" style={{ minHeight: 44, opacity: allDone ? 1 : 0.7 }} onClick={actions.nextWeek}>Siguiente semana<i className="ph ph-arrow-right" /></button>
          <button className="btn btn-secondary" style={{ minHeight: 44 }} onClick={actions.resetRot}><i className="ph ph-arrow-counter-clockwise" />Rehacer</button>
        </div>
      )}
    </div>
  )
}

function WeeksTable({ ctx }) {
  const { rooms, order, week, wDate, active, shuffling, me, nm } = ctx
  const n = order.length
  const hasFree = n > rooms.length
  const weeks = Array.from({ length: n }, (_, k) => {
    const w = week + k, cur = k === 0 && active, as = assignWeek(rooms, order, w)
    const row = (key, room, icon, ids) => {
      const mine = ids.includes(me.id)
      return {
        key, room, icon, person: ids.length ? ids.map(id => id === me.id ? 'Tú' : nm(id)).join(', ') : '—',
        color: shuffling ? 'var(--color-accent-400)' : mine ? 'var(--color-accent-200)' : 'var(--color-text)', weight: mine ? 500 : 400,
      }
    }
    const rows = rooms.map((r, i) => row(r.id, r.name, 'ph ph-broom', [as[i]]))
    if (hasFree) rows.push(row('free', 'Descansa', 'ph ph-coffee', order.filter(id => !as.includes(id))))
    return { w, cur, rows }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h6 className="text-muted" style={{ margin: 0, fontSize: 11 }}>{shuffling ? 'Sorteando…' : 'Orden de rotación completo'}</h6>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {weeks.map(({ w, cur, rows }, k) => (
          <div key={w} className="card" style={{ padding: '12px 14px', gap: 8, boxShadow: cur ? '0 0 0 1px var(--color-accent-700), 0 0 22px -12px var(--color-accent)' : 'var(--shadow-sm)', background: cur ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))' : 'var(--color-surface)', animation: 'dcRise .35s ease both', animationDelay: `${k * 0.05}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: cur ? 'var(--color-accent-300)' : 'var(--color-text)' }}>Semana {w + 1}</span>
              <span className="text-muted" style={{ fontSize: 12, flex: 1 }}>{fmtShort(wDate(w))}</span>
              {cur && <span className="tag tag-accent">Esta semana</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map(r => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '6px 0', borderTop: rule, fontSize: 14 }}>
                  <span className="text-muted" style={{ flex: 1, minWidth: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><i className={r.icon} />{r.room}</span>
                  <span style={{ textAlign: 'right', color: r.color, fontWeight: r.weight, transition: 'color .15s' }}>{r.person}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CleaningTab({ ctx, actions, manual }) {
  const { active, shuffling, rotation, rooms, members } = ctx
  const isManual = !!manual
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'dcRise .35s ease both' }}>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 24 }}>Limpieza semanal</h3>
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
          {active ? `Rotación ${rotation.mode} · ${rooms.length} zonas · ${members.length} personas` : 'La rotación empieza cuando estén todos o si el administrador la asigna a mano.'}
        </p>
      </div>
      {!active && !isManual && !shuffling && <Waiting ctx={ctx} actions={actions} />}
      {isManual && <Manual ctx={ctx} actions={actions} manual={manual} />}
      {active && !shuffling && <CurrentWeek ctx={ctx} actions={actions} />}
      {(active || shuffling) && !isManual && <WeeksTable ctx={ctx} />}
    </div>
  )
}

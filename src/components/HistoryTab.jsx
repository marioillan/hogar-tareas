import { ini, fmtDay, fmtTime } from '../lib/logic'

const rowRule = 'linear-gradient(to right, transparent, color-mix(in srgb, var(--color-text) 8%, transparent) 48px, color-mix(in srgb, var(--color-text) 8%, transparent) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px'

export default function HistoryTab({ ctx, actions }) {
  const { members, log, me, nm, dish, isAdmin } = ctx
  const counts = dish.counts
  const vals = members.map(m => counts[m.id])
  const max = Math.max(0, ...vals), min = Math.min(...vals)
  const diff = max - min
  const bars = [...members].sort((a, b) => counts[b.id] - counts[a.id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'dcRise .35s ease both' }}>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 24 }}>Historial</h3>
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{log.length} registros del lavavajillas</p>
      </div>

      <div className="card" style={{ padding: 18, gap: 14, boxShadow: 'var(--shadow-sm)' }}>
        <span className="card-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="ph ph-fork-knife" />Veces que ha sacado el lavavajillas</span>
        {bars.map((m, i) => {
          const c = counts[m.id], debt = max - c
          const color = m.id === me.id ? 'var(--color-accent)' : 'var(--color-neutral-500)'
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0 }}>{m.id === me.id ? `${m.name} (tú)` : m.name}</span>
                {debt > 0 && <span style={{ fontSize: 11, color: 'var(--color-accent-300)' }}>debe recuperar {debt}</span>}
                <span style={{ fontSize: 18, fontWeight: 500, minWidth: 24, textAlign: 'right' }}>{c}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--color-neutral-900)' }}>
                <div style={{ height: '100%', width: max ? `${(c / max) * 100}%` : '0%', borderRadius: 2, background: color, boxShadow: `0 0 12px -2px ${color}`, transformOrigin: 'left', animation: 'dcGrow .7s cubic-bezier(.2,.8,.2,1) both', animationDelay: `${i * 0.08}s` }} />
              </div>
            </div>
          )
        })}
        <div className="card-meta" style={{ marginTop: 2 }}>
          <i className="ph ph-scales" />{diff === 0 ? 'Todos igualados' : `Diferencia máxima: ${diff} ${diff === 1 ? 'vez' : 'veces'}`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
          <h6 className="text-muted" style={{ margin: 0, fontSize: 11 }}>Quién lo ha sacado</h6>
          {isAdmin && log.length > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={actions.undoLast}><i className="ph ph-arrow-counter-clockwise" />Deshacer último</button>
          )}
        </div>
        {log.length === 0 && <p className="text-muted" style={{ fontSize: 13, margin: '8px 0' }}>Todavía no hay registros.</p>}
        {[...log].reverse().slice(0, 40).map(e => {
          const name = nm(e.person_id)
          const at = new Date(e.done_at).getTime()
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', background: rowRule }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{ini(name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{e.person_id === me.id ? `${name} (tú)` : name}</div>
                {e.skipped?.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--color-accent-300)', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <i className="ph ph-skip-forward" />Cubrió a {e.skipped.map(nm).join(', ')}
                  </div>
                )}
              </div>
              <div className="text-muted" style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.35 }}><div>{fmtDay(at)}</div><div>{fmtTime(at)}</div></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

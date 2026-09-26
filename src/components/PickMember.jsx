import { ini } from '../lib/logic'

export default function PickMember({ group, members, onBack, onPick }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px 32px', gap: 26 }}>
      <button className="btn btn-icon btn-secondary" onClick={onBack} aria-label="Atrás"><i className="ph ph-arrow-left" /></button>
      <div style={{ animation: 'dcRise .35s ease both' }}>
        <span className="card-kicker">{group.name}</span>
        <h2 style={{ fontSize: 26, margin: '6px 0 6px' }}>¿Quién eres?</h2>
        <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>Elige tu nombre de los que ha añadido el administrador.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
        {members.map((m, i) => (
          <button key={m.id} className="card" onClick={() => onPick(m)}
            style={{ border: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', padding: 14, gap: 10, minHeight: 96, boxShadow: 'var(--shadow-sm)', animation: 'dcRise .35s ease both', animationDelay: `${i * 0.05}s` }}>
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 13, boxShadow: '0 0 0 1px var(--color-accent-700)' }}>{ini(m.name)}</div>
            <span style={{ fontSize: 15, fontWeight: 500, overflowWrap: 'anywhere' }}>{m.name}</span>
            <span className="text-muted" style={{ fontSize: 11 }}>
              {m.id === group.admin_member_id ? 'Administrador' : m.joined ? 'Ya unido · entrar de nuevo' : 'Pendiente de unirse'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

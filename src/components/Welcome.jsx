const accentLine = '2px solid var(--color-accent)'

function House() {
  const smoke = [0, 0.85, 1.7]
  const windowStyle = {
    position: 'absolute', top: 72, width: 14, height: 14, borderRadius: 2,
    background: 'var(--color-accent-300)', boxShadow: '0 0 12px var(--color-accent)',
  }
  return (
    <div style={{ alignSelf: 'center', marginBottom: 10, animation: 'dcPop .7s cubic-bezier(.2,.8,.3,1.2) both' }} aria-hidden="true">
      <div style={{ position: 'relative', width: 140, height: 130, animation: 'dcFloat 3.6s ease-in-out infinite' }}>
        {smoke.map(d => (
          <span key={d} style={{ position: 'absolute', left: 95, top: 14, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-neutral-400)', animation: `dcSmoke 2.6s ease-out ${d}s infinite` }} />
        ))}
        <div style={{ position: 'absolute', left: 92, top: 22, width: 14, height: 22, border: accentLine, borderBottom: 0, background: 'var(--color-bg)', borderRadius: '2px 2px 0 0' }} />
        <div style={{ position: 'absolute', left: 25, top: 58, width: 90, height: 58, border: accentLine, borderTop: 0, borderRadius: '0 0 4px 4px', background: 'linear-gradient(to bottom, var(--color-accent-900), var(--color-bg))', boxShadow: '0 0 30px -10px var(--color-accent)' }} />
        <div style={{ position: 'absolute', left: 37, top: 25, width: 66, height: 66, transform: 'rotate(45deg)', borderTop: accentLine, borderLeft: accentLine, borderRadius: '4px 0 0 0', filter: 'drop-shadow(0 0 6px var(--color-accent))' }} />
        <div style={{ ...windowStyle, left: 36, animation: 'dcLight 4s ease-in-out infinite' }} />
        <div style={{ ...windowStyle, left: 90, animation: 'dcLight 4s ease-in-out 1.3s infinite' }} />
        <div style={{ position: 'absolute', left: 61, top: 86, width: 18, height: 30, border: accentLine, borderBottom: 0, borderRadius: '9px 9px 0 0', background: 'var(--color-bg)' }} />
        <div style={{ position: 'absolute', left: -10, right: -10, top: 116, height: 1, background: 'linear-gradient(to right, transparent, var(--color-accent-600) 48px, var(--color-accent-600) calc(100% - 48px), transparent)' }} />
      </div>
    </div>
  )
}

export default function Welcome({ onCreate, onJoin }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '40px 24px 44px', gap: 32, animation: 'dcRise .45s ease both' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <House />
        <h1 style={{ margin: 0, fontSize: 38 }}>Tareas del Hogar</h1>
        <p className="text-muted" style={{ margin: 0, fontSize: 15, maxWidth: '34ch', textWrap: 'pretty' }}>
          Turnos del lavavajillas y rotación semanal de la limpieza para vuestra casa compartida.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary" style={{ minHeight: 48, fontSize: 15 }} onClick={onCreate}><i className="ph ph-plus" />Crear un grupo</button>
        <button className="btn btn-secondary" style={{ minHeight: 48, fontSize: 15 }} onClick={onJoin}><i className="ph ph-key" />Unirme con un código</button>
      </div>
    </div>
  )
}

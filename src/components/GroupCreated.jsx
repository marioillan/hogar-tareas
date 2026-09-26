export default function GroupCreated({ groupName, code, copyLabel, onCopy, onEnter }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px', gap: 28 }}>
      <div style={{ animation: 'dcRise .4s ease both' }}>
        <span className="card-kicker">Grupo creado</span>
        <h2 style={{ fontSize: 28, margin: '6px 0 6px' }}>{groupName}</h2>
        <p className="text-muted" style={{ margin: 0, fontSize: 14, textWrap: 'pretty' }}>Comparte este código. Cada persona entra con él y elige su nombre de la lista.</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }} aria-label={`Código ${code.split('').join(' ')}`}>
        {code.split('').map((ch, i) => (
          <div key={i} aria-hidden="true" style={{ flex: 1, maxWidth: 56, aspectRatio: '3/4', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: '0 0 0 1px var(--color-accent-700), 0 0 22px -10px var(--color-accent)', fontSize: 28, fontWeight: 500, color: 'var(--color-accent-200)', animation: 'dcPop .5s cubic-bezier(.2,.8,.3,1.2) both', animationDelay: `${i * 0.08}s` }}>{ch}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-secondary" style={{ minHeight: 44 }} onClick={onCopy}><i className="ph ph-copy" />{copyLabel}</button>
        <button className="btn btn-primary" style={{ minHeight: 48 }} onClick={onEnter}>Entrar al grupo<i className="ph ph-arrow-right" /></button>
      </div>
    </div>
  )
}

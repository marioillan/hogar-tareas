import { useState } from 'react'
import { onEnter } from '../lib/logic'
import { ErrorLine } from './CreateGroup'

export default function JoinGroup({ onBack, onSubmit }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [focus, setFocus] = useState(true)
  const [busy, setBusy] = useState(false)

  const submit = async (c = code) => {
    if (c.length !== 6 || busy) return
    setBusy(true)
    try {
      const found = await onSubmit(c)
      if (!found) setErr('No existe ningún grupo con ese código.')
    } catch (e) {
      console.error(e)
      setErr('No se ha podido conectar. Inténtalo de nuevo.')
    } finally { setBusy(false) }
  }

  const onChange = e => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(v); setErr('')
    if (v.length === 6) submit(v)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px 32px', gap: 26 }}>
      <button className="btn btn-icon btn-secondary" onClick={onBack} aria-label="Atrás"><i className="ph ph-arrow-left" /></button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'dcRise .35s ease both' }}>
        <div>
          <h2 style={{ fontSize: 26, margin: '0 0 6px' }}>Unirme a un grupo</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>Pide el código de 6 caracteres al administrador.</p>
        </div>
        <div className="field"><label htmlFor="join-code">Código del grupo</label>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 6 }}>
            {[0, 1, 2, 3, 4, 5].map(i => {
              const ch = code[i] || ''
              const active = focus && i === Math.min(code.length, 5) && code.length < 6
              const shadow = err ? '0 0 0 1px var(--color-accent-300)'
                : active ? '0 0 0 1px var(--color-accent), 0 0 16px -6px var(--color-accent)'
                : ch ? '0 0 0 1px var(--color-accent-700)' : '0 0 0 1px var(--color-divider)'
              return (
                <div key={i} aria-hidden="true" style={{ aspectRatio: '4/5', maxHeight: 72, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: shadow, fontSize: 26, fontWeight: 500, color: 'var(--color-accent-200)', transition: 'box-shadow .2s' }}>
                  {ch && <span style={{ animation: 'dcPop .25s ease both' }}>{ch}</span>}
                  {active && !ch && <span style={{ width: 2, height: 26, background: 'var(--color-accent)', animation: 'dcBlink 1s steps(1) infinite' }} />}
                </div>
              )
            })}
            <input id="join-code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck="false" maxLength={6} autoFocus
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, fontSize: 16, border: 0, padding: 0, background: 'transparent', color: 'transparent', caretColor: 'transparent' }}
              value={code} onChange={onChange} onKeyDown={onEnter(() => submit())} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
          </div>
        </div>
        {err && <ErrorLine text={err} />}
        <button className="btn btn-primary" style={{ minHeight: 48 }} disabled={code.length !== 6 || busy} onClick={() => submit()}>
          {busy ? 'Buscando…' : 'Buscar grupo'}<i className="ph ph-arrow-right" />
        </button>
      </div>
    </div>
  )
}

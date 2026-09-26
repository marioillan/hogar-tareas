import { useEffect } from 'react'
import { DICE_PIPS } from '../lib/logic'

const blurBg = (pct, blur) => ({
  position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
  background: `color-mix(in srgb, var(--color-bg) ${pct}%, transparent)`,
  backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
  animation: 'dcFade .2s ease both',
})

const fadingRule = {
  position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
  background: 'linear-gradient(to right, transparent, var(--color-accent-600) 48px, var(--color-accent-600) calc(100% - 48px), transparent)',
}

export function Confirm({ confirm, onCancel }) {
  useEffect(() => {
    if (!confirm) return
    const onKey = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm, onCancel])

  if (!confirm) return null
  const { title, body, ok, icon, onOk } = confirm
  return (
    <div className="dialog-backdrop" onClick={onCancel}
      style={{ zIndex: 45, placeItems: 'end center', padding: '16px 16px calc(24px + env(safe-area-inset-bottom))', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', animation: 'dcFade .2s ease both' }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 448, animation: 'dcRise .28s cubic-bezier(.2,.8,.3,1) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ width: 40, height: 40, boxShadow: '0 0 0 1px var(--color-accent-700)', fontSize: 18 }}><i className={icon} /></div>
          <div className="dialog-title" id="confirm-title">{title}</div>
        </div>
        <div className="dialog-body" style={{ textWrap: 'pretty' }}>{body}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 4 }}>
          <button className="btn btn-secondary" style={{ minHeight: 46 }} onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" style={{ minHeight: 46 }} onClick={onOk} autoFocus><i className={icon} />{ok}</button>
        </div>
      </div>
    </div>
  )
}

export function Loading({ loading }) {
  if (!loading) return null
  const dust = [
    [44, 6, 6, 'dcDust', 0, 400], [64, 4, 4, 'dcDust', .2, 500],
    [90, 6, 5, 'dcDustR', .35, 400], [104, 3, 4, 'dcDustR', .55, 500],
  ]
  return (
    <div style={{ ...blurBg(80, 6), zIndex: 50 }} role="status" aria-live="polite">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', width: 150, height: 110 }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, marginLeft: -32, width: 64, height: 96, display: 'grid', placeItems: 'start center', transformOrigin: '50% 8%', animation: 'dcSweep .7s ease-in-out infinite alternate' }}>
            <i className="ph-fill ph-broom" style={{ fontSize: 88, lineHeight: 1, color: 'var(--color-accent-300)', filter: 'drop-shadow(0 0 12px var(--color-accent))', transform: 'rotate(-45deg) translateY(6px)' }} />
          </div>
          {dust.map(([left, bottom, size, anim, d, shade], i) => (
            <span key={i} style={{ position: 'absolute', left, bottom, width: size, height: size, borderRadius: '50%', background: `var(--color-neutral-${shade})`, animation: `${anim} .7s ease-out ${d}s infinite` }} />
          ))}
          <div style={fadingRule} />
        </div>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>{loading.text}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{loading.sub}</div>
        </div>
        <div style={{ width: 160, height: 3, borderRadius: 2, background: 'var(--color-neutral-900)', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--color-accent)', boxShadow: '0 0 10px var(--color-accent)', transformOrigin: 'left', animation: 'dcGrow 1.6s cubic-bezier(.4,.1,.3,1) both' }} />
        </div>
      </div>
    </div>
  )
}

export function Burst({ text }) {
  if (!text) return null
  return (
    <div style={{ ...blurBg(55, 0), pointerEvents: 'none', zIndex: 30, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', width: 96, height: 96 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid var(--color-accent)', animation: 'dcRing 1s ease-out both' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid var(--color-accent-400)', animation: 'dcRing 1s ease-out .18s both' }} />
          <div className="avatar" style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 1px var(--color-accent),0 0 40px -4px var(--color-accent)', fontSize: 44, animation: 'dcPop .5s cubic-bezier(.2,.8,.3,1.3) both' }}><i className="ph ph-check" /></div>
        </div>
        <div style={{ fontSize: 15, animation: 'dcRise .4s ease .15s both' }} role="status">{text}</div>
      </div>
    </div>
  )
}

export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', left: '50%', bottom: 88, transform: 'translateX(-50%)', maxWidth: 'min(440px, calc(100% - 32px))', width: 'max-content', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', fontSize: 13, zIndex: 40, animation: 'dcToast .3s ease both' }}>
      {msg}
    </div>
  )
}

export function Dice({ dice }) {
  if (!dice) return null
  const on = DICE_PIPS[dice.face || 1]
  return (
    <div style={{ ...blurBg(70, 6), zIndex: 35 }} role="status" aria-live="polite">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ animation: 'dcBounce .45s cubic-bezier(.3,.6,.4,1) infinite alternate' }}>
          <div style={{ width: 96, height: 96, padding: 14, borderRadius: 18, background: 'var(--color-surface)', boxShadow: '0 0 0 1px var(--color-accent), 0 0 44px -6px var(--color-accent), 0 14px 30px rgba(0,0,0,.55)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)', placeItems: 'center', transform: `rotate(${dice.rot}deg)`, transition: 'transform .12s ease-out' }}>
            {Array.from({ length: 9 }, (_, i) => {
              const lit = on.includes(i)
              return <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--color-accent-200)', boxShadow: '0 0 8px var(--color-accent)', opacity: lit ? 1 : 0, transform: `scale(${lit ? 1 : 0.3})`, transition: 'opacity .08s, transform .12s' }} />
            })}
          </div>
        </div>
        <div style={{ width: 64, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,.45)', filter: 'blur(4px)', marginTop: -10, animation: 'dcShadow .45s cubic-bezier(.3,.6,.4,1) infinite alternate' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>{dice.done ? '¡Rotación sorteada!' : 'Tirando el dado…'}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{dice.done ? 'Preparando la tabla de semanas' : 'Repartiendo las zonas al azar'}</div>
        </div>
      </div>
    </div>
  )
}

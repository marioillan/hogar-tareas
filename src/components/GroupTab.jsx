import { useState } from 'react'
import { ini, onEnter } from '../lib/logic'

function AddRow({ placeholder, onAdd }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const add = async () => {
    if (!value.trim() || busy) return
    setBusy(true)
    if (await onAdd(value)) setValue('')
    setBusy(false)
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      <input className="input" style={{ minHeight: 44 }} placeholder={placeholder} aria-label={placeholder} maxLength={40}
        value={value} onChange={e => setValue(e.target.value)} onKeyDown={onEnter(add)} />
      <button className="btn btn-secondary" style={{ minHeight: 44, flex: 'none' }} disabled={busy} onClick={add}><i className="ph ph-plus" />Añadir</button>
    </div>
  )
}

export default function GroupTab({ ctx, actions, copyLabel, onCopy, onLogout }) {
  const { group, members, rooms, me, isAdmin, realAdmin, previewMember } = ctx
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'dcRise .35s ease both' }}>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 24 }}>Grupo</h3>
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{members.length} integrantes · {rooms.length} zonas de limpieza</p>
      </div>

      <div className="card" style={{ padding: 18, gap: 12, boxShadow: 'var(--shadow-sm)' }}>
        <span className="card-kicker">Código de invitación</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 30, fontWeight: 500, letterSpacing: '.3em', color: 'var(--color-accent-200)' }}>{group.code}</span>
          <button className="btn btn-secondary" onClick={onCopy}><i className="ph ph-copy" />{copyLabel}</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h6 className="text-muted" style={{ margin: '0 0 4px', fontSize: 11 }}>Integrantes</h6>
        {members.map(m => (
          <div key={m.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{ini(m.name)}</div>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{m.id === me.id ? `${m.name} (tú)` : m.name}</span>
            {m.id === group.admin_member_id && <span className="tag tag-accent" style={{ gap: 4 }}><i className="ph ph-crown" />admin</span>}
          </div>
        ))}
        {isAdmin && <AddRow placeholder="Añadir integrante…" onAdd={actions.addMember} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h6 className="text-muted" style={{ margin: '0 0 4px', fontSize: 11 }}>Zonas de limpieza</h6>
        {rooms.map(r => (
          <div key={r.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '6px 6px 6px 12px', minHeight: 44, animation: 'dcRise .25s ease both' }}>
            <i className="ph ph-broom" style={{ color: 'var(--color-neutral-500)' }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{r.name}</span>
            {isAdmin && rooms.length > 1 && (
              <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }} onClick={() => actions.removeRoom(r)} aria-label={`Quitar zona ${r.name}`}><i className="ph ph-x" /></button>
            )}
          </div>
        ))}
        {isAdmin && <AddRow placeholder="Añadir zona…" onAdd={actions.addRoom} />}
      </div>

      {realAdmin && !previewMember && (
        <div className="card" style={{ padding: '14px 16px', gap: 8, boxShadow: 'var(--shadow-sm)' }}>
          <span className="card-kicker">Vista previa</span>
          <p className="text-muted" style={{ margin: 0, fontSize: 13, textWrap: 'pretty' }}>Mira cómo ven la app los integrantes que no son administradores.</p>
          <button className="btn btn-secondary" style={{ minHeight: 44, alignSelf: 'flex-start' }} onClick={actions.togglePreview}><i className="ph ph-eye" />Ver como integrante</button>
        </div>
      )}

      <button className="btn btn-secondary" style={{ minHeight: 44, alignSelf: 'flex-start' }} onClick={onLogout}><i className="ph ph-sign-out" />Salir del grupo</button>
    </div>
  )
}

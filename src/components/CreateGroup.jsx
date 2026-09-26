import { useState } from 'react'
import { onEnter } from '../lib/logic'

const title = (h, sub) => (
  <div>
    <h2 style={{ fontSize: 26, margin: '0 0 6px' }}>{h}</h2>
    <p className="text-muted" style={{ margin: 0, fontSize: 14, textWrap: 'pretty' }}>{sub}</p>
  </div>
)

const stepStyle = { display: 'flex', flexDirection: 'column', gap: 18, animation: 'dcRise .35s ease both' }

function ListRow({ icon, name, onRemove }) {
  return (
    <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: '6px 6px 6px 12px', animation: 'dcRise .25s ease both' }}>
      <i className={`ph ph-${icon}`} style={{ color: 'var(--color-neutral-500)' }} />
      <span style={{ flex: 1, fontSize: 14, minWidth: 0, overflowWrap: 'anywhere' }}>{name}</span>
      <button className="btn btn-icon btn-ghost" style={{ width: 32, height: 32 }} onClick={onRemove} aria-label={`Quitar ${name}`}><i className="ph ph-x" /></button>
    </div>
  )
}

function AddRow({ placeholder, value, onChange, onAdd }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input className="input" style={{ minHeight: 44 }} placeholder={placeholder} maxLength={40} value={value}
        onChange={e => onChange(e.target.value)} onKeyDown={onEnter(onAdd)} aria-label={placeholder} />
      <button className="btn btn-secondary" style={{ minHeight: 44, flex: 'none' }} onClick={onAdd}><i className="ph ph-plus" />Añadir</button>
    </div>
  )
}

export default function CreateGroup({ onBack, onCreate, busy }) {
  const [step, setStep] = useState(1)
  const [groupName, setGroupName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [members, setMembers] = useState([])
  const [roomName, setRoomName] = useState('')
  const [rooms, setRooms] = useState(['Cocina', 'Baño', 'Salón'])
  const [err, setErr] = useState('')

  const addUnique = (list, set, value, reset, taken = []) => {
    const v = value.trim()
    if (!v) return
    if ([...list, ...taken].some(x => x.toLowerCase() === v.toLowerCase())) { setErr(`«${v}» ya está en la lista.`); return }
    setErr(''); set([...list, v]); reset('')
  }
  const addMember = () => addUnique(members, setMembers, memberName, setMemberName, [adminName.trim()])
  const addRoom = () => addUnique(rooms, setRooms, roomName, setRoomName)

  const back = () => { setErr(''); step > 1 ? setStep(step - 1) : onBack() }
  const next = () => { setErr(''); setStep(step + 1) }

  const submit = async () => {
    setErr('')
    try { await onCreate(groupName.trim(), adminName.trim(), members, rooms) }
    catch (e) { console.error(e); setErr('No se ha podido crear el grupo. Inténtalo de nuevo.') }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px 32px', gap: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-icon btn-secondary" onClick={back} aria-label="Atrás"><i className="ph ph-arrow-left" /></button>
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= step ? 'var(--color-accent)' : 'var(--color-neutral-800)', transition: 'background .35s' }} />
          ))}
        </div>
        <span className="text-muted" style={{ fontSize: 12 }}>Paso {step} de 3</span>
      </div>

      {step === 1 && (
        <div key="s1" style={stepStyle}>
          {title('Crea tu grupo', 'Quien crea el grupo es el administrador.')}
          <div className="field"><label htmlFor="g-name">Nombre del grupo</label>
            <input id="g-name" className="input" style={{ minHeight: 44 }} placeholder="Ej: Piso Calle Luna" maxLength={60} value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
          </div>
          <div className="field"><label htmlFor="a-name">Tu nombre</label>
            <input id="a-name" className="input" style={{ minHeight: 44 }} placeholder="Ej: Mario" maxLength={40} value={adminName} onChange={e => setAdminName(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ minHeight: 48 }} disabled={!groupName.trim() || !adminName.trim()} onClick={next}>Continuar<i className="ph ph-arrow-right" /></button>
        </div>
      )}

      {step === 2 && (
        <div key="s2" style={stepStyle}>
          {title('¿Quién vive en la casa?', 'Cada persona elegirá su nombre al entrar con el código.')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
              <i className="ph ph-crown" style={{ color: 'var(--color-accent)' }} />
              <span style={{ flex: 1, fontSize: 14 }}>{adminName}</span>
              <span className="tag tag-accent">admin · tú</span>
            </div>
            {members.map((n, i) => <ListRow key={n} icon="user" name={n} onRemove={() => setMembers(members.filter((_, j) => j !== i))} />)}
          </div>
          <AddRow placeholder="Nombre de la persona…" value={memberName} onChange={setMemberName} onAdd={addMember} />
          {err && <ErrorLine text={err} />}
          <button className="btn btn-primary" style={{ minHeight: 48 }} disabled={members.length < 1} onClick={next}>Continuar<i className="ph ph-arrow-right" /></button>
        </div>
      )}

      {step === 3 && (
        <div key="s3" style={stepStyle}>
          {title('Zonas a limpiar', 'Se reparten cada semana entre todos los integrantes.')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rooms.map((n, i) => <ListRow key={n} icon="broom" name={n} onRemove={() => setRooms(rooms.filter((_, j) => j !== i))} />)}
          </div>
          <AddRow placeholder="Ej: Terraza" value={roomName} onChange={setRoomName} onAdd={addRoom} />
          {err && <ErrorLine text={err} />}
          <button className="btn btn-primary" style={{ minHeight: 48 }} disabled={rooms.length < 1 || busy} onClick={submit}>
            <i className="ph ph-check" />{busy ? 'Creando…' : 'Crear grupo'}
          </button>
        </div>
      )}
    </div>
  )
}

export function ErrorLine({ text }) {
  return (
    <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--color-accent-300)', display: 'flex', gap: 6, alignItems: 'center', animation: 'dcRise .25s ease both' }}>
      <i className="ph ph-warning-circle" />{text}
    </p>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PeopleManager({ people, onRefresh, isAdmin }) {
  const [name,      setName]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  async function addPerson() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const { error } = await supabase.from('people').insert({
      name:        trimmed,
      order_index: people.length,
    })
    if (error) console.error(error)
    setName('')
    setSaving(false)
    onRefresh()
  }

  async function removePerson(id) {
    setDeleting(id)
    await supabase.from('people').delete().eq('id', id)
    setDeleting(null)
    setConfirmId(null)
    onRefresh()
  }

  async function swap(i, j) {
    if (i < 0 || j >= people.length) return
    const a = people[i], b = people[j]
    await Promise.all([
      supabase.from('people').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('people').update({ order_index: a.order_index }).eq('id', b.id),
    ])
    onRefresh()
  }

  return (
    <div className="people-manager">
      <h2 className="section-title">👥 Personas</h2>
      <p className="section-hint">
        El orden aquí define los turnos rotativos.<br/>
        La persona 1 va primero, luego la 2, y así sucesivamente.
      </p>

      <div className="people-list">
        {people.length === 0 && (
          <p className="empty-state">Aún no hay personas. ¡Añade la primera! 👇</p>
        )}

        {people.map((p, i) => (
          <div key={p.id}>
            <div className="person-row">
              <div className="person-badge">{i + 1}</div>
              <span className="person-row-name">
                {p.name}
                {p.is_admin && <span className="admin-badge">admin</span>}
              </span>
              {isAdmin && (
                <div className="row-actions">
                  <button
                    className="row-btn"
                    onClick={() => swap(i, i - 1)}
                    disabled={i === 0}
                    title="Subir"
                    aria-label={`Subir a ${p.name}`}
                  >▲</button>
                  <button
                    className="row-btn"
                    onClick={() => swap(i, i + 1)}
                    disabled={i === people.length - 1}
                    title="Bajar"
                    aria-label={`Bajar a ${p.name}`}
                  >▼</button>
                  <button
                    className="row-btn danger"
                    onClick={() => setConfirmId(confirmId === p.id ? null : p.id)}
                    disabled={deleting === p.id}
                    title="Eliminar"
                    aria-label={`Eliminar a ${p.name}`}
                  >✕</button>
                </div>
              )}
            </div>
            {confirmId === p.id && (
              <div className="confirm-row">
                <span>¿Eliminar a {p.name}? Sus tareas quedarán en el historial.</span>
                <button
                  className="confirm-no-btn"
                  onClick={() => setConfirmId(null)}
                >Cancelar</button>
                <button
                  className="confirm-yes-btn"
                  onClick={() => removePerson(p.id)}
                  disabled={deleting === p.id}
                >Eliminar</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin ? (
        <div className="add-row">
          <input
            className="add-input"
            type="text"
            placeholder="Nombre de la persona…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
            maxLength={40}
          />
          <button
            className="add-btn"
            onClick={addPerson}
            disabled={saving || !name.trim()}
          >
            {saving ? '…' : '+ Añadir'}
          </button>
        </div>
      ) : (
        <p className="admin-only-hint">🔒 Solo el administrador puede añadir o reordenar personas.</p>
      )}
    </div>
  )
}

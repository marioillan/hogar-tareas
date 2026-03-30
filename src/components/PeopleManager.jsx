import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PeopleManager({ people, onRefresh }) {
  const [name, setName]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [deleting, setDelete] = useState(null)

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
    if (!window.confirm('¿Eliminar esta persona? Sus tareas completadas quedarán registradas.')) return
    setDelete(id)
    await supabase.from('people').delete().eq('id', id)
    setDelete(null)
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
          <div className="person-row" key={p.id}>
            <div className="person-badge">{i + 1}</div>
            <span className="person-row-name">{p.name}</span>
            <div className="row-actions">
              <button
                className="row-btn"
                onClick={() => swap(i, i - 1)}
                disabled={i === 0}
                title="Subir"
              >▲</button>
              <button
                className="row-btn"
                onClick={() => swap(i, i + 1)}
                disabled={i === people.length - 1}
                title="Bajar"
              >▼</button>
              <button
                className="row-btn danger"
                onClick={() => removePerson(p.id)}
                disabled={deleting === p.id}
                title="Eliminar"
              >✕</button>
            </div>
          </div>
        ))}
      </div>

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
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_EMOJIS = ['🛋️', '🍳', '🛁']

export default function RoomsManager({ rooms, onRefresh }) {
  const [name, setName]     = useState('')
  const [emoji, setEmoji]   = useState('🏠')
  const [saving, setSaving] = useState(false)
  const [deleting, setDel]  = useState(null)

  async function addRoom() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const { error } = await supabase.from('rooms').insert({
      name:        trimmed,
      emoji:       emoji || '🏠',
      order_index: rooms.length,
    })
    if (error) console.error(error)
    setName('')
    setEmoji('🏠')
    setSaving(false)
    onRefresh()
  }

  async function removeRoom(id) {
    if (!window.confirm('¿Eliminar esta habitación? Las tareas completadas quedarán en el historial.')) return
    setDel(id)
    await supabase.from('rooms').delete().eq('id', id)
    setDel(null)
    onRefresh()
  }

  async function swap(i, j) {
    if (i < 0 || j >= rooms.length) return
    const a = rooms[i], b = rooms[j]
    await Promise.all([
      supabase.from('rooms').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('rooms').update({ order_index: a.order_index }).eq('id', b.id),
    ])
    onRefresh()
  }

  return (
    <div className="rooms-manager">
      <h2 className="section-title">🏠 Habitaciones</h2>
      <p className="section-hint">
        Añade las zonas del piso que hay que limpiar cada semana.<br />
        El orden determina cómo se reparten en la rotación.
      </p>

      <div className="people-list">
        {rooms.length === 0 && (
          <p className="empty-state">Sin habitaciones todavía. ¡Añade la primera! 👇</p>
        )}
        {rooms.map((r, i) => (
          <div className="person-row" key={r.id}>
            <span className="room-emoji-badge">{r.emoji}</span>
            <span className="person-row-name">{r.name}</span>
            <div className="row-actions">
              <button className="row-btn" onClick={() => swap(i, i - 1)} disabled={i === 0} title="Subir">▲</button>
              <button className="row-btn" onClick={() => swap(i, i + 1)} disabled={i === rooms.length - 1} title="Bajar">▼</button>
              <button className="row-btn danger" onClick={() => removeRoom(r.id)} disabled={deleting === r.id} title="Eliminar">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Emoji quick-pick */}
      <div className="emoji-picker">
        {DEFAULT_EMOJIS.map(e => (
          <button
            key={e}
            className={`emoji-opt ${emoji === e ? 'selected' : ''}`}
            onClick={() => setEmoji(e)}
          >
            {e}
          </button>
        ))}
        <input
          className="emoji-custom"
          type="text"
          value={emoji}
          onChange={ev => setEmoji(ev.target.value.slice(-2) || '🏠')}
          maxLength={2}
          title="Escribe o pega un emoji personalizado"
        />
      </div>

      <div className="add-row">
        <input
          className="add-input"
          type="text"
          placeholder="Nombre de la habitación…"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addRoom()}
          maxLength={40}
        />
        <button
          className="add-btn"
          onClick={addRoom}
          disabled={saving || !name.trim()}
        >
          {saving ? '…' : '+ Añadir'}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState('login')
  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: person } = await supabase
      .from('people')
      .select('id, name, password_hash')
      .ilike('name', name.trim())
      .maybeSingle()

    if (!person || !person.password_hash) {
      setError('Usuario no encontrado.')
      setLoading(false)
      return
    }

    const match = await bcrypt.compare(password, person.password_hash)
    if (!match) {
      setError('Contraseña incorrecta.')
      setLoading(false)
      return
    }

    onLogin(person.id)
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const nameTrimmed = name.trim()

    const { data: existing } = await supabase
      .from('people')
      .select('id, password_hash')
      .ilike('name', nameTrimmed)
      .maybeSingle()

    if (existing?.password_hash) {
      setError('Ese nombre ya está registrado.')
      setLoading(false)
      return
    }

    const hash = await bcrypt.hash(password, 10)

    if (existing) {
      // Nombre ya existe en la rotación → solo añadir contraseña
      await supabase.from('people').update({ password_hash: hash }).eq('id', existing.id)
      onLogin(existing.id)
    } else {
      // Nombre nuevo → crear persona y añadir contraseña
      const { data: last } = await supabase
        .from('people')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)
      const nextIndex = last?.length ? last[0].order_index + 1 : 0
      const { data: newPerson } = await supabase
        .from('people')
        .insert({ name: nameTrimmed, password_hash: hash, order_index: nextIndex })
        .select()
        .single()
      onLogin(newPerson.id)
    }

    setLoading(false)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">🏠 Tareas del Hogar</h1>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            Entrar
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null) }}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          <div className="login-field">
            <label>Nombre de usuario</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Mario"
              autoComplete="username"
              required
            />
          </div>
          <div className="login-field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading || !name.trim()}>
            {loading ? '…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Dashboard     from './components/Dashboard'
import PeopleManager from './components/PeopleManager'
import RoomsManager  from './components/RoomsManager'
import History       from './components/History'
import Login         from './components/Login'

const TABS = [
  { id: 'dashboard', label: '🏠 Hoy' },
  { id: 'history',   label: '📋 Historial' },
  { id: 'rooms',     label: '🛋️ Habitaciones' },
  { id: 'people',    label: '👥 Personas' },
]

function todayFormatted() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function App() {
  const [personId,    setPersonId]    = useState(() => localStorage.getItem('hogar_person_id'))
  const [tab,         setTab]         = useState('dashboard')
  const [people,      setPeople]      = useState([])
  const [rooms,       setRooms]       = useState([])
  const [completions, setCompletions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: ppl,  error: e1 },
        { data: rms,  error: e2 },
        { data: comp, error: e3 },
      ] = await Promise.all([
        supabase.from('people').select('*').order('order_index', { ascending: true }),
        supabase.from('rooms').select('*').order('order_index', { ascending: true }),
        supabase
          .from('completions')
          .select('*, people(name), rooms(name, emoji)')
          .order('completed_at', { ascending: false })
          .limit(200),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      setPeople(ppl ?? [])
      setRooms(rms ?? [])
      setCompletions(comp ?? [])
    } catch (err) {
      console.error(err)
      setError('Error al conectar con la base de datos. Revisa las variables de entorno.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (personId) fetchData()
    else setLoading(false)
  }, [personId, fetchData])

  function handleLogin(id) {
    localStorage.setItem('hogar_person_id', id)
    setPersonId(id)
  }

  function handleLogout() {
    localStorage.removeItem('hogar_person_id')
    setPersonId(null)
  }

  if (!personId) return <Login onLogin={handleLogin} />

  const currentPerson = people.find(p => p.id === personId) ?? null

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>Tareas del Hogar</h1>
          <div className="header-right">
            <span className="header-date">{todayFormatted()}</span>
            <div className="header-user">
              <span className="header-username">{currentPerson?.name ?? '…'}</span>
              <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">↩</button>
            </div>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {error ? (
          <div style={{ color: 'var(--danger)', padding: '20px', lineHeight: 1.6 }}>
            ⚠️ {error}
          </div>
        ) : loading ? (
          <div className="loading">Cargando…</div>
        ) : (
          <>
            {tab === 'dashboard' && (
              <Dashboard
                people={people}
                rooms={rooms}
                completions={completions}
                currentPerson={currentPerson}
                onRefresh={fetchData}
              />
            )}
            {tab === 'history' && (
              <History completions={completions} rooms={rooms} />
            )}
            {tab === 'rooms' && (
              <RoomsManager rooms={rooms} onRefresh={fetchData} />
            )}
            {tab === 'people' && (
              <PeopleManager people={people} onRefresh={fetchData} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

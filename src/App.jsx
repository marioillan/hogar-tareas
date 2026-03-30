import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [personId,      setPersonId]      = useState(() => localStorage.getItem('hogar_person_id'))
  const [tab,           setTab]           = useState('dashboard')
  const [people,        setPeople]        = useState([])
  const [rooms,         setRooms]         = useState([])
  const [completions,   setCompletions]   = useState([])
  const [absenceVotes,  setAbsenceVotes]  = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 14)
      const cutoffStr = cutoff.toISOString().split('T')[0]

      const [
        { data: ppl,  error: e1 },
        { data: rms,  error: e2 },
        { data: comp, error: e3 },
        { data: votes, error: e4 },
      ] = await Promise.all([
        supabase.from('people').select('*').order('order_index', { ascending: true }),
        supabase.from('rooms').select('*').order('order_index', { ascending: true }),
        supabase
          .from('completions')
          .select('*, people(name), rooms(name, emoji)')
          .order('completed_at', { ascending: false })
          .limit(200),
        supabase.from('absence_votes').select('*').gte('due_date', cutoffStr),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4
      setPeople(ppl ?? [])
      setRooms(rms ?? [])
      setCompletions(comp ?? [])
      setAbsenceVotes(votes ?? [])
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

  // Refs para tener siempre los datos más recientes en el listener de Realtime
  const peopleRef   = useRef(people)
  const roomsRef    = useRef(rooms)
  const personIdRef = useRef(personId)
  useEffect(() => { peopleRef.current   = people   }, [people])
  useEffect(() => { roomsRef.current    = rooms    }, [rooms])
  useEffect(() => { personIdRef.current = personId }, [personId])

  // Escuchar inserciones en completions y notificar a los demás
  useEffect(() => {
    if (!personId) return

    const channel = supabase
      .channel('completions-notify')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completions' }, payload => {
        const c = payload.new

        // No notificar al que acaba de marcar la tarea
        if (c.person_id === personIdRef.current) return
        if (Notification.permission !== 'granted') return

        const person = peopleRef.current.find(p => p.id === c.person_id)
        const name   = person?.name ?? 'Alguien'

        let title, body
        if (c.task_type === 'dishwasher') {
          title = '🍽️ Lavavajillas recogido'
          body  = `${name} ha recogido el lavavajillas`
        } else if (c.task_type === 'room') {
          const room = roomsRef.current.find(r => r.id === c.room_id)
          title = `${room?.emoji ?? '🏠'} Habitación limpiada`
          body  = `${name} ha limpiado ${room?.name ?? 'una habitación'}`
        }

        if (title) new Notification(title, { body, icon: '/favicon.ico' })
        fetchData()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
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
                absenceVotes={absenceVotes}
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

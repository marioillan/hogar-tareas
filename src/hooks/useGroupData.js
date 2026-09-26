import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchGroupData } from '../lib/api'

const TABLES = ['members', 'rooms', 'dish_log', 'dish_skips', 'rotations', 'room_done']

/**
 * Carga todos los datos de un grupo y los mantiene al día con Supabase Realtime.
 * onRemoteInsert(table, row) se llama con cada inserción (para notificaciones).
 */
export function useGroupData(groupId, onRemoteInsert) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const reqId = useRef(0)
  const timer = useRef(null)
  const onInsertRef = useRef(onRemoteInsert)
  useEffect(() => { onInsertRef.current = onRemoteInsert }, [onRemoteInsert])

  const refresh = useCallback(async () => {
    if (!groupId) return
    const id = ++reqId.current
    try {
      const d = await fetchGroupData(groupId)
      if (id === reqId.current) { setData(d); setError(null) }
    } catch (err) {
      console.error(err)
      if (id === reqId.current) setError('No se ha podido conectar con la base de datos.')
    }
  }, [groupId])

  useEffect(() => {
    setData(null)
    if (!groupId) return
    refresh()

    // Agrupa ráfagas de eventos en una sola recarga
    const schedule = () => { clearTimeout(timer.current); timer.current = setTimeout(refresh, 150) }
    const filter = `group_id=eq.${groupId}`
    // Tema único por montaje: supabase reutiliza canales con el mismo nombre y
    // removeChannel es asíncrono (en StrictMode se montaría dos veces el mismo)
    let channel = supabase.channel(`hogar-${groupId}-${Math.random().toString(36).slice(2, 8)}`)
    for (const table of TABLES) {
      channel = channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, p => { onInsertRef.current?.(table, p.new); schedule() })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, schedule)
        // Los DELETE no admiten filtro en Realtime: recargamos siempre
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, schedule)
    }
    channel.subscribe()

    // Al volver a la app (móvil en segundo plano) refrescamos por si se perdieron eventos
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [groupId, refresh])

  return { data, error, refresh }
}

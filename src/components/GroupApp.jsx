import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import * as api from '../lib/api'
import { useGroupData } from '../hooks/useGroupData'
import { dishInfo, assignWeek, ini, shuffleArr, todayMadrid, monday } from '../lib/logic'
import TodayTab from './TodayTab'
import CleaningTab from './CleaningTab'
import HistoryTab from './HistoryTab'
import GroupTab from './GroupTab'
import { Dice } from './Overlays'

const TABS = [
  ['hoy', 'Hoy', 'fork-knife'],
  ['tareas', 'Limpieza', 'broom'],
  ['historial', 'Historial', 'clock-counter-clockwise'],
  ['grupo', 'Grupo', 'users-three'],
]
const UPCOMING = 4

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try { new Notification(title, { body, icon: '/icon.svg' }) } catch { /* algunos móviles solo permiten notificar vía SW */ }
}

export default function GroupApp({ session, ui, onLogout, copyLabel, onCopy }) {
  const { groupId, memberId } = session
  const [tab, setTab] = useState('hoy')
  const [preview, setPreview] = useState(false)
  const [manual, setManual] = useState(null)
  const [shuffle, setShuffle] = useState(null)
  const [dice, setDice] = useState(null)
  const shTimer = useRef(null)
  const namesRef = useRef({ members: [], rooms: [] })

  const onRemoteInsert = useCallback((table, row) => {
    const { members, rooms } = namesRef.current
    const name = id => members.find(m => m.id === id)?.name ?? 'Alguien'
    if (table === 'dish_log' && row.marked_by !== memberId) {
      notify('Lavavajillas recogido', `${name(row.person_id)} ha sacado el lavavajillas`)
    } else if (table === 'room_done' && row.done_by !== memberId) {
      const room = rooms.find(r => r.id === row.room_id)?.name ?? 'una zona'
      notify(`${room} limpia`, `${name(row.done_by)} ha limpiado ${room.toLowerCase()}`)
    }
  }, [memberId])

  const { data, error, refresh } = useGroupData(groupId, onRemoteInsert)

  useEffect(() => { if (data) namesRef.current = { members: data.members, rooms: data.rooms } }, [data])
  useEffect(() => () => clearInterval(shTimer.current), [])

  // Si el grupo o el integrante ya no existen, se cierra la sesión
  const me = data?.members.find(m => m.id === memberId)
  useEffect(() => {
    if (data && (!data.group || !me)) { ui.toast('Tu sesión ya no es válida'); onLogout() }
  }, [data, me, ui, onLogout])

  const ctx = useMemo(() => {
    if (!data?.group || !me) return null
    const { group, members, rooms, log, skips, roomDone } = data
    const rotation = data.rotation ?? { status: 'waiting', mode: null, order_ids: [], week: 0, started_at: null }
    const nm = id => members.find(m => m.id === id)?.name ?? '—'
    const realAdmin = group.admin_member_id === me.id
    const previewMember = realAdmin && preview
    const isAdmin = realAdmin && !previewMember
    const skipIds = skips.map(s => s.member_id).filter(id => members.some(m => m.id === id))
    const dish = dishInfo(members, log, skipIds, UPCOMING)
    const lastE = log[log.length - 1] ?? null
    const doneToday = !!lastE && lastE.done_date === todayMadrid()

    const active = rotation.status === 'active'
    const shuffling = !!shuffle
    const order = shuffling ? shuffle : rotation.order_ids.filter(id => members.some(m => m.id === id))
    const week = active ? rotation.week : 0
    const doneSet = new Set(roomDone.map(r => `${r.week}:${r.room_id}`))
    const baseMon = monday(rotation.started_at ? new Date(rotation.started_at).getTime() : Date.now())
    const wDate = w => { const x = new Date(baseMon); x.setDate(x.getDate() + 7 * w); return x }
    const current = assignWeek(rooms, order, week)
    const weekRooms = order.length ? rooms.map((r, i) => ({ room: r, pid: current[i], mine: current[i] === me.id, done: doneSet.has(`${week}:${r.id}`) })) : []

    return {
      group, members, rooms, log, me, nm, realAdmin, previewMember, isAdmin, skipIds, dish, lastE, doneToday,
      rotation, active, shuffling, order, week, wDate, weekRooms,
      joined: members.filter(m => m.joined).length,
    }
  }, [data, me, preview, shuffle])

  if (error && !data) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <p className="text-muted" style={{ margin: 0 }}>{error}</p>
          <button className="btn btn-secondary" onClick={refresh}><i className="ph ph-arrow-clockwise" />Reintentar</button>
        </div>
      </div>
    )
  }
  if (!ctx) {
    return <div role="status" className="text-muted" style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: 14 }}>Cargando…</div>
  }

  const { group, members, rooms, nm, dish, rotation } = ctx

  // Ejecuta una mutación, refresca y avisa si falla
  const run = async (fn, errMsg = 'No se ha podido guardar. Revisa tu conexión.') => {
    try { await fn(); await refresh(); return true }
    catch (e) { console.error(e); ui.toast(errMsg); refresh(); return false }
  }

  const actions = {
    markDish: () => {
      const next = dish.next, mine = next.id === me.id
      ui.confirm({
        title: mine ? '¿Has sacado el lavavajillas?' : `¿Lo ha sacado ${next.name}?`,
        body: 'Se guardará en el historial y ya no se podrá marcar otra vez hoy.',
        ok: 'Sí, lo he sacado', icon: 'ph ph-check',
        onOk: async () => {
          try {
            await ui.withLoading('Recogiendo el lavavajillas…', 'Guardando platos y vasos', async () => {
              await api.markDish(group.id, next.id, me.id)
              await refresh()
            })
            ui.burst(mine ? '¡Hecho! Buen trabajo.' : `Registrado para ${next.name}`)
          } catch (e) {
            refresh()
            if (e.code === api.UNIQUE_VIOLATION) ui.toast('Hoy ya se ha registrado el lavavajillas')
            else { console.error(e); ui.toast('No se ha podido guardar. Revisa tu conexión.') }
          }
        },
      })
    },
    skipDish: () => {
      const next = dish.next
      ui.confirm({
        title: `¿Saltar a ${next.name}?`,
        body: `${next.name} no está hoy. El turno pasa a la siguiente persona y ${next.name} lo recuperará en los próximos turnos.`,
        ok: 'Sí, saltar', icon: 'ph ph-skip-forward',
        onOk: async () => {
          if (await run(() => api.skipDish(group.id, next.id, me.id))) ui.toast(`${next.name} saltado. Lo recuperará en los próximos turnos.`)
        },
      })
    },
    undoSkip: id => run(() => api.undoSkip(group.id, id)),
    undoLast: async () => {
      if (await run(() => api.deleteDishLog(ctx.lastE.id))) ui.toast('Último registro deshecho')
    },

    toggleRoom: w => {
      const { room, pid, mine, done } = w, week = ctx.week
      if (done) return run(() => api.unmarkRoom(group.id, week, room.id))
      const person = mine ? null : nm(pid)
      ui.confirm({
        title: person ? `¿${person} ha limpiado ${room.name}?` : `¿Has limpiado ${room.name}?`,
        body: 'La zona quedará marcada como hecha esta semana.',
        ok: 'Sí, está limpia', icon: 'ph ph-broom',
        onOk: async () => {
          const ok = await ui.withLoading(`Limpiando ${room.name.toLowerCase()}…`, 'Dejándolo todo reluciente',
            () => run(() => api.markRoom(group.id, week, room.id, me.id)))
          if (ok) ui.burst(`${room.name} limpia`)
        },
      })
    },
    startRandom: () => {
      const ids = members.map(m => m.id)
      let t = 0, rot = 0
      clearInterval(shTimer.current)
      setShuffle(shuffleArr(ids))
      setDice({ face: 1, rot: 0, done: false })
      shTimer.current = setInterval(() => {
        t++
        if (t < 18) {
          rot += 70 + Math.random() * 60
          setShuffle(shuffleArr(ids))
          setDice({ face: 1 + Math.floor(Math.random() * 6), rot, done: false })
        } else if (t === 18) {
          rot = Math.round((rot + 90) / 360) * 360
          setDice({ face: 1 + Math.floor(Math.random() * 6), rot, done: true })
        } else if (t >= 26) {
          clearInterval(shTimer.current)
          const order = shuffleArr(ids)
          run(() => api.startRotation(group.id, 'aleatoria', order)).then(ok => {
            setShuffle(null); setDice(null)
            if (ok) ui.toast('Rotación aleatoria creada')
          })
        }
      }, 90)
    },
    openManual: () => setManual(rotation.order_ids.length === members.length ? [...rotation.order_ids] : members.map(m => m.id)),
    moveManual: (i, d) => setManual(o => { const a = [...o]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a }),
    cancelManual: () => setManual(null),
    confirmManual: async () => {
      if (await run(() => api.startRotation(group.id, 'manual', manual))) { setManual(null); ui.toast('Rotación manual guardada') }
    },
    nextWeek: async () => {
      if (await run(() => api.setWeek(group.id, rotation.week + 1))) ui.toast('Nueva semana: la rotación avanza')
    },
    resetRot: () => run(() => api.resetRotation(group.id)),

    addMember: async name => {
      const n = name.trim()
      if (!n) return false
      if (members.some(m => m.name.toLowerCase() === n.toLowerCase())) { ui.toast(`Ya hay alguien llamado ${n}`); return false }
      const maxIdx = Math.max(-1, ...members.map(m => m.order_index))
      return run(() => api.addMember(group.id, n, maxIdx + 1, data.rotation))
    },
    addRoom: async name => {
      const n = name.trim()
      if (!n) return false
      const maxIdx = Math.max(-1, ...rooms.map(r => r.order_index))
      const ok = await run(() => api.addRoom(group.id, n, maxIdx + 1))
      if (ok) ui.toast(`Zona «${n}» añadida a la rotación`)
      return ok
    },
    removeRoom: async r => {
      if (await run(() => api.removeRoom(r.id))) ui.toast(`Zona «${r.name}» eliminada`)
    },
    togglePreview: () => {
      ui.toast(ctx.previewMember ? 'Vuelves a la vista de administrador' : 'Viendo la app como integrante')
      setPreview(p => !p); setTab('hoy'); setManual(null)
    },
    goTab: id => { setTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) },
  }

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const props = { ctx, actions }

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>{today[0].toUpperCase() + today.slice(1)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minWidth: 0 }}>
          <span className="text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</span>
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, boxShadow: '0 0 0 1px var(--color-accent-700)' }}>{ini(me.name)}</div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '12px 20px 104px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {ctx.previewMember && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-900)', boxShadow: '0 0 0 1px var(--color-accent-700)', fontSize: 13, color: 'var(--color-accent-200)', animation: 'dcRise .3s ease both' }}>
            <i className="ph ph-eye" /><span style={{ flex: 1 }}>Vista de integrante (sin permisos de admin)</span>
            <button className="btn btn-ghost" style={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={actions.togglePreview}>Volver a admin</button>
          </div>
        )}
        {tab === 'hoy' && <TodayTab {...props} />}
        {tab === 'tareas' && <CleaningTab {...props} manual={manual} />}
        {tab === 'historial' && <HistoryTab {...props} />}
        {tab === 'grupo' && <GroupTab {...props} copyLabel={copyLabel} onCopy={() => onCopy(group.code)} onLogout={onLogout} />}
      </main>

      <nav aria-label="Secciones" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, display: 'flex', padding: '6px 8px calc(8px + env(safe-area-inset-bottom))', background: 'color-mix(in srgb, var(--color-bg) 86%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: '0 -1px 0 var(--color-neutral-900)', zIndex: 10 }}>
        {TABS.map(([id, label, icon]) => {
          const on = tab === id
          return (
            <button key={id} onClick={() => actions.goTab(id)} aria-current={on ? 'page' : undefined}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minHeight: 52, justifyContent: 'center', border: 0, background: 'transparent', cursor: 'pointer', color: on ? 'var(--color-accent)' : 'var(--color-neutral-500)', font: 'inherit', fontSize: 11, position: 'relative', transition: 'color .2s' }}>
              <span style={{ position: 'absolute', top: 0, width: 18, height: 2, borderRadius: 2, background: 'var(--color-accent)', boxShadow: '0 0 10px var(--color-accent)', opacity: on ? 1 : 0, transition: 'opacity .25s' }} />
              <i className={on ? `ph-fill ph-${icon}` : `ph ph-${icon}`} style={{ fontSize: 22 }} />{label}
            </button>
          )
        })}
      </nav>
      <Dice dice={dice} />
    </>
  )
}

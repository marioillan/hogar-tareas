// Utilidades y lógica de turnos (portada del prototipo de design_handoff_tareas_hogar)

export const ini = n => (n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

export const shuffleArr = a => {
  a = [...a]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const monday = ts => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return d
}

export const rel = ts => {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'ahora mismo'
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

export const fmtDay = ts => new Date(ts).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtTime = ts => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
export const fmtShort = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

// Fecha de hoy en Madrid (YYYY-MM-DD), igual que el default de dish_log.done_date
export const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })

export const onEnter = fn => e => { if (e.key === 'Enter') fn() }

export const delay = ms => new Promise(r => setTimeout(r, ms))

/**
 * Turno equilibrado del lavavajillas.
 * members: ordenados por order_index · log: dish_log ascendente por done_at · skip: ids saltados
 */
export function dishInfo(members, log, skip, upN) {
  const counts = {}, last = {}
  members.forEach(m => { counts[m.id] = 0; last[m.id] = -1 })
  log.forEach((e, i) => { if (e.person_id in counts) { counts[e.person_id]++; last[e.person_id] = i } })
  const pick = (c, l, excl) => {
    const pool = members.filter(m => !excl.includes(m.id))
    const p = pool.length ? pool : members
    return [...p].sort((a, b) => c[a.id] - c[b.id] || l[a.id] - l[b.id] || members.indexOf(a) - members.indexOf(b))[0]
  }
  if (!members.length) return { counts, next: null, up: [] }
  const next = pick(counts, last, skip)
  const c = { ...counts }, l = { ...last }, up = []
  let cur = next, idx = log.length
  for (let k = 0; k < upN; k++) { c[cur.id]++; l[cur.id] = ++idx; cur = pick(c, l, []); up.push(cur) }
  return { counts, next, up }
}

/** Zona i en semana w → order[(i + w) % n] */
export const assignWeek = (rooms, order, w) => order.length ? rooms.map((_, i) => order[(i + w) % order.length]) : []

export const DICE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }

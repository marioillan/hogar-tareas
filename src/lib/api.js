import { supabase } from './supabase'

const ok = ({ data, error }) => { if (error) throw error; return data }

export const UNIQUE_VIOLATION = '23505'

// ── Sesión local ─────────────────────────────────────────────
const SESSION_KEY = 'hogar_session'
export const loadSession = () => {
  try { const s = JSON.parse(localStorage.getItem(SESSION_KEY)); return s?.groupId && s?.memberId ? s : null } catch { return null }
}
export const saveSession = s => {
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY) } catch { /* sin almacenamiento */ }
}

// ── Grupos ───────────────────────────────────────────────────
export async function createGroup(groupName, adminName, members, rooms) {
  const rows = ok(await supabase.rpc('create_group', {
    p_group_name: groupName, p_admin_name: adminName, p_members: members, p_rooms: rooms,
  }))
  const r = Array.isArray(rows) ? rows[0] : rows
  return { groupId: r.group_id, code: r.code, adminId: r.admin_id }
}

export async function findGroupByCode(code) {
  return ok(await supabase.from('groups').select('*').eq('code', code).maybeSingle())
}

export async function fetchMembers(groupId) {
  return ok(await supabase.from('members').select('*').eq('group_id', groupId).order('order_index'))
}

export async function joinAs(memberId) {
  ok(await supabase.from('members').update({ joined: true, joined_at: new Date().toISOString() }).eq('id', memberId).eq('joined', false))
}

export async function fetchGroupData(groupId) {
  const [group, members, rooms, log, skips, rotation, roomDone] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).maybeSingle(),
    supabase.from('members').select('*').eq('group_id', groupId).order('order_index'),
    supabase.from('rooms').select('*').eq('group_id', groupId).order('order_index'),
    supabase.from('dish_log').select('*').eq('group_id', groupId).order('done_at'),
    supabase.from('dish_skips').select('*').eq('group_id', groupId).order('created_at'),
    supabase.from('rotations').select('*').eq('group_id', groupId).maybeSingle(),
    supabase.from('room_done').select('*').eq('group_id', groupId),
  ]).then(rs => rs.map(ok))
  return { group, members, rooms, log, skips, rotation, roomDone }
}

// ── Integrantes y zonas ──────────────────────────────────────
export async function addMember(groupId, name, orderIndex, rotation) {
  const m = ok(await supabase.from('members').insert({ group_id: groupId, name, order_index: orderIndex }).select().single())
  if (rotation?.status === 'active') {
    ok(await supabase.from('rotations').update({ order_ids: [...rotation.order_ids, m.id], updated_at: new Date().toISOString() }).eq('group_id', groupId))
  }
  return m
}

export async function addRoom(groupId, name, orderIndex) {
  ok(await supabase.from('rooms').insert({ group_id: groupId, name, order_index: orderIndex }))
}

export async function removeRoom(roomId) {
  ok(await supabase.from('rooms').delete().eq('id', roomId))
}

// ── Lavavajillas ─────────────────────────────────────────────
export async function markDish(groupId, personId, markedBy) {
  return ok(await supabase.rpc('mark_dish', { p_group: groupId, p_person: personId, p_marked_by: markedBy }))
}

export async function skipDish(groupId, memberId, createdBy) {
  ok(await supabase.from('dish_skips').upsert({ group_id: groupId, member_id: memberId, created_by: createdBy }))
}

export async function undoSkip(groupId, memberId) {
  ok(await supabase.from('dish_skips').delete().eq('group_id', groupId).eq('member_id', memberId))
}

export async function deleteDishLog(id) {
  ok(await supabase.from('dish_log').delete().eq('id', id))
}

// ── Rotación semanal ─────────────────────────────────────────
export async function startRotation(groupId, mode, orderIds) {
  ok(await supabase.from('room_done').delete().eq('group_id', groupId))
  const now = new Date().toISOString()
  ok(await supabase.from('rotations').upsert({
    group_id: groupId, status: 'active', mode, order_ids: orderIds, week: 0, started_at: now, updated_at: now,
  }))
}

export async function resetRotation(groupId) {
  ok(await supabase.from('room_done').delete().eq('group_id', groupId))
  ok(await supabase.from('rotations').upsert({
    group_id: groupId, status: 'waiting', mode: null, order_ids: [], week: 0, started_at: null, updated_at: new Date().toISOString(),
  }))
}

export async function setWeek(groupId, week) {
  ok(await supabase.from('rotations').update({ week, updated_at: new Date().toISOString() }).eq('group_id', groupId))
}

export async function markRoom(groupId, week, roomId, doneBy) {
  ok(await supabase.from('room_done').insert({ group_id: groupId, week, room_id: roomId, done_by: doneBy }))
}

export async function unmarkRoom(groupId, week, roomId) {
  ok(await supabase.from('room_done').delete().eq('group_id', groupId).eq('week', week).eq('room_id', roomId))
}

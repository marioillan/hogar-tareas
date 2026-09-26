import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import * as api from './lib/api'
import { delay } from './lib/logic'
import Welcome from './components/Welcome'
import CreateGroup from './components/CreateGroup'
import GroupCreated from './components/GroupCreated'
import JoinGroup from './components/JoinGroup'
import PickMember from './components/PickMember'
import GroupApp from './components/GroupApp'
import { Confirm, Loading, Burst, Toast } from './components/Overlays'

export default function App() {
  const [session, setSession] = useState(api.loadSession)
  const [screen, setScreen] = useState(() => (api.loadSession() ? 'app' : 'welcome'))
  const [created, setCreated] = useState(null)       // { groupName, code }
  const [pick, setPick] = useState(null)             // { group, members }
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Capas globales: confirmación, carga, check animado y avisos
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(null)
  const [burst, setBurst] = useState(null)
  const [toast, setToast] = useState(null)
  const timers = useRef({})
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const later = (key, fn, ms) => { clearTimeout(timers.current[key]); timers.current[key] = setTimeout(fn, ms) }

  const ui = useMemo(() => ({
    toast: msg => { setToast(msg); later('toast', () => setToast(null), 2600) },
    burst: text => { setBurst(text); later('burst', () => setBurst(null), 1300) },
    confirm: c => setConfirm({ ...c, onOk: () => { setConfirm(null); c.onOk() } }),
    // Muestra la escoba al menos 1,6 s mientras se guarda
    withLoading: async (text, sub, work) => {
      setLoading({ text, sub })
      const [r] = await Promise.all([work().then(v => ({ v }), e => ({ e })), delay(1600)])
      setLoading(null)
      if (r.e) throw r.e
      return r.v
    },
  }), [])

  const closeConfirm = useCallback(() => setConfirm(null), [])

  const copyCode = code => {
    try { navigator.clipboard?.writeText(code) } catch { /* sin portapapeles */ }
    setCopied(true); later('copy', () => setCopied(false), 1600)
  }

  const enter = s => { api.saveSession(s); setSession(s); setScreen('app'); window.scrollTo(0, 0) }

  const logout = useCallback(() => {
    api.saveSession(null); setSession(null); setScreen('welcome'); setPick(null)
  }, [])

  const createGroup = async (groupName, adminName, members, rooms) => {
    setCreating(true)
    try {
      const r = await api.createGroup(groupName, adminName, members, rooms)
      api.saveSession({ groupId: r.groupId, memberId: r.adminId })
      setSession({ groupId: r.groupId, memberId: r.adminId })
      setCreated({ groupName, code: r.code })
      setScreen('created')
    } finally { setCreating(false) }
  }

  const findGroup = async code => {
    const group = await api.findGroupByCode(code)
    if (!group) return false
    const members = await api.fetchMembers(group.id)
    setPick({ group, members }); setScreen('pick')
    return true
  }

  const pickMember = async m => {
    try {
      await api.joinAs(m.id)
      enter({ groupId: pick.group.id, memberId: m.id })
      ui.toast(`Bienvenido a ${pick.group.name}`)
    } catch (e) {
      console.error(e); ui.toast('No se ha podido entrar. Inténtalo de nuevo.')
    }
  }

  const copyLabel = copied ? 'Copiado' : 'Copiar'

  return (
    <div className="app-bg">
      <div className="app-col">
        {screen === 'welcome' && <Welcome onCreate={() => setScreen('create')} onJoin={() => setScreen('join')} />}
        {screen === 'create' && <CreateGroup onBack={() => setScreen('welcome')} onCreate={createGroup} busy={creating} />}
        {screen === 'created' && created && (
          <GroupCreated groupName={created.groupName} code={created.code} copyLabel={copyLabel}
            onCopy={() => copyCode(created.code)} onEnter={() => enter(session)} />
        )}
        {screen === 'join' && <JoinGroup onBack={() => setScreen('welcome')} onSubmit={findGroup} />}
        {screen === 'pick' && pick && <PickMember group={pick.group} members={pick.members} onBack={() => setScreen('join')} onPick={pickMember} />}
        {screen === 'app' && session && (
          <GroupApp key={`${session.groupId}:${session.memberId}`} session={session} ui={ui} onLogout={logout} copyLabel={copyLabel} onCopy={copyCode} />
        )}
      </div>

      <Confirm confirm={confirm} onCancel={closeConfirm} />
      <Loading loading={loading} />
      <Burst text={burst} />
      <Toast msg={toast} />
    </div>
  )
}

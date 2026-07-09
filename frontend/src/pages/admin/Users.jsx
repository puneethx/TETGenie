import { useEffect, useState } from 'react'
import { listUsers, setSubscription } from '../../lib/users'
import PageHeader from '../../components/PageHeader'

export default function Users() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Uses the cached list if available (instant); refetches only if empty.
    listUsers().then(setUsers).catch((e) => setError(e.message || 'Failed to load users.'))
  }, [])

  async function refresh() {
    setRefreshing(true)
    setError('')
    try {
      setUsers(await listUsers({ force: true }))
    } catch (e) {
      setError(e.message || 'Failed to load users.')
    } finally {
      setRefreshing(false)
    }
  }

  async function toggle(u) {
    const next = u.subscription === 'premium' ? 'free' : 'premium'
    setSavingId(u.id)
    try {
      await setSubscription(u.id, next)
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, subscription: next } : x)))
    } catch (e) {
      setError(e.message || 'Update failed.')
    } finally {
      setSavingId(null)
    }
  }

  const filtered = (users || []).filter((u) => {
    const s = q.trim().toLowerCase()
    if (!s) return true
    return (
      (u.email || '').toLowerCase().includes(s) ||
      (u.phone || '').includes(s) ||
      (`${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().includes(s)
    )
  })

  const premiumCount = (users || []).filter((u) => u.subscription === 'premium').length

  return (
    <div className="page">
      <PageHeader
        title="Users"
        subtitle={users ? `${users.length} total · ${premiumCount} premium` : 'Loading…'}
        action={(
          <button className="btn btn-ghost" style={{ minHeight: 38, padding: '0 14px', flex: 'none' }} onClick={refresh} disabled={refreshing}>
            {refreshing ? <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /> : 'Refresh'}
          </button>
        )}
      />

      {error && <div className="auth-alert">{error}</div>}

      <input
        className="input mb-4"
        placeholder="Search by name, email or phone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {!users && !error && (
        <div className="center muted mt-6"><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /></div>
      )}

      <div className="stack gap-3">
        {filtered.map((u) => {
          const isPremium = u.subscription === 'premium'
          const isAdmin = u.role === 'admin'
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—'
          return (
            <div key={u.id} className="card row gap-3" style={{ justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700 }}>{name}</span>
                  {isAdmin && <span className="badge badge-admin">Admin</span>}
                  <span className={`badge ${isPremium ? 'badge-premium' : 'badge-free'}`}>
                    {isPremium ? '⭐ Premium' : 'Free'}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 'var(--fs-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </div>
                {u.phone && (
                  <a href={`https://wa.me/91${u.phone.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer"
                     className="muted" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                    📱 {u.phone}
                  </a>
                )}
              </div>
              {!isAdmin && (
                <button
                  className={`btn ${isPremium ? 'btn-ghost' : 'btn-gold'}`}
                  style={{ minHeight: 40, padding: '0 14px', flex: 'none' }}
                  onClick={() => toggle(u)}
                  disabled={savingId === u.id}
                >
                  {savingId === u.id ? <span className="spinner" /> : isPremium ? 'Make Free' : 'Make Premium'}
                </button>
              )}
            </div>
          )
        })}
        {users && filtered.length === 0 && <p className="muted center mt-4">No matching users.</p>}
      </div>
    </div>
  )
}

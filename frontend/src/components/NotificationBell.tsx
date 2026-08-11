import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getUser } from '../api'
import type { AppNotification } from '../types'

export default function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  async function load() {
    try {
      setItems(await api('/notifications'))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000) // light polling so new assignments show up
    return () => clearInterval(t)
  }, [])

  const unread = items.filter((i) => !i.is_read).length

  async function markRead(id: number) {
    await api(`/notifications/${id}/read`, { method: 'PUT' })
    load()
  }

  async function openTask(n: AppNotification) {
    if (!n.is_read) {
      try {
        await api(`/notifications/${n.notification_id}/read`, { method: 'PUT' })
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    const base = getUser()?.role === 'Manager' ? '/manager' : '/employee'
    nav(`${base}?task=${n.task_id}`)
    load()
  }

  return (
    <div className="bell">
      <button className="bell-btn" onClick={() => setOpen(!open)}>
        Notifications
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {open && (
        <div className="bell-list">
          {items.length === 0 && <div className="tiny muted pad">No notifications</div>}
          {items.map((n) => (
            <div key={n.notification_id} className={`bell-item ${n.is_read ? '' : 'unread'}`}>
              <button className="bell-msg" onClick={() => openTask(n)}>
                {n.message}
              </button>
              <div className="tiny muted">{n.created_at.slice(0, 16).replace('T', ' ')}</div>
              {!n.is_read && (
                <button className="link" onClick={() => markRead(n.notification_id)}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

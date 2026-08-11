import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, clearAuth, getUser } from '../api'
import type { Task } from '../types'
import NotificationBell from '../components/NotificationBell'

const FILTERS = ['All', 'Open', 'In progress', 'Done'] as const
type Filter = (typeof FILTERS)[number]

function filterGroup(t: Task): Filter {
  const a = t.assignments[0]
  if (a?.report) return 'Done'
  if (a?.status === 'In Progress' || a?.status === 'Finished') return 'In progress'
  return 'Open' // Accepted
}

export default function EmployeeDashboard() {
  const nav = useNavigate()
  const user = getUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState('')
  const [reportText, setReportText] = useState<Record<number, string>>({})
  const [filter, setFilter] = useState<Filter>('All')
  const [params] = useSearchParams()
  const focusId = Number(params.get('task')) || null
  const focusRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusId, tasks])

  async function load() {
    try {
      setTasks(await api('/tasks'))
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function act(taskId: number, action: string) {
    setError('')
    try {
      await api(`/tasks/${taskId}/${action}`, { method: 'PUT' })
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function sendReport(taskId: number) {
    setError('')
    try {
      await api(`/tasks/${taskId}/report`, {
        method: 'POST',
        body: JSON.stringify({ report: reportText[taskId] || '' }),
      })
      setReportText((s) => ({ ...s, [taskId]: '' }))
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function logout() {
    clearAuth()
    nav('/')
  }

  // New assignments (not yet accepted) live OUTSIDE My Tasks.
  const newAssignments = tasks.filter((t) => t.assignments[0]?.status === 'Assigned')
  const myTasks = tasks.filter((t) => t.assignments[0]?.status !== 'Assigned')
  const visible = myTasks.filter((t) => filter === 'All' || filterGroup(t) === filter)

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <strong>Team Member</strong> · {user?.full_name}
        </div>
        <div className="row">
          <NotificationBell />
          <button className="link" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      {newAssignments.length > 0 && (
        <>
          <h3 className="pad" style={{ marginTop: 20 }}>
            New Assignments
          </h3>
          <div className="grid">
            {newAssignments.map((t) => (
              <div
                key={t.task_id}
                ref={t.task_id === focusId ? focusRef : null}
                className={`card ${t.task_id === focusId ? 'highlight' : ''}`}
              >
                <div className="task-head">
                  <strong>{t.title}</strong>
                  <span className="new-badge">New</span>
                </div>
                <div className="task-meta">
                  {t.deadline && <span>📅 {t.deadline}</span>}
                  <span className={`prio-${t.priority}`}>{t.priority} priority</span>
                </div>
                {t.description && <p className="tiny">{t.description}</p>}
                <div className="actions">
                  <button className="primary" onClick={() => act(t.task_id, 'accept')}>
                    Accept Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="pad" style={{ marginTop: 20 }}>
        My Tasks
      </h3>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="tiny muted pad" style={{ marginTop: 12 }}>
          {myTasks.length === 0
            ? 'No tasks yet — accept a new assignment to get started.'
            : 'Nothing in this filter.'}
        </div>
      )}

      <div className="grid">
        {visible.map((t) => {
          const a = t.assignments[0]
          const status = a?.status
          const label = a?.report ? 'Done' : status === 'Accepted' ? 'Open' : status
          const cls = a?.report
            ? 's-Done'
            : status === 'Accepted'
              ? 's-Accepted'
              : `s-${status?.replace(/\s/g, '')}`
          return (
            <div
              key={t.task_id}
              ref={t.task_id === focusId ? focusRef : null}
              className={`card ${t.task_id === focusId ? 'highlight' : ''}`}
            >
              <div className="task-head">
                <strong>{t.title}</strong>
                <span className={`status ${cls}`}>{label}</span>
              </div>
              <div className="task-meta">
                {t.deadline && <span>📅 {t.deadline}</span>}
                <span className={`prio-${t.priority}`}>{t.priority} priority</span>
              </div>
              {t.description && <p className="tiny">{t.description}</p>}
              <div className="actions">
                {status === 'Accepted' && (
                  <button className="primary" onClick={() => act(t.task_id, 'progress')}>
                    Start Task
                  </button>
                )}
                {status === 'In Progress' && (
                  <button className="primary" onClick={() => act(t.task_id, 'finish')}>
                    Finish Task
                  </button>
                )}
                {status === 'Finished' && !a?.report && (
                  <div className="report-form">
                    <textarea
                      placeholder="Write your completion report..."
                      value={reportText[t.task_id] || ''}
                      onChange={(e) =>
                        setReportText((s) => ({ ...s, [t.task_id]: e.target.value }))
                      }
                    />
                    <button className="primary" onClick={() => sendReport(t.task_id)}>
                      Submit Report
                    </button>
                  </div>
                )}
                {status === 'Finished' && a?.report && (
                  <div className="tiny ok">Report submitted — task done ✓</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

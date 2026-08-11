import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearAuth, getUser } from '../api'
import type { Employee, ReportItem, Stats, Task } from '../types'
import NotificationBell from '../components/NotificationBell'

const FILTERS = ['All', 'Open', 'In progress', 'Done'] as const
type Filter = (typeof FILTERS)[number]

function assignmentGroup(a: { status: string; report: string | null }): Filter {
  if (a.report) return 'Done'
  if (a.status === 'In Progress' || a.status === 'Finished') return 'In progress'
  return 'Open' // Assigned or Accepted
}

export default function ManagerDashboard() {
  const nav = useNavigate()
  const user = getUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [deadline, setDeadline] = useState('')
  const [assignees, setAssignees] = useState<number[]>([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'tasks' | 'reports'>('tasks')
  const [filter, setFilter] = useState<Filter>('All')

  async function loadAll() {
    try {
      setTasks(await api('/tasks'))
      setEmployees(await api('/tasks/employees'))
      setReports(await api('/reports'))
      setStats(await api('/stats'))
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  function empName(id: number) {
    return employees.find((e) => e.user_id === id)?.full_name || `#${id}`
  }

  function toggleAssignee(id: number) {
    setAssignees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
  }

  async function createTask(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (assignees.length === 0) {
      setError('Pick at least one team member')
      return
    }
    try {
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          priority,
          deadline: deadline || null,
          assignee_ids: assignees,
        }),
      })
      setTitle('')
      setDescription('')
      setPriority('Medium')
      setDeadline('')
      setAssignees([])
      loadAll()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function logout() {
    clearAuth()
    nav('/')
  }

  const rows = tasks.flatMap((t) =>
    t.assignments.map((a, i) => ({ t, a, first: i === 0 })),
  )
  const visibleRows = rows.filter((r) => filter === 'All' || assignmentGroup(r.a) === filter)
  const maxDay = stats ? Math.max(1, ...stats.completed_per_day.map((d) => d.count)) : 1

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <strong>Manager</strong> · {user?.full_name}
        </div>
        <div className="row">
          <NotificationBell />
          <button className="link" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="tabs">
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>
          Tasks
        </button>
        <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>
          Reports
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {tab === 'tasks' && (
        <div className="cols">
          <section className="card">
            <h3>Create Task</h3>
            <form onSubmit={createTask}>
              <input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <label className="tiny muted">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <label className="tiny muted">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <label className="tiny muted">Assign to</label>
              <div className="checks">
                {employees.map((emp) => (
                  <label key={emp.user_id} className="check">
                    <input
                      type="checkbox"
                      checked={assignees.includes(emp.user_id)}
                      onChange={() => toggleAssignee(emp.user_id)}
                    />
                    {emp.full_name}
                  </label>
                ))}
                {employees.length === 0 && (
                  <div className="tiny muted">No team members have signed up yet.</div>
                )}
              </div>
              <button className="primary">Create &amp; Assign</button>
            </form>
          </section>

          <section className="card grow">
            <h3>All Tasks</h3>
            <div className="chips" style={{ padding: '0 0 12px' }}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {rows.length === 0 && <div className="tiny muted">No tasks yet.</div>}
            {rows.length > 0 && visibleRows.length === 0 && (
              <div className="tiny muted">Nothing in this filter.</div>
            )}
            {visibleRows.length > 0 && (
              <div className="table-wrap">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(({ t, a, first }) => {
                      const label = a.report ? 'Done' : a.status
                      const cls = a.report ? 's-Done' : `s-${a.status.replace(/\s/g, '')}`
                      return (
                        <tr key={a.assignment_id}>
                          <td>
                            {first ? (
                              <>
                                <strong>{t.title}</strong>
                                {t.description && (
                                  <div className="tiny muted">{t.description}</div>
                                )}
                              </>
                            ) : (
                              ''
                            )}
                          </td>
                          <td>{empName(a.employee_id)}</td>
                          <td>
                            <span className={`status ${cls}`}>{label}</span>
                          </td>
                          <td>
                            <span className={`tiny prio-${t.priority}`}>{t.priority}</span>
                          </td>
                          <td className="tiny muted">{t.deadline || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'reports' && stats && (
        <>
          <h3 className="pad" style={{ marginTop: 16 }}>
            How the team is tracking
          </h3>
          <div className="stat-grid">
            <div className="card stat-tile">
              <div className="stat-value">{stats.completion_rate}%</div>
              <div className="stat-label">Completion rate</div>
            </div>
            <div className="card stat-tile">
              <div className="stat-value">{stats.tasks_this_week}</div>
              <div className="stat-label">Tasks this week</div>
            </div>
            <div className="card stat-tile">
              <div className="stat-value">{stats.overdue}</div>
              <div className="stat-label">Overdue</div>
            </div>
            <div className="card stat-tile">
              <div className="stat-value">{stats.active_members}</div>
              <div className="stat-label">Active members</div>
            </div>
          </div>

          <section className="card chart-card">
            <h3>Tasks completed per day</h3>
            <div className="bars">
              {stats.completed_per_day.map((d) => (
                <div key={d.day} className="bar-col">
                  <div className="bar-tip">
                    {d.count} done · {d.day}
                  </div>
                  <div
                    className={`bar ${d.count === 0 ? 'zero' : ''}`}
                    style={{ height: `${d.count === 0 ? 2 : (d.count / maxDay) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="bar-labels">
              {stats.completed_per_day.map((d) => (
                <span key={d.day}>{d.day}</span>
              ))}
            </div>
          </section>

          <section className="card chart-card">
            <h3>Workload by member</h3>
            {stats.workload.length === 0 && (
              <div className="tiny muted">No team members yet.</div>
            )}
            {stats.workload.map((w) => (
              <div key={w.employee_id} className="meter-row">
                <div className="meter-name">{w.full_name}</div>
                <div className="meter-track">
                  <div
                    className="meter-fill"
                    style={{ width: `${w.total ? (w.done / w.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="meter-value">
                  {w.done}/{w.total}
                </div>
              </div>
            ))}
          </section>

          <section className="card chart-card">
            <h3>Submitted Reports</h3>
            {reports.length === 0 && <div className="tiny muted">No reports submitted yet.</div>}
            {reports.map((r) => (
              <div key={r.assignment_id} className="task">
                <div className="task-head">
                  <strong>{empName(r.employee_id)}</strong>
                  <span className="tiny muted">{r.report_sent_at?.slice(0, 10)}</span>
                </div>
                <div>{r.report}</div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

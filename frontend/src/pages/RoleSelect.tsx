import { useNavigate } from 'react-router-dom'

export default function RoleSelect() {
  const nav = useNavigate()
  return (
    <div className="center">
      <div className="card narrow">
        <h1>Task Management</h1>
        <p className="muted">Choose how you want to sign in.</p>
        <div className="role-grid">
          <button className="role-btn" onClick={() => nav('/login/manager')}>
            <span className="role-title">Manager</span>
            <span className="tiny muted">Create &amp; assign tasks, view reports</span>
          </button>
          <button className="role-btn" onClick={() => nav('/login/employee')}>
            <span className="role-title">Team Member</span>
            <span className="tiny muted">Accept, work on, and report tasks</span>
          </button>
        </div>
        <p className="tiny muted">
          This choice is only navigation — the server verifies your real role and permissions.
        </p>
      </div>
    </div>
  )
}

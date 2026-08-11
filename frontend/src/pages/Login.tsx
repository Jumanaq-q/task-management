import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, setAuth } from '../api'

export default function Login() {
  const { role } = useParams()
  const nav = useNavigate()
  const isEmployee = role === 'employee'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(role === 'manager' ? 'manager@demo.com' : '')
  const [password, setPassword] = useState(role === 'manager' ? 'manager123' : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data =
        mode === 'signup'
          ? await api('/signup', {
              method: 'POST',
              body: JSON.stringify({ full_name: fullName, email, password }),
            })
          : await api('/login', {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            })
      setAuth(data)
      nav(data.role === 'Manager' ? '/manager' : '/employee')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <div className="card narrow">
        <button className="link" onClick={() => nav('/')}>
          &larr; Back
        </button>
        <h2>
          {role === 'manager' ? 'Manager' : 'Team Member'}{' '}
          {mode === 'signup' ? 'Sign Up' : 'Login'}
        </h2>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <input
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>
            {busy ? '...' : mode === 'signup' ? 'Create account' : 'Login'}
          </button>
        </form>

        {isEmployee && (
          <p className="tiny">
            {mode === 'login' ? 'New here? ' : 'Have an account? '}
            <button
              className="link"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
        )}
        {role === 'manager' && (
          <p className="tiny muted">Demo manager credentials are pre-filled.</p>
        )}
      </div>
    </div>
  )
}

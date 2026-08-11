const BASE =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

export interface AuthUser {
  role: string
  full_name: string
  user_id: number
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function getUser(): AuthUser | null {
  const s = localStorage.getItem('user')
  return s ? (JSON.parse(s) as AuthUser) : null
}

export function setAuth(data: any): void {
  localStorage.setItem('token', data.access_token)
  localStorage.setItem(
    'user',
    JSON.stringify({
      role: data.role,
      full_name: data.full_name,
      user_id: data.user_id,
    }),
  )
}

export function clearAuth(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export async function api(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const j = await res.json()
      detail = j.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

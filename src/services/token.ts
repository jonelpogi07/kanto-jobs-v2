const TOKEN_KEY = 'kanto-jobs:access-token'

export const AUTH_CHANGED_EVENT = 'kanto-jobs:auth-changed'

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
  },
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

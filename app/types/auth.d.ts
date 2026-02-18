declare module '#auth-utils' {
  interface User {
    id: string
    email?: string
    name?: string
    clientId?: string
    isLegacy?: boolean
  }

  interface UserSession {
    user: User
  }
}

export {}

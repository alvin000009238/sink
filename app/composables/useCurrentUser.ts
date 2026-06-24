import { useState } from '#imports'
import { useAuthToken } from '@/composables/useAuthToken'
import { useAPI } from '@/utils/api'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  picture: string | null
  role: 'student' | 'admin'
  status: 'active' | 'disabled'
}

export interface VerifyResponse {
  name: string
  url: string
  user: CurrentUser | null
}

export function useCurrentUser() {
  const user = useState<CurrentUser | null>('current-user', () => null)
  const verified = useState<boolean>('current-user-verified', () => false)
  const { removeToken } = useAuthToken()

  async function verify() {
    const response = await useAPI<VerifyResponse>('/api/verify')
    user.value = response.user
    verified.value = true
    return response
  }

  async function logout() {
    removeToken()
    try {
      await useAPI('/api/auth/logout', { method: 'POST' })
    }
    finally {
      user.value = null
      verified.value = false
    }
  }

  return {
    user,
    verified,
    verify,
    logout,
  }
}

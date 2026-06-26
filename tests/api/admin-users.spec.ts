import { describe, expect, it } from 'vitest'
import { createTestSession, fetch, fetchWithToken, postJsonWithToken } from '../utils'

describe.sequential('admin user management', () => {
  it('lets admins list, disable, and reactivate student users', async () => {
    const studentEmail = `student-users-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    const adminEmail = `admin-users-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    const studentToken = await createTestSession(studentEmail)
    const adminToken = await createTestSession(adminEmail, 'admin')
    const studentId = `test:${studentEmail}`
    const adminId = `test:${adminEmail}`

    expect((await fetchWithToken('/api/admin/users', studentToken)).status).toBe(403)

    const usersResponse = await fetchWithToken('/api/admin/users?limit=100', adminToken)
    expect(usersResponse.status).toBe(200)
    const users = await usersResponse.json() as {
      id: string
      email: string
      role: string
      status: string
      active_session_count: number
    }[]
    expect(users).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: studentId,
        email: studentEmail,
        role: 'student',
        status: 'active',
        active_session_count: expect.any(Number),
      }),
    ]))

    expect((await postJsonWithToken('/api/admin/user-status', studentToken, {
      id: studentId,
      status: 'disabled',
    })).status).toBe(403)

    const disabledResponse = await postJsonWithToken('/api/admin/user-status', adminToken, {
      id: studentId,
      status: 'disabled',
    })
    expect(disabledResponse.status).toBe(200)
    expect(await disabledResponse.json()).toEqual(expect.objectContaining({
      id: studentId,
      status: 'disabled',
    }))
    expect((await fetchWithToken('/api/verify', studentToken)).status).toBe(401)

    const reactivatedResponse = await postJsonWithToken('/api/admin/user-status', adminToken, {
      id: studentId,
      status: 'active',
    })
    expect(reactivatedResponse.status).toBe(200)
    expect(await reactivatedResponse.json()).toEqual(expect.objectContaining({
      id: studentId,
      status: 'active',
    }))
    expect((await fetchWithToken('/api/verify', studentToken)).status).toBe(200)

    expect((await postJsonWithToken('/api/admin/user-status', adminToken, {
      id: adminId,
      status: 'disabled',
    })).status).toBe(400)
  })

  it('requires same-origin headers for cookie-authenticated admin changes', async () => {
    const studentEmail = `student-cookie-csrf-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    const adminEmail = `admin-cookie-csrf-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    await createTestSession(studentEmail)
    const adminToken = await createTestSession(adminEmail, 'admin')
    const studentId = `test:${studentEmail}`

    const body = JSON.stringify({ id: studentId, status: 'disabled' })
    const blocked = await fetch('/api/admin/user-status', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `SinkSession=${adminToken}`,
      },
    })
    expect(blocked.status).toBe(403)

    const allowed = await fetch('/api/admin/user-status', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `SinkSession=${adminToken}`,
        'Origin': 'http://localhost',
      },
    })
    expect(allowed.status).toBe(200)
  })
})

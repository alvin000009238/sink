export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const { verify } = useCurrentUser()

  if (to.path.startsWith('/dashboard') && to.path !== '/dashboard/login') {
    try {
      await verify()
    }
    catch (e) {
      console.warn(e)
      return navigateTo('/dashboard/login')
    }
  }

  if (to.path === '/dashboard/login') {
    try {
      await verify()
      return navigateTo('/dashboard')
    }
    catch (e) {
      console.warn(e)
    }
  }
})

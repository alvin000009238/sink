defineRouteMeta({
  openAPI: {
    description: 'Verify the current authenticated user',
    responses: {
      200: {
        description: 'The authenticated user is valid',
      },
      default: {
        description: 'The authentication token or session is invalid',
      },
    },
  },
})

export default eventHandler((event) => {
  return {
    name: 'Sink',
    url: 'https://sink.cool',
    user: requireAuthUser(event),
  }
})

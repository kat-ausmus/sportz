import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' }
})

const start = async () => {
  try {
    await fastify.listen({ port: 8000 })
    console.log(`Server is running at http://localhost:8000`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

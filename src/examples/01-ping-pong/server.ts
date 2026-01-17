import { Elysia } from 'elysia'
import { createElysiaWS } from '../../server/index.ts'
import { events } from './events.ts'

const { server, handler } = createElysiaWS(events, {
	debug: true,
	validate: true,
})

// Handle ping requests
server.onRequest('ping', async payload => {
	console.log('Received ping at:', payload.timestamp)
	return {
		pong: 'Hello from server!',
		serverTimestamp: Date.now(),
	}
})

// Handle notification messages
server.onSend('notify', async payload => {
	console.log('Notification:', payload.message)
})

const app = new Elysia().ws('/ws', handler).listen(3000)

console.log('Server running on http://localhost:3000')

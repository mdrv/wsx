import type { ServerWebSocket } from 'bun'
import { Elysia } from 'elysia'
import { createElysiaWS, TypedWSConnection } from '../../server/index.ts'
import { events } from './events.ts'

// Simple auth state
const authenticatedUsers = new Map<
	ServerWebSocket<any>,
	{ id: string; username: string }
>()

const { server, handler } = createElysiaWS(events, {
	debug: true,
	validate: true,
})

// Handle authentication
server.onRequest('auth', async payload => {
	const ws = (arguments as any)[1] as ServerWebSocket<any>

	// Simple token validation (in real app, verify JWT, etc.)
	if (payload.token === 'secret-token') {
		const user = {
			id: '123',
			username: 'demo-user',
		}
		authenticatedUsers.set(ws, user)

		console.log(`User ${user.username} authenticated`)

		return {
			success: true,
			user,
		}
	}

	return {
		success: false,
	}
})

// Protected endpoint
server.onRequest('getData', async payload => {
	const ws = (arguments as any)[1] as ServerWebSocket<any>
	const user = authenticatedUsers.get(ws)

	if (!user) {
		throw new Error('Unauthorized. Please authenticate first.')
	}

	console.log(`User ${user.username} requested data: ${payload.id}`)

	return {
		data: `Secret data for ${payload.id}`,
	}
})

const enhancedHandler = {
	...handler,
	close(ws: ServerWebSocket<any>, code: number, reason: string) {
		authenticatedUsers.delete(ws)
		handler.close(ws, code, reason)
	},
}

const app = new Elysia().ws('/ws', enhancedHandler).listen(3002)

console.log('Auth server running on http://localhost:3002')
console.log('Use token "secret-token" to authenticate')

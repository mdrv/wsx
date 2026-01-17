import type { ServerWebSocket } from 'bun'
import { Elysia } from 'elysia'
import { createElysiaWS, TypedWSConnection } from '../../server/index.ts'
import { events } from './events.ts'

// Simple in-memory state
interface User {
	username: string
	room: string
	ws: ServerWebSocket<any>
}

const users = new Map<ServerWebSocket<any>, User>()
const rooms = new Map<string, Set<ServerWebSocket<any>>>()

const { server, handler } = createElysiaWS(events, {
	debug: true,
	validate: true,
})

// Handle join requests
server.onRequest('join', async payload => {
	const ws = (arguments as any)[1] as ServerWebSocket<any> // Get WS from context

	// Store user
	users.set(ws, {
		username: payload.username,
		room: payload.room,
		ws,
	})

	// Add to room
	if (!rooms.has(payload.room)) {
		rooms.set(payload.room, new Set())
	}
	rooms.get(payload.room)!.add(ws)

	// Get all users in room
	const roomUsers = Array.from(rooms.get(payload.room)!)
		.map(ws => users.get(ws)?.username)
		.filter(Boolean) as string[]

	// Notify others in room
	broadcast(payload.room, ws, 'userJoined', {
		username: payload.username,
	})

	console.log(`${payload.username} joined room ${payload.room}`)

	return {
		success: true,
		message: `Welcome to ${payload.room}!`,
		users: roomUsers,
	}
})

// Handle chat messages
server.onRequest('sendMessage', async payload => {
	const ws = (arguments as any)[1] as ServerWebSocket<any>
	const user = users.get(ws)

	if (!user) {
		throw new Error('User not found. Please join a room first.')
	}

	const messageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
	const timestamp = Date.now()

	// Broadcast to all users in room
	broadcast(user.room, undefined, 'message', {
		messageId,
		username: user.username,
		message: payload.message,
		timestamp,
	})

	return {
		messageId,
		timestamp,
	}
})

// Helper to broadcast to room
function broadcast(
	room: string,
	exclude: ServerWebSocket<any> | undefined,
	event: keyof typeof events,
	payload: any,
) {
	const roomWs = rooms.get(room)
	if (!roomWs) return

	for (const ws of roomWs) {
		if (ws !== exclude) {
			const connection = new TypedWSConnection(ws, events)
			connection.send(event, payload)
		}
	}
}

// Enhanced handler with connection tracking
const enhancedHandler = {
	...handler,
	open(ws: ServerWebSocket<any>) {
		console.log('Client connected')
		handler.open(ws)
	},
	close(ws: ServerWebSocket<any>, code: number, reason: string) {
		const user = users.get(ws)
		if (user) {
			// Remove from room
			rooms.get(user.room)?.delete(ws)

			// Notify others
			broadcast(user.room, ws, 'userLeft', {
				username: user.username,
			})

			console.log(`${user.username} left room ${user.room}`)
		}
		users.delete(ws)
		handler.close(ws, code, reason)
	},
}

const app = new Elysia().ws('/ws', enhancedHandler).listen(3001)

console.log('Chat server running on http://localhost:3001')

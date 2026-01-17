import { z } from 'zod'
import { defineEvents } from '../../shared/schema.ts'

export const events = defineEvents({
	// Join a chat room
	join: {
		request: z.object({
			username: z.string().min(1).max(50),
			room: z.string().default('general'),
		}),
		response: z.object({
			success: z.boolean(),
			message: z.string(),
			users: z.array(z.string()),
		}),
	},

	// Send a chat message
	sendMessage: {
		request: z.object({
			message: z.string().min(1).max(500),
		}),
		response: z.object({
			messageId: z.string(),
			timestamp: z.number(),
		}),
	},

	// Receive chat messages (server -> client)
	message: {
		request: z.object({
			messageId: z.string(),
			username: z.string(),
			message: z.string(),
			timestamp: z.number(),
		}),
	},

	// User joined notification
	userJoined: {
		request: z.object({
			username: z.string(),
		}),
	},

	// User left notification
	userLeft: {
		request: z.object({
			username: z.string(),
		}),
	},
})

export type Events = typeof events

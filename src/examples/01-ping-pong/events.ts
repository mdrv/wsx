import { z } from 'zod'
import { defineEvents } from '../../shared/schema.ts'

/**
 * Shared event definitions for ping-pong example
 */
export const events = defineEvents({
	ping: {
		request: z.object({
			timestamp: z.number(),
		}),
		response: z.object({
			pong: z.string(),
			serverTimestamp: z.number(),
		}),
	},
	notify: {
		request: z.object({
			message: z.string(),
		}),
		// No response for one-way notifications
	},
})

export type Events = typeof events

import { z } from 'zod'
import { defineEvents } from '../../shared/schema.ts'

export const events = defineEvents({
	// Authenticate
	auth: {
		request: z.object({
			token: z.string(),
		}),
		response: z.object({
			success: z.boolean(),
			user: z
				.object({
					id: z.string(),
					username: z.string(),
				})
				.optional(),
		}),
	},

	// Protected action
	getData: {
		request: z.object({
			id: z.string(),
		}),
		response: z.object({
			data: z.string(),
		}),
	},
})

export type Events = typeof events

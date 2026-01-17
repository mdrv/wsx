import { z } from 'zod'
import { defineEvents } from '../../src/shared/schema.ts'

/**
 * Test event definitions for use in tests
 */
export const testEvents = defineEvents({
	ping: {
		request: z.object({ timestamp: z.number() }),
		response: z.object({ pong: z.string() }),
	},
	notify: {
		request: z.object({ message: z.string() }),
	},
	echo: {
		request: z.object({ text: z.string() }),
		response: z.object({ echoed: z.string() }),
	},
	broadcast: {
		request: z.object({ content: z.string() }),
	},
	auth: {
		request: z.object({ token: z.string() }),
		response: z.object({ success: z.boolean(), user: z.string().optional() }),
	},
})

/**
 * Sample payloads for testing
 */
export const samplePayloads = {
	ping: { timestamp: Date.now() },
	pong: { pong: 'hello' },
	notify: { message: 'test notification' },
	echo: { text: 'hello world' },
	echoed: { echoed: 'hello world' },
	broadcast: { content: 'broadcast message' },
	auth: { token: 'test-token-123' },
	authSuccess: { success: true, user: 'testuser' },
	authFailure: { success: false },
}

/**
 * Test ports for different test suites to avoid conflicts
 */
export const testPorts = {
	integration: 9000,
	e2e: 9100,
	unit: 9200,
}

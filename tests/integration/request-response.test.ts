import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { TypedWSClient } from '../../src/client/typed-client.ts'
import { createElysiaWS } from '../../src/server/elysia.ts'
import { testEvents, testPorts } from '../utils/fixtures.ts'
import { waitFor } from '../utils/helpers.ts'

describe('Integration: Request-Response', () => {
	const port = testPorts.integration + 1
	let app: Elysia | null = null

	afterEach(() => {
		app?.stop()
		app = null
	})

	it('should handle successful request-response', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		// Register handler for ping
		server.onRequest('ping', async (payload) => {
			return { pong: `Received at ${payload.timestamp}` }
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Send request
		const response = await client.request('ping', { timestamp: Date.now() })

		expect(response).toHaveProperty('pong')
		expect(response.pong).toContain('Received at')

		client.close()
	})

	it('should handle request timeout', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		// Register handler that takes too long
		server.onRequest('ping', async (payload) => {
			await new Promise(resolve => setTimeout(resolve, 2000))
			return { pong: 'too late' }
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)
		client.connect()

		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Request with short timeout
		try {
			await client.request('ping', { timestamp: Date.now() }, { timeout: 500 })
			expect(false).toBe(true) // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
			expect((error as Error).message).toContain('timeout')
		}

		client.close()
	})

	it('should handle request errors from server', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		// Register handler that throws error
		server.onRequest('ping', async (payload) => {
			throw new Error('Server error occurred')
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)
		client.connect()

		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Request should fail
		try {
			await client.request('ping', { timestamp: Date.now() })
			expect(false).toBe(true) // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
			expect((error as Error).message).toContain('Server error occurred')
		}

		client.close()
	})

	it('should handle multiple concurrent requests', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		// Register handler
		server.onRequest('ping', async (payload) => {
			// Simulate some work
			await new Promise(resolve => setTimeout(resolve, 50))
			return { pong: `Response for ${payload.timestamp}` }
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)
		client.connect()

		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Send multiple requests concurrently
		const promises = [
			client.request('ping', { timestamp: 1 }),
			client.request('ping', { timestamp: 2 }),
			client.request('ping', { timestamp: 3 }),
			client.request('ping', { timestamp: 4 }),
			client.request('ping', { timestamp: 5 }),
		]

		const responses = await Promise.all(promises)

		expect(responses).toHaveLength(5)
		responses.forEach((response, index) => {
			expect(response).toHaveProperty('pong')
			expect(response.pong).toContain(`Response for ${index + 1}`)
		})

		client.close()
	})

	it('should validate request payload with Zod', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		server.onRequest('ping', async (payload) => {
			return { pong: 'valid' }
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents, {
			validate: true,
		})
		client.connect()

		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Valid payload
		const response1 = await client.request('ping', { timestamp: Date.now() })
		expect(response1.pong).toBe('valid')

		// Invalid payload (should throw validation error)
		try {
			await client.request('ping', { timestamp: 'invalid' } as any)
			expect(false).toBe(true) // Should not reach here
		} catch (error) {
			expect(error).toBeDefined()
		}

		client.close()
	})

	it('should validate response payload with Zod', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		// Handler returns invalid response
		server.onRequest('ping', async (payload) => {
			return { invalid: 'response' } as any
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents, {
			validate: true,
		})
		client.connect()

		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Request should fail validation
		try {
			await client.request('ping', { timestamp: Date.now() })
			expect(false).toBe(true) // Should not reach here
		} catch (error) {
			expect(error).toBeDefined()
		}

		client.close()
	})

	it('should handle request-response with no payload', async () => {
		// Create events with optional payloads
		const events = {
			simple: {
				request: z.object({}).optional(),
				response: z.object({ success: z.boolean() }),
			},
		}

		const { server, handler } = createElysiaWS(events)

		server.onRequest('simple', async () => {
			return { success: true }
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, events)
		client.connect()

		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Send request with undefined payload
		const response = await client.request('simple', undefined)

		expect(response).toHaveProperty('success')
		expect(response.success).toBe(true)

		client.close()
	})
})

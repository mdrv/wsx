import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { TypedWSClient } from '../../src/client/typed-client.ts'
import { createElysiaWS } from '../../src/server/elysia.ts'
import { delay, waitFor } from '../utils/helpers.ts'

/**
 * E2E Ping-Pong Tests
 *
 * Tests realistic ping-pong scenarios with server and client.
 * Port range: 9100+
 */

describe('E2E: Ping-Pong', () => {
	const PORT = 9100
	const WS_URL = `ws://localhost:${PORT}/ws`

	// Define ping-pong events
	const pingPongEvents = {
		ping: {
			request: z.object({ timestamp: z.number() }),
			response: z.object({ timestamp: z.number(), serverTime: z.number() }),
		},
		echo: {
			request: z.object({ message: z.string() }),
			response: z.object({ message: z.string() }),
		},
		heartbeat: {
			request: z.object({ clientId: z.string() }),
			response: z.object({ alive: z.boolean() }),
		},
	}

	type PingPongEvents = typeof pingPongEvents

	let app: Elysia
	let client: TypedWSClient<PingPongEvents>

	beforeAll(async () => {
		// Create Elysia server with ping-pong handlers
		const { server, handler } = createElysiaWS(pingPongEvents)

		// Handle ping requests
		server.onRequest('ping', async (payload) => {
			return {
				timestamp: payload.timestamp,
				serverTime: Date.now(),
			}
		})

		// Handle echo requests
		server.onRequest('echo', async (payload) => {
			return {
				message: payload.message,
			}
		})

		// Handle heartbeat requests
		server.onRequest('heartbeat', async (payload) => {
			return {
				alive: true,
			}
		})

		app = new Elysia().ws('/ws', handler).listen(PORT)

		await delay(100) // Wait for server to start
	})

	afterAll(() => {
		app?.stop()
	})

	it('should handle simple ping-pong', async () => {
		client = new TypedWSClient(WS_URL, pingPongEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		const sendTime = Date.now()
		const response = await client.request('ping', { timestamp: sendTime })

		expect(response.timestamp).toBe(sendTime)
		expect(response.serverTime).toBeGreaterThanOrEqual(sendTime)
		expect(response.serverTime).toBeLessThan(sendTime + 1000)

		client.close()
		await delay(50)
	})

	it('should handle rapid ping-pong exchanges', async () => {
		client = new TypedWSClient(WS_URL, pingPongEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		const pingCount = 10
		const responses: Array<{ timestamp: number; serverTime: number }> = []

		// Send multiple pings rapidly
		for (let i = 0; i < pingCount; i++) {
			const timestamp = Date.now()
			const response = await client.request('ping', { timestamp })
			responses.push(response)
		}

		// All responses should be valid
		expect(responses).toHaveLength(pingCount)

		for (const response of responses) {
			expect(response.timestamp).toBeGreaterThan(0)
			expect(response.serverTime).toBeGreaterThan(0)
			expect(response.serverTime).toBeGreaterThanOrEqual(response.timestamp)
		}

		client.close()
		await delay(50)
	})

	it('should handle concurrent ping-pong with different event types', async () => {
		client = new TypedWSClient(WS_URL, pingPongEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Send multiple different requests concurrently
		const [pingResponse, echoResponse, heartbeatResponse] = await Promise.all([
			client.request('ping', { timestamp: Date.now() }),
			client.request('echo', { message: 'Hello, World!' }),
			client.request('heartbeat', { clientId: 'test-client-123' }),
		])

		// Verify ping response
		expect(pingResponse.timestamp).toBeGreaterThan(0)
		expect(pingResponse.serverTime).toBeGreaterThan(0)

		// Verify echo response
		expect(echoResponse.message).toBe('Hello, World!')

		// Verify heartbeat response
		expect(heartbeatResponse.alive).toBe(true)

		client.close()
		await delay(50)
	})

	it('should measure round-trip latency', async () => {
		client = new TypedWSClient(WS_URL, pingPongEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		const latencies: number[] = []

		// Measure latency for 5 pings
		for (let i = 0; i < 5; i++) {
			const start = performance.now()
			await client.request('ping', { timestamp: Date.now() })
			const end = performance.now()

			latencies.push(end - start)
		}

		// Calculate average latency
		const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

		// Latency should be reasonable (less than 100ms for localhost)
		expect(avgLatency).toBeLessThan(100)
		expect(avgLatency).toBeGreaterThan(0)

		client.close()
		await delay(50)
	})

	it('should handle echo with various message sizes', async () => {
		client = new TypedWSClient(WS_URL, pingPongEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Test different message sizes
		const messages = [
			'a', // 1 byte
			'Hello', // 5 bytes
			'A'.repeat(100), // 100 bytes
			'B'.repeat(1000), // 1KB
			'C'.repeat(10000), // 10KB
		]

		for (const message of messages) {
			const response = await client.request('echo', { message })
			expect(response.message).toBe(message)
			expect(response.message.length).toBe(message.length)
		}

		client.close()
		await delay(50)
	})

	it('should maintain ping-pong accuracy over time', async () => {
		client = new TypedWSClient(WS_URL, pingPongEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		const duration = 1000 // 1 second
		const interval = 100 // Ping every 100ms
		const expectedPings = Math.floor(duration / interval)

		const responses: Array<{ timestamp: number; serverTime: number }> = []
		const startTime = Date.now()

		// Send pings at regular intervals
		while (Date.now() - startTime < duration) {
			const timestamp = Date.now()
			const response = await client.request('ping', { timestamp })
			responses.push(response)
			await delay(interval)
		}

		// Should have received expected number of responses
		expect(responses.length).toBeGreaterThanOrEqual(expectedPings - 1)
		expect(responses.length).toBeLessThanOrEqual(expectedPings + 1)

		// All responses should be in order
		for (let i = 1; i < responses.length; i++) {
			expect(responses[i].timestamp).toBeGreaterThanOrEqual(
				responses[i - 1].timestamp,
			)
		}

		client.close()
		await delay(50)
	})
})

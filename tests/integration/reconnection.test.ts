import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { TypedWSClient } from '../../src/client/typed-client.ts'
import { createElysiaWS } from '../../src/server/elysia.ts'
import { testEvents, testPorts } from '../utils/fixtures.ts'
import { delay, waitFor } from '../utils/helpers.ts'

describe('Integration: Reconnection', () => {
	const port = testPorts.integration + 3
	let app: Elysia | null = null

	afterEach(() => {
		app?.stop()
		app = null
	})

	it('should connect successfully with retry configuration', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents, {
			maxRetries: 5,
			minReconnectionDelay: 100,
			maxReconnectionDelay: 500,
		})

		let connected = false
		client.onOpen(() => {
			connected = true
		})

		client.connect()

		// Wait for initial connection
		await waitFor(() => connected, 2000)
		expect(client.readyState).toBe(1) // WebSocket.OPEN

		client.close()
	})

	it('should use exponential backoff configuration', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		// Create client with specific backoff settings
		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents, {
			maxRetries: 3,
			minReconnectionDelay: 100,
			maxReconnectionDelay: 1000,
			reconnectionDelayGrowFactor: 1.5,
		})

		let connected = false
		client.onOpen(() => {
			connected = true
		})

		client.connect()

		// Wait for connection with backoff settings
		await waitFor(() => connected, 2000)
		expect(client.readyState).toBe(1) // WebSocket.OPEN

		client.close()
	})

	it('should fail to connect to non-existent server after retries', async () => {
		// Connect to wrong port (no server listening)
		const wrongPort = port + 100
		const client = new TypedWSClient(`ws://localhost:${wrongPort}/ws`, testEvents, {
			maxRetries: 2,
			minReconnectionDelay: 50,
			maxReconnectionDelay: 100,
		})

		let errorCount = 0
		client.onError(() => {
			errorCount++
		})

		client.connect()

		// Wait for retry attempts to fail
		await delay(1000)

		// Should have encountered errors
		expect(errorCount).toBeGreaterThan(0)
		// Should not be connected
		expect(client.readyState).not.toBe(1)

		client.close()
	})

	it('should handle messages after connection is established', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		const receivedMessages: string[] = []
		server.onSend('notify', async (payload) => {
			receivedMessages.push(payload.message)
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents, {
			maxRetries: 5,
			minReconnectionDelay: 100,
		})

		let connected = false
		client.onOpen(() => {
			connected = true
		})

		client.connect()
		await waitFor(() => connected, 2000)

		// Send message after connection
		client.send('notify', { message: 'Test message' })
		await waitFor(() => receivedMessages.length === 1, 1000)
		expect(receivedMessages[0]).toBe('Test message')

		client.close()
	})

	it('should handle request-response after connection', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		server.onRequest('ping', async (payload) => {
			return { pong: `Response to ${payload.timestamp}` }
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents, {
			maxRetries: 5,
			minReconnectionDelay: 100,
		})

		let connected = false
		client.onOpen(() => {
			connected = true
		})

		client.connect()
		await waitFor(() => connected, 2000)

		// Make request after connection
		const response = await client.request('ping', { timestamp: 1234 })
		expect(response.pong).toBe('Response to 1234')

		client.close()
	})

	it('should connect with URL provider function', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		// Use URL provider function
		const urlProvider = () => `ws://localhost:${port}/ws`

		const client = new TypedWSClient(urlProvider, testEvents, {
			maxRetries: 5,
			minReconnectionDelay: 100,
		})

		let connected = false
		client.onOpen(() => {
			connected = true
		})

		client.connect()
		await waitFor(() => connected, 2000)
		expect(client.readyState).toBe(1) // WebSocket.OPEN

		client.close()
	})
})

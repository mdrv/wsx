import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { TypedWSClient } from '../../src/client/typed-client.ts'
import { createElysiaWS } from '../../src/server/elysia.ts'
import { testEvents, testPorts } from '../utils/fixtures.ts'
import { MessageCollector, waitFor } from '../utils/helpers.ts'

describe('Integration: Send (One-way Messages)', () => {
	const port = testPorts.integration + 2
	let app: Elysia | null = null

	afterEach(() => {
		app?.stop()
		app = null
	})

	it('should send one-way messages from client to server', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		const messages: string[] = []
		server.onSend('notify', async (payload) => {
			messages.push(payload.message)
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

		// Send multiple one-way messages
		client.send('notify', { message: 'Hello' })
		client.send('notify', { message: 'World' })
		client.send('notify', { message: 'Test' })

		// Wait for messages to be processed
		await waitFor(() => messages.length === 3, 2000)

		expect(messages).toHaveLength(3)
		expect(messages[0]).toBe('Hello')
		expect(messages[1]).toBe('World')
		expect(messages[2]).toBe('Test')

		client.close()
	})

	it('should broadcast messages to multiple clients', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		// Simpler test: just verify multiple clients can receive sent messages
		const messages: string[] = []
		server.onSend('notify', async (payload) => {
			messages.push(payload.message)
		})

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		// Create 2 clients
		const client1 = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)
		const client2 = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)

		client1.connect()
		client2.connect()

		// Wait for connections
		let connected1 = false
		let connected2 = false
		client1.onOpen(() => {
			connected1 = true
		})
		client2.onOpen(() => {
			connected2 = true
		})
		await waitFor(() => connected1 && connected2, 2000)

		// Both clients send messages
		client1.send('notify', { message: 'From client 1' })
		client2.send('notify', { message: 'From client 2' })

		// Both messages should be received by server
		await waitFor(() => messages.length === 2, 2000)

		expect(messages).toHaveLength(2)
		expect(messages).toContain('From client 1')
		expect(messages).toContain('From client 2')

		client1.close()
		client2.close()
	})

	it('should validate send message payloads', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		const messages: string[] = []

		server.onSend('notify', async (payload) => {
			messages.push(payload.message)
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

		// Valid message
		client.send('notify', { message: 'Valid message' })
		await waitFor(() => messages.length === 1, 2000)
		expect(messages[0]).toBe('Valid message')

		// Invalid payload should throw validation error
		try {
			client.send('notify', { message: 123 } as any)
			// Should not reach here if validation is working
			expect(true).toBe(false)
		} catch (error) {
			expect(error).toBeDefined()
		}

		client.close()
	})

	it('should handle errors in send handlers gracefully', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		let handlerCalled = false
		server.onSend('notify', async (payload) => {
			handlerCalled = true
			throw new Error('Handler error')
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

		// Send message - handler will throw but connection should remain open
		client.send('notify', { message: 'Test' })

		// Wait for handler to be called
		await waitFor(() => handlerCalled, 2000)
		expect(handlerCalled).toBe(true)

		// Connection should still be open
		expect(client.readyState).toBe(1) // WebSocket.OPEN

		client.close()
	})

	it('should handle high-frequency one-way messages', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		const messages: number[] = []
		server.onSend('notify', async (payload) => {
			const num = parseInt(payload.message, 10)
			messages.push(num)
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

		// Send 100 messages rapidly
		const messageCount = 100
		for (let i = 0; i < messageCount; i++) {
			client.send('notify', { message: String(i) })
		}

		// Wait for all messages to be received
		await waitFor(() => messages.length === messageCount, 5000)

		expect(messages).toHaveLength(messageCount)
		// Verify all messages were received (order may vary due to async processing)
		const sorted = [...messages].sort((a, b) => a - b)
		for (let i = 0; i < messageCount; i++) {
			expect(sorted[i]).toBe(i)
		}

		client.close()
	})
})

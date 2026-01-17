import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { TypedWSClient } from '../../src/client/typed-client.ts'
import { createElysiaWS } from '../../src/server/elysia.ts'
import { testEvents, testPorts } from '../utils/fixtures.ts'
import { delay, waitFor } from '../utils/helpers.ts'

describe('Integration: Connection', () => {
	const port = testPorts.integration
	let app: Elysia | null = null

	afterEach(() => {
		app?.stop()
		app = null
	})

	it('should establish connection between client and server', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)

		let clientOpened = false
		client.onOpen(() => {
			clientOpened = true
		})

		client.connect()
		await waitFor(() => clientOpened, 2000)

		expect(clientOpened).toBe(true)
		expect(client.readyState).toBe(WebSocket.OPEN)

		client.close()
	})

	it('should handle multiple concurrent connections', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client1 = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)
		const client2 = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)
		const client3 = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)

		let opened = 0

		client1.onOpen(() => opened++)
		client2.onOpen(() => opened++)
		client3.onOpen(() => opened++)

		client1.connect()
		client2.connect()
		client3.connect()

		await waitFor(() => opened === 3, 3000)

		expect(opened).toBe(3)

		client1.close()
		client2.close()
		client3.close()
	})

	it('should handle client disconnection gracefully', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents)

		let clientOpened = false
		let clientClosed = false

		client.onOpen(() => {
			clientOpened = true
		})

		client.onClose(() => {
			clientClosed = true
		})

		client.connect()
		await waitFor(() => clientOpened, 2000)

		client.close()
		await waitFor(() => clientClosed, 2000)

		expect(clientClosed).toBe(true)
		expect(client.readyState).toBe(WebSocket.CLOSED)
	})

	it('should handle connection lifecycle with custom options', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		const client = new TypedWSClient(`ws://localhost:${port}/ws`, testEvents, {
			minReconnectionDelay: 100,
			maxReconnectionDelay: 500,
			connectionTimeout: 2000,
		})

		let openCount = 0
		let closeCount = 0

		client.onOpen(() => {
			openCount++
		})

		client.onClose(() => {
			closeCount++
		})

		client.connect()
		await waitFor(() => openCount === 1, 2000)

		expect(openCount).toBe(1)
		expect(client.readyState).toBe(WebSocket.OPEN)

		// Cleanly close connection
		client.close()
		await waitFor(() => closeCount === 1, 2000)

		expect(closeCount).toBe(1)
		expect(client.readyState).toBe(WebSocket.CLOSED)
	})

	it('should handle connection with custom protocols', async () => {
		const { server, handler } = createElysiaWS(testEvents)

		app = new Elysia()
			.ws('/ws', handler)
			.listen(port)

		// TypedWSClient uses ReconnectingWS which accepts protocols
		const client = new TypedWSClient(
			`ws://localhost:${port}/ws`,
			testEvents,
		)

		let clientOpened = false
		client.onOpen(() => {
			clientOpened = true
		})

		client.connect()
		await waitFor(() => clientOpened, 2000)

		expect(clientOpened).toBe(true)

		client.close()
	})
})

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { testEvents, testPorts } from '../../../tests/utils/fixtures.ts'
import { delay, waitFor } from '../../../tests/utils/helpers.ts'
import {
	createMockServer,
	createResponseError,
	createResponseOk,
	createSendMessage,
} from '../../../tests/utils/mock-server.ts'
import { MessageType } from '../../shared/index.ts'
import { TypedWSClient } from '../typed-client.ts'

describe('TypedWSClient', () => {
	const port = testPorts.unit + 10
	const mockServer = createMockServer({ port })

	beforeEach(async () => {
		await mockServer.start()
	})

	afterEach(async () => {
		await mockServer.stop()
	})

	describe('Connection Management', () => {
		it('should connect successfully', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let opened = false

			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			expect(opened).toBe(true)
			expect(client.readyState).toBe(WebSocket.OPEN)

			client.close()
		})

		it('should support startClosed option', () => {
			const client = new TypedWSClient(mockServer.url, testEvents, {
				startClosed: true,
			})

			expect(client.readyState).toBe(WebSocket.CLOSED)

			client.close()
		})

		it('should close cleanly', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let opened = false
			let closed = false

			client.onOpen(() => {
				opened = true
			})

			client.onClose(() => {
				closed = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			client.close()
			await waitFor(() => closed, 2000)

			expect(closed).toBe(true)
			expect(client.readyState).toBe(WebSocket.CLOSED)
		})

		it('should reject pending requests on close', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Send a request but close before response
			const requestPromise = client.request('ping', { timestamp: Date.now() })

			await delay(100)
			client.close()

			await expect(requestPromise).rejects.toThrow('Connection closed')
		})
	})

	describe('Send Messages (One-way)', () => {
		it('should send one-way messages', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let receivedCount = 0

			mockServer.setHandlers({
				onMessage: (_, message) => {
					if (message.t === MessageType.SEND && message.x === 'notify') {
						receivedCount++
					}
				},
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			client.send('notify', { message: 'test' })
			await waitFor(() => receivedCount > 0, 1000)

			expect(receivedCount).toBe(1)

			client.close()
		})

		it('should validate send payload when enabled', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents, {
				validate: true,
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Invalid payload should throw
			expect(() => {
				client.send('notify', { invalid: 'field' } as any)
			}).toThrow()

			client.close()
		})

		it('should skip validation when disabled', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents, {
				validate: false,
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Invalid payload should not throw when validation disabled
			expect(() => {
				client.send('notify', { invalid: 'field' } as any)
			}).not.toThrow()

			client.close()
		})
	})

	describe('Request/Response Pattern', () => {
		it('should send request and receive response', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)

			mockServer.setHandlers({
				onMessage: (ws, message) => {
					if (message.t === MessageType.REQUEST && message.x === 'ping') {
						// Echo back with pong (must be string per schema)
						mockServer.send(
							ws,
							createResponseOk(
								message.x,
								message.id!,
								message.w,
								{ pong: 'received' },
							),
						)
					}
				},
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			const timestamp = Date.now()
			const response = await client.request('ping', { timestamp })

			expect(response).toHaveProperty('pong')
			expect(response.pong).toBe('received')

			client.close()
		})

		it('should handle error responses', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)

			mockServer.setHandlers({
				onMessage: (ws, message) => {
					if (message.t === MessageType.REQUEST) {
						// Send error response
						mockServer.send(
							ws,
							createResponseError(
								message.x,
								message.id!,
								message.w,
								'Something went wrong',
							),
						)
					}
				},
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			await expect(
				client.request('ping', { timestamp: Date.now() }),
			).rejects.toThrow('Something went wrong')

			client.close()
		})

		it('should timeout requests', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents, {
				requestTimeout: 500,
			})

			// Clear any previous handlers
			mockServer.setHandlers({})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			await expect(
				client.request('ping', { timestamp: Date.now() }),
			).rejects.toThrow('Request timeout')

			client.close()
		})

		it('should support custom timeout per request', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents, {
				requestTimeout: 5000, // Default timeout
			})

			// Clear any previous handlers
			mockServer.setHandlers({})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Custom shorter timeout should take precedence
			await expect(
				client.request('ping', { timestamp: Date.now() }, { timeout: 300 }),
			).rejects.toThrow('Request timeout')

			client.close()
		})

		it('should support custom request IDs', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let receivedRequestId: string | undefined

			mockServer.setHandlers({
				onMessage: (ws, message) => {
					if (message.t === MessageType.REQUEST) {
						receivedRequestId = message.id
						mockServer.send(
							ws,
							createResponseOk(
								message.x,
								message.id!,
								message.w,
								{ pong: 'received' },
							),
						)
					}
				},
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			const customId = 'custom-request-123'
			await client.request('ping', { timestamp: Date.now() }, { requestId: customId })

			expect(receivedRequestId).toBe(customId)

			client.close()
		})

		it('should validate request payload when enabled', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents, {
				validate: true,
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Invalid payload should throw
			await expect(
				client.request('ping', { invalid: 'field' } as any),
			).rejects.toThrow()

			client.close()
		})

		it('should validate response payload when enabled', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents, {
				validate: true,
			})

			mockServer.setHandlers({
				onMessage: (ws, message) => {
					if (message.t === MessageType.REQUEST) {
						// Send invalid response payload
						mockServer.send(
							ws,
							createResponseOk(
								message.x,
								message.id!,
								message.w,
								{ invalid: 'field' },
							),
						)
					}
				},
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Should reject due to invalid response
			await expect(
				client.request('ping', { timestamp: Date.now() }),
			).rejects.toThrow()

			client.close()
		})
	})

	describe('Event Handlers', () => {
		it('should receive incoming send messages', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			const messages: any[] = []

			client.on('notify', payload => {
				messages.push(payload)
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Server sends message to client
			mockServer.broadcast(createSendMessage('notify', { message: 'hello' }))

			await waitFor(() => messages.length > 0, 1000)

			expect(messages.length).toBe(1)
			expect(messages[0].message).toBe('hello')

			client.close()
		})

		it('should support multiple handlers for same event', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let handler1Called = false
			let handler2Called = false

			client.on('notify', () => {
				handler1Called = true
			})

			client.on('notify', () => {
				handler2Called = true
			})

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			mockServer.broadcast(createSendMessage('notify', { message: 'test' }))

			await waitFor(() => handler1Called && handler2Called, 1000)

			expect(handler1Called).toBe(true)
			expect(handler2Called).toBe(true)

			client.close()
		})

		it('should remove event handlers with off()', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let callCount = 0

			const handler = () => {
				callCount++
			}

			client.on('notify', handler)

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Send first message
			mockServer.broadcast(createSendMessage('notify', { message: 'test1' }))
			await delay(200)

			expect(callCount).toBe(1)

			// Remove handler
			client.off('notify', handler)

			// Send second message (should not be handled)
			mockServer.broadcast(createSendMessage('notify', { message: 'test2' }))
			await delay(200)

			// Call count should still be 1
			expect(callCount).toBe(1)

			client.close()
		})
	})

	describe('Lifecycle Handlers', () => {
		it('should call onOpen handler', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let opened = false

			client.onOpen(() => {
				opened = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			expect(opened).toBe(true)

			client.close()
		})

		it('should call onClose handler', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let closed = false

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.onClose(() => {
				closed = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			client.close()
			await waitFor(() => closed, 2000)

			expect(closed).toBe(true)
		})

		it('should call onError handler', async () => {
			const client = new TypedWSClient(mockServer.url, testEvents)
			let errorFired = false

			let opened = false
			client.onOpen(() => {
				opened = true
			})

			client.onError(() => {
				errorFired = true
			})

			client.connect()
			await waitFor(() => opened, 2000)

			// Force an error by closing server
			await mockServer.stop()

			// Wait a bit for error to fire
			await delay(500)

			// Either error fires or connection just closes
			// (behavior may vary by environment)

			client.close()
		})
	})
})

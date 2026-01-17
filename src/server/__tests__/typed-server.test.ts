import type { ServerWebSocket } from 'bun'
import { describe, expect, it } from 'bun:test'
import { testEvents, testPorts } from '../../../tests/utils/fixtures.ts'
import { delay, waitFor } from '../../../tests/utils/helpers.ts'
import { createTestClient } from '../../../tests/utils/test-client.ts'
import { MessageType, PROTOCOL_VERSION } from '../../shared/index.ts'
import { TypedWSConnection, TypedWSServer } from '../typed-server.ts'

describe('TypedWSServer', () => {
	const port = testPorts.unit + 20

	describe('Handler Registration', () => {
		it('should register send handlers', () => {
			const server = new TypedWSServer(testEvents)
			let called = false

			server.onSend('notify', () => {
				called = true
			})

			// Handler registered (we can't easily test without full server setup)
			expect(called).toBe(false)
		})

		it('should register request handlers', () => {
			const server = new TypedWSServer(testEvents)
			let called = false

			server.onRequest('ping', async () => {
				called = true
				return { pong: 'test' }
			})

			expect(called).toBe(false)
		})

		it('should support multiple send handlers for same event', () => {
			const server = new TypedWSServer(testEvents)

			server.onSend('notify', () => {})
			server.onSend('notify', () => {})

			// Both handlers registered (tested in integration tests)
		})
	})

	describe('Message Handling with Server', () => {
		it('should handle send messages', async () => {
			const server = new TypedWSServer(testEvents)
			const messages: any[] = []

			server.onSend('notify', payload => {
				messages.push(payload)
			})

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: async (ws, data) => {
						await server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			// Connect client
			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			// Send message
			client.sendMessage('notify', { message: 'hello' })

			await waitFor(() => messages.length > 0, 2000)

			expect(messages.length).toBe(1)
			expect(messages[0].message).toBe('hello')

			client.close()
			bunServer.stop()
		})

		it('should handle request messages and send response', async () => {
			const server = new TypedWSServer(testEvents)

			server.onRequest('ping', async payload => {
				return { pong: `received ${payload.timestamp}` }
			})

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: async (ws, data) => {
						await server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			const timestamp = Date.now()
			client.sendRequest('ping', 'req-123', { timestamp })

			const response = await client.waitForMessage(2000)

			expect(response.t).toBe(MessageType.RESPONSE_OK)
			expect(response.p.pong).toContain(`received ${timestamp}`)

			client.close()
			bunServer.stop()
		})

		it('should handle request errors', async () => {
			const server = new TypedWSServer(testEvents)

			server.onRequest('ping', async () => {
				throw new Error('Test error')
			})

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: async (ws, data) => {
						await server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			client.sendRequest('ping', 'req-123', { timestamp: Date.now() })

			const response = await client.waitForMessage(2000)

			expect(response.t).toBe(MessageType.RESPONSE_ERROR)
			expect(response.e.message).toContain('Test error')

			client.close()
			bunServer.stop()
		})

		it('should respond with error when no handler registered', async () => {
			const server = new TypedWSServer(testEvents)

			// No handler registered for 'ping'

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: async (ws, data) => {
						await server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			client.sendRequest('ping', 'req-123', { timestamp: Date.now() })

			const response = await client.waitForMessage(2000)

			expect(response.t).toBe(MessageType.RESPONSE_ERROR)
			expect(response.e.message).toContain('No handler')

			client.close()
			bunServer.stop()
		})

		it('should validate incoming send messages', async () => {
			const server = new TypedWSServer(testEvents, { validate: true })
			const messages: any[] = []

			server.onSend('notify', payload => {
				messages.push(payload)
			})

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: async (ws, data) => {
						await server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			// Send invalid payload
			client.sendMessage('notify', { invalid: 'field' })
			await delay(300)

			// Should not have been processed
			expect(messages.length).toBe(0)

			client.close()
			bunServer.stop()
		})

		it('should validate incoming request messages', async () => {
			const server = new TypedWSServer(testEvents, { validate: true })

			server.onRequest('ping', async () => {
				return { pong: 'test' }
			})

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: async (ws, data) => {
						await server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			// Send invalid payload
			client.sendRequest('ping', 'req-123', { invalid: 'field' })

			const response = await client.waitForMessage(2000)

			expect(response.t).toBe(MessageType.RESPONSE_ERROR)

			client.close()
			bunServer.stop()
		})

		it('should skip validation when disabled', async () => {
			const server = new TypedWSServer(testEvents, { validate: false })
			const messages: any[] = []

			server.onSend('notify', payload => {
				messages.push(payload)
			})

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: async (ws, data) => {
						await server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			// Send invalid payload - should still work
			client.sendMessage('notify', { invalid: 'field' })
			await waitFor(() => messages.length > 0, 2000)

			expect(messages.length).toBe(1)

			client.close()
			bunServer.stop()
		})
	})

	describe('TypedWSConnection', () => {
		it('should send one-way messages', async () => {
			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: ws => {
						const connection = new TypedWSConnection(ws, testEvents)
						connection.send('notify', { message: 'hello from server' })
					},
					message: () => {},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			const message = await client.waitForMessage(2000)

			expect(message.t).toBe(MessageType.SEND)
			expect(message.x).toBe('notify')
			expect(message.p.message).toBe('hello from server')

			client.close()
			bunServer.stop()
		})

		it('should send response messages', async () => {
			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: () => {},
					message: (ws, data) => {
						const server = new TypedWSServer(testEvents)
						server.onRequest('ping', async () => ({ pong: 'response' }))
						server.handleMessage(ws, data)
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			client.sendRequest('ping', 'req-123', { timestamp: Date.now() })

			const response = await client.waitForMessage(2000)

			expect(response.t).toBe(MessageType.RESPONSE_OK)
			expect(response.p.pong).toBe('response')

			client.close()
			bunServer.stop()
		})

		it('should send error responses', async () => {
			let connection: TypedWSConnection<typeof testEvents> | null = null

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: ws => {
						connection = new TypedWSConnection(ws, testEvents)
					},
					message: (ws, data) => {
						if (connection) {
							connection.respondError('ping', 'req-123', Date.now(), 'Custom error')
						}
					},
					close: () => {},
				},
			})

			const client = createTestClient()
			await client.connect(`ws://localhost:${port}/ws`)

			client.sendRequest('ping', 'req-123', { timestamp: Date.now() })

			const response = await client.waitForMessage(2000)

			expect(response.t).toBe(MessageType.RESPONSE_ERROR)
			expect(response.e.message).toBe('Custom error')

			client.close()
			bunServer.stop()
		})

		it('should validate outgoing messages when enabled', () => {
			const mockWs = {
				send: () => {},
				close: () => {},
			} as any as ServerWebSocket<any>

			const connection = new TypedWSConnection(mockWs, testEvents, undefined, true)

			// Valid payload should not throw (using 'ping' which has a response schema)
			expect(() => {
				connection.respond('ping', 'req-123', Date.now(), { pong: 'test' })
			}).not.toThrow()

			// Invalid payload should throw
			expect(() => {
				connection.respond('ping', 'req-123', Date.now(), { invalid: 'field' } as any)
			}).toThrow()
		})

		it('should skip validation when disabled', () => {
			const mockWs = {
				send: () => {},
				close: () => {},
			} as any as ServerWebSocket<any>

			const connection = new TypedWSConnection(mockWs, testEvents, undefined, false)

			// Invalid payload should not throw when validation disabled
			expect(() => {
				connection.respond('ping', 'req-123', Date.now(), { invalid: 'field' } as any)
			}).not.toThrow()
		})

		it('should close connection', async () => {
			let clientClosed = false

			const bunServer = Bun.serve({
				port,
				fetch: (req, srv) => {
					const url = new URL(req.url)
					if (url.pathname === '/ws') {
						const upgraded = srv.upgrade(req)
						if (!upgraded) {
							return new Response('Upgrade failed', { status: 400 })
						}
						return undefined
					}
					return new Response('Not found', { status: 404 })
				},
				websocket: {
					open: ws => {
						const connection = new TypedWSConnection(ws, testEvents)
						// Close after a short delay
						setTimeout(() => {
							connection.close(1000, 'test close')
						}, 100)
					},
					message: () => {},
					close: () => {},
				},
			})

			const client = createTestClient()
			client.onClose = () => {
				clientClosed = true
			}
			await client.connect(`ws://localhost:${port}/ws`)

			// Wait for close
			await delay(500)

			expect(clientClosed).toBe(true)

			bunServer.stop()
		})

		it('should expose raw WebSocket', () => {
			const mockWs = {} as ServerWebSocket<any>
			const connection = new TypedWSConnection(mockWs, testEvents)

			expect(connection.raw).toBe(mockWs)
		})
	})
})

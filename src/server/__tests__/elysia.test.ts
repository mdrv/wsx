import type { ServerWebSocket } from 'bun'
import { describe, expect, it } from 'bun:test'
import { testEvents } from '../../../tests/utils/fixtures.ts'
import { createElysiaWS, elysiaTypedWS } from '../elysia.ts'
import { TypedWSServer } from '../typed-server.ts'

describe('Elysia Integration', () => {
	describe('elysiaTypedWS', () => {
		it('should create handler object with correct methods', () => {
			const server = new TypedWSServer(testEvents)
			const handler = elysiaTypedWS(server)

			expect(handler).toHaveProperty('upgrade')
			expect(handler).toHaveProperty('open')
			expect(handler).toHaveProperty('message')
			expect(handler).toHaveProperty('close')
			expect(handler).toHaveProperty('error')

			expect(typeof handler.upgrade).toBe('function')
			expect(typeof handler.open).toBe('function')
			expect(typeof handler.message).toBe('function')
			expect(typeof handler.close).toBe('function')
			expect(typeof handler.error).toBe('function')
		})

		it('should delegate message handling to server', async () => {
			const server = new TypedWSServer(testEvents, { validate: false, debug: false })
			const messages: any[] = []

			server.onSend('notify', payload => {
				messages.push(payload)
			})

			const handler = elysiaTypedWS(server)

			// Create a mock WebSocket
			const mockWs = {
				send: () => {},
			} as any as ServerWebSocket<any>

			// Simulate a message using CBOR serializer
			const { defaultSerializer, MessageType } = await import('../../shared/index.ts')
			const message = {
				v: 1,
				t: MessageType.SEND,
				x: 'notify',
				p: { message: 'test' },
			}

			const encoded = defaultSerializer.encode(message)
			await handler.message(mockWs, encoded)

			// Message should have been processed
			expect(messages.length).toBe(1)
			expect(messages[0].message).toBe('test')
		})

		it('should return true from upgrade handler', () => {
			const server = new TypedWSServer(testEvents)
			const handler = elysiaTypedWS(server)

			const mockRequest = new Request('http://localhost/ws')
			const result = handler.upgrade(mockRequest)

			expect(result).toBe(true)
		})
	})

	describe('createElysiaWS', () => {
		it('should create server and handler', () => {
			const { server, handler } = createElysiaWS(testEvents)

			expect(server).toBeInstanceOf(TypedWSServer)
			expect(handler).toHaveProperty('upgrade')
			expect(handler).toHaveProperty('open')
			expect(handler).toHaveProperty('message')
			expect(handler).toHaveProperty('close')
			expect(handler).toHaveProperty('error')
		})

		it('should pass options to server', () => {
			const { server } = createElysiaWS(testEvents, {
				validate: false,
				debug: true,
			})

			// Server should be created with the options
			expect(server).toBeInstanceOf(TypedWSServer)
		})

		it('should allow registering handlers on created server', () => {
			const { server } = createElysiaWS(testEvents)
			let called = false

			server.onSend('notify', () => {
				called = true
			})

			// Handler registered successfully
			expect(called).toBe(false)
		})
	})
})

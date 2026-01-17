import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { testPorts } from '../../../tests/utils/fixtures.ts'
import { delay, waitFor } from '../../../tests/utils/helpers.ts'
import { createMockServer } from '../../../tests/utils/mock-server.ts'
import { ReconnectingWS } from '../reconnecting-ws.ts'

describe('ReconnectingWS', () => {
	const port = testPorts.unit
	const mockServer = createMockServer({ port })

	beforeEach(async () => {
		await mockServer.start()
	})

	afterEach(async () => {
		await mockServer.stop()
	})

	describe('Basic Connection', () => {
		it('should connect successfully', async () => {
			const ws = new ReconnectingWS(mockServer.url)
			let opened = false

			ws.onopen = () => {
				opened = true
			}

			ws.connect()

			await waitFor(() => opened, 2000)
			expect(opened).toBe(true)
			expect(ws.readyState).toBe(ReconnectingWS.OPEN)

			ws.close()
		})

		it('should handle startClosed option', () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				startClosed: true,
			})

			expect(ws.readyState).toBe(ReconnectingWS.CLOSED)

			ws.close()
		})

		it('should connect with protocols', async () => {
			const ws = new ReconnectingWS(mockServer.url, ['protocol1', 'protocol2'])
			let opened = false

			ws.onopen = () => {
				opened = true
			}

			ws.connect()

			await waitFor(() => opened, 2000)
			expect(opened).toBe(true)

			ws.close()
		})

		it('should support URL provider function', async () => {
			const ws = new ReconnectingWS(() => mockServer.url)
			let opened = false

			ws.onopen = () => {
				opened = true
			}

			ws.connect()

			await waitFor(() => opened, 2000)
			expect(opened).toBe(true)

			ws.close()
		})

		it('should support async URL provider', async () => {
			const ws = new ReconnectingWS(async () => {
				await delay(100)
				return mockServer.url
			})
			let opened = false

			ws.onopen = () => {
				opened = true
			}

			ws.connect()

			await waitFor(() => opened, 3000)
			expect(opened).toBe(true)

			ws.close()
		})
	})

	describe('Message Sending', () => {
		it('should send messages when connected', async () => {
			const ws = new ReconnectingWS(mockServer.url)
			let receivedCount = 0

			mockServer.setHandlers({
				onMessage: () => {
					receivedCount++
				},
			})

			let opened = false
			ws.onopen = () => {
				opened = true
			}

			ws.connect()
			await waitFor(() => opened, 2000)

			ws.send(new TextEncoder().encode('test'))
			await waitFor(() => receivedCount > 0, 2000)

			expect(receivedCount).toBeGreaterThan(0)

			ws.close()
		})

		it('should queue messages when disconnected', async () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				startClosed: true,
			})

			// Send while disconnected
			ws.send(new TextEncoder().encode('queued'))

			expect(ws.bufferedAmount).toBeGreaterThan(0)

			ws.close()
		})

		it('should send queued messages on reconnect', async () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				startClosed: true,
			})
			let receivedCount = 0

			mockServer.setHandlers({
				onMessage: () => {
					receivedCount++
				},
			})

			// Queue messages
			ws.send(new TextEncoder().encode('queued1'))
			ws.send(new TextEncoder().encode('queued2'))

			let opened = false
			ws.onopen = () => {
				opened = true
			}

			// Now reconnect
			ws.reconnect()
			await waitFor(() => opened, 2000)
			await waitFor(() => receivedCount >= 2, 2000)

			expect(receivedCount).toBe(2)

			ws.close()
		})

		it('should respect maxEnqueuedMessages', () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				startClosed: true,
				maxEnqueuedMessages: 2,
			})

			ws.send(new TextEncoder().encode('msg1'))
			ws.send(new TextEncoder().encode('msg2'))
			ws.send(new TextEncoder().encode('msg3')) // Should be dropped

			// Buffer should only contain 2 messages
			const initialBuffered = ws.bufferedAmount
			ws.send(new TextEncoder().encode('msg4')) // Should be dropped
			expect(ws.bufferedAmount).toBe(initialBuffered)

			ws.close()
		})
	})

	describe('Reconnection Logic', () => {
		it('should reconnect after server disconnect', async () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				minReconnectionDelay: 100,
				maxReconnectionDelay: 200,
			})

			let openCount = 0
			let closeCalled = false

			ws.onopen = () => {
				openCount++
			}

			ws.onclose = () => {
				closeCalled = true
			}

			ws.connect()
			await waitFor(() => openCount === 1, 2000)

			// Simulate server disconnect
			if (mockServer.clients[0]) {
				mockServer.clients[0].close()
			}

			await waitFor(() => closeCalled, 2000)
			// Should reconnect automatically
			await waitFor(() => openCount === 2, 3000)

			expect(openCount).toBe(2)

			ws.close()
		})

		it('should respect maxRetries', async () => {
			// Stop server to force failures
			await mockServer.stop()

			const ws = new ReconnectingWS(mockServer.url, undefined, {
				maxRetries: 2,
				minReconnectionDelay: 50,
				maxReconnectionDelay: 100,
				connectionTimeout: 200,
			})

			ws.connect()

			// Wait for retries to exhaust
			await delay(1000)

			// Should stop trying after maxRetries
			expect(ws.readyState).toBe(ReconnectingWS.CLOSED)

			ws.close()
		})

		it('should reset retry count after stable connection', async () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				minUptime: 500,
				minReconnectionDelay: 100,
			})

			let opened = false
			ws.onopen = () => {
				opened = true
			}

			ws.connect()
			await waitFor(() => opened, 2000)

			// Wait for uptime to reset retry count
			await delay(600)

			// The connection should be stable and retry count reset
			expect(ws.readyState).toBe(ReconnectingWS.OPEN)

			ws.close()
		})

		it('should use exponential backoff for reconnection delay', async () => {
			await mockServer.stop()

			const ws = new ReconnectingWS(mockServer.url, undefined, {
				minReconnectionDelay: 100,
				reconnectionDelayGrowFactor: 2,
				maxReconnectionDelay: 1000,
				maxRetries: 3,
				connectionTimeout: 100,
			})

			const startTime = Date.now()
			ws.connect()

			// Wait for all retries
			await delay(2000)

			const elapsed = Date.now() - startTime
			// With exponential backoff: 0ms + 100ms + 200ms + connection timeouts
			// Should take at least 300ms for the delays alone
			expect(elapsed).toBeGreaterThan(300)

			ws.close()
		})
	})

	describe('Close and Cleanup', () => {
		it('should close cleanly', async () => {
			const ws = new ReconnectingWS(mockServer.url)
			let opened = false
			let closed = false

			ws.onopen = () => {
				opened = true
			}

			ws.onclose = () => {
				closed = true
			}

			ws.connect()
			await waitFor(() => opened, 2000)

			ws.close()
			await waitFor(() => closed, 2000)

			expect(closed).toBe(true)
			expect(ws.readyState).toBe(ReconnectingWS.CLOSED)
		})

		it('should not reconnect after close', async () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				minReconnectionDelay: 100,
			})

			let openCount = 0
			ws.onopen = () => {
				openCount++
			}

			ws.connect()
			await waitFor(() => openCount === 1, 2000)

			ws.close()
			await delay(500)

			// Should not have reconnected
			expect(openCount).toBe(1)
		})

		it('should clear pending requests on close', async () => {
			const ws = new ReconnectingWS(mockServer.url)

			let opened = false
			ws.onopen = () => {
				opened = true
			}

			ws.connect()
			await waitFor(() => opened, 2000)

			ws.send(new TextEncoder().encode('test'))
			ws.close()

			expect(ws.readyState).toBe(ReconnectingWS.CLOSED)
		})
	})

	describe('Error Handling', () => {
		it('should handle connection timeout', async () => {
			// Create a server that doesn't complete handshake
			const timeoutPort = testPorts.unit + 1
			const timeoutServer = Bun.serve({
				port: timeoutPort,
				fetch: () => {
					// Never upgrade to websocket
					return new Response('', { status: 200 })
				},
			})

			const ws = new ReconnectingWS(`ws://localhost:${timeoutPort}`, undefined, {
				connectionTimeout: 300,
				maxRetries: 1,
				minReconnectionDelay: 100,
			})

			ws.connect()
			await delay(1000)

			// Should have timed out and not be open
			expect(ws.readyState).not.toBe(ReconnectingWS.OPEN)

			ws.close()
			timeoutServer.stop()
		})
	})

	describe('State Properties', () => {
		it('should expose readyState correctly', () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				startClosed: true,
			})

			expect(ws.readyState).toBe(ReconnectingWS.CLOSED)

			ws.close()
		})

		it('should calculate bufferedAmount correctly', () => {
			const ws = new ReconnectingWS(mockServer.url, undefined, {
				startClosed: true,
			})

			ws.send('test')
			expect(ws.bufferedAmount).toBe(4) // 'test' = 4 bytes

			ws.send(new Uint8Array([1, 2, 3]))
			expect(ws.bufferedAmount).toBe(7) // 4 + 3

			ws.close()
		})

		it('should expose currentUrl', async () => {
			const ws = new ReconnectingWS(mockServer.url)
			let opened = false

			ws.onopen = () => {
				opened = true
			}

			ws.connect()
			await waitFor(() => opened, 2000)

			expect(ws.currentUrl).toBe(mockServer.url)

			ws.close()
		})
	})
})

import type { Server, ServerWebSocket } from 'bun'
import { defaultSerializer, MessageType, PROTOCOL_VERSION, type Serializer } from '../../src/shared/index.ts'
import type { ProtocolMessage } from '../../src/shared/protocol.ts'

export interface MockServerOptions {
	/** Port to listen on */
	port: number
	/** Custom serializer (defaults to CBOR) */
	serializer?: Serializer
	/** Enable debug logging */
	debug?: boolean
}

export interface MockServerHandlers {
	/** Called when a client connects */
	onOpen?: (ws: ServerWebSocket<any>) => void
	/** Called when a message is received */
	onMessage?: (ws: ServerWebSocket<any>, message: ProtocolMessage) => void
	/** Called when a client disconnects */
	onClose?: (ws: ServerWebSocket<any>, code: number, reason: string) => void
	/** Called on error */
	onError?: (ws: ServerWebSocket<any>, error: Error) => void
}

/**
 * Lightweight mock WebSocket server for testing clients
 */
export class MockServer {
	private server: Server | null = null
	private serializer: Serializer
	private options: Required<MockServerOptions>
	private handlers: MockServerHandlers = {}
	private connections = new Set<ServerWebSocket<any>>()

	constructor(options: MockServerOptions) {
		this.serializer = options.serializer ?? defaultSerializer
		this.options = {
			debug: false,
			...options,
		}
	}

	/**
	 * Set event handlers
	 */
	setHandlers(handlers: MockServerHandlers): void {
		this.handlers = handlers
	}

	/**
	 * Start the server
	 */
	async start(): Promise<void> {
		if (this.server) {
			throw new Error('Server already started')
		}

		this.server = Bun.serve({
			port: this.options.port,
			fetch: (req, server) => {
				const url = new URL(req.url)
				if (url.pathname === '/ws') {
					const upgraded = server.upgrade(req)
					if (!upgraded) {
						return new Response('WebSocket upgrade failed', { status: 400 })
					}
					return undefined
				}
				return new Response('Not found', { status: 404 })
			},
			websocket: {
				open: ws => {
					this.connections.add(ws)
					this.debug('Client connected')
					this.handlers.onOpen?.(ws)
				},
				message: (ws, data) => {
					try {
						const message = this.serializer.decode(
							typeof data === 'string' ? new TextEncoder().encode(data) : data,
						)
						this.debug('Received message:', message)
						this.handlers.onMessage?.(ws, message)
					} catch (error) {
						// If decoding fails, still call the handler with raw data
						this.debug('Error decoding message, passing raw data:', error)
						this.handlers.onMessage?.(ws, data as any)
					}
				},
				close: (ws, code, reason) => {
					this.connections.delete(ws)
					this.debug('Client disconnected', code, reason)
					this.handlers.onClose?.(ws, code, reason)
				},
				error: (ws, error) => {
					this.debug('Error:', error)
					this.handlers.onError?.(ws, error)
				},
			},
		})

		this.debug(`Server started on port ${this.options.port}`)
	}

	/**
	 * Stop the server
	 */
	async stop(): Promise<void> {
		if (!this.server) {
			return
		}

		// Close all connections
		for (const ws of this.connections) {
			ws.close()
		}
		this.connections.clear()

		this.server.stop()
		this.server = null
		this.debug('Server stopped')
	}

	/**
	 * Send a message to a specific client
	 */
	send(ws: ServerWebSocket<any>, message: ProtocolMessage): void {
		const encoded = this.serializer.encode(message)
		ws.send(encoded)
	}

	/**
	 * Broadcast a message to all connected clients
	 */
	broadcast(message: ProtocolMessage): void {
		const encoded = this.serializer.encode(message)
		for (const ws of this.connections) {
			ws.send(encoded)
		}
	}

	/**
	 * Get all connected clients
	 */
	get clients(): ServerWebSocket<any>[] {
		return Array.from(this.connections)
	}

	/**
	 * Get the number of connected clients
	 */
	get clientCount(): number {
		return this.connections.size
	}

	/**
	 * Get the server URL
	 */
	get url(): string {
		return `ws://localhost:${this.options.port}/ws`
	}

	private debug(...args: any[]): void {
		if (this.options.debug) {
			console.log('[MockServer]', ...args)
		}
	}
}

/**
 * Helper to create a mock server
 */
export function createMockServer(options: MockServerOptions): MockServer {
	return new MockServer(options)
}

/**
 * Helper to send a response message
 */
export function createResponseOk(
	event: string,
	requestId: string,
	timestamp: number,
	payload?: any,
): ProtocolMessage {
	return {
		v: PROTOCOL_VERSION,
		t: MessageType.RESPONSE_OK,
		x: event,
		id: requestId,
		w: timestamp,
		...(payload !== undefined ? { p: payload } : {}),
	}
}

/**
 * Helper to send an error response message
 */
export function createResponseError(
	event: string,
	requestId: string,
	timestamp: number,
	error: string,
): ProtocolMessage {
	return {
		v: PROTOCOL_VERSION,
		t: MessageType.RESPONSE_ERROR,
		x: event,
		id: requestId,
		w: timestamp,
		e: { message: error },
	}
}

/**
 * Helper to send a send message
 */
export function createSendMessage(event: string, payload?: any): ProtocolMessage {
	return {
		v: PROTOCOL_VERSION,
		t: MessageType.SEND,
		x: event,
		...(payload !== undefined ? { p: payload } : {}),
	}
}

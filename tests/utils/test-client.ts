import { defaultSerializer, MessageType, PROTOCOL_VERSION, type Serializer } from '../../src/shared/index.ts'
import type { ProtocolMessage } from '../../src/shared/protocol.ts'

export interface TestClientOptions {
	/** Custom serializer (defaults to CBOR) */
	serializer?: Serializer
	/** Enable debug logging */
	debug?: boolean
}

/**
 * Simplified WebSocket client for testing server implementations
 */
export class TestClient {
	private ws: WebSocket | null = null
	private serializer: Serializer
	private options: Required<TestClientOptions>
	private messageQueue: ProtocolMessage[] = []

	// Lifecycle handlers
	public onOpen?: () => void
	public onMessage?: (message: ProtocolMessage) => void
	public onClose?: (code: number, reason: string) => void
	public onError?: (error: Event) => void

	constructor(options: TestClientOptions = {}) {
		this.serializer = options.serializer ?? defaultSerializer
		this.options = {
			debug: false,
			...options,
		}
	}

	/**
	 * Connect to a WebSocket server
	 */
	async connect(url: string): Promise<void> {
		if (this.ws) {
			throw new Error('Client already connected')
		}

		return new Promise((resolve, reject) => {
			this.ws = new WebSocket(url)
			this.ws.binaryType = 'arraybuffer'

			this.ws.onopen = () => {
				this.debug('Connected')
				this.onOpen?.()
				resolve()
			}

			this.ws.onerror = event => {
				this.debug('Error:', event)
				this.onError?.(event)
				reject(new Error('Connection failed'))
			}

			this.ws.onmessage = event => {
				try {
					const message = this.serializer.decode(event.data)
					this.debug('Received message:', message)
					this.messageQueue.push(message)
					this.onMessage?.(message)
				} catch (error) {
					this.debug('Error decoding message:', error)
				}
			}

			this.ws.onclose = event => {
				this.debug('Disconnected', event.code, event.reason)
				this.onClose?.(event.code, event.reason)
			}
		})
	}

	/**
	 * Disconnect from the server
	 */
	close(code?: number, reason?: string): void {
		if (!this.ws) {
			return
		}

		this.ws.close(code, reason)
		this.ws = null
	}

	/**
	 * Send a protocol message
	 */
	send(message: ProtocolMessage): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('Client not connected')
		}

		const encoded = this.serializer.encode(message)
		this.ws.send(encoded)
		this.debug('Sent message:', message)
	}

	/**
	 * Send a SEND message
	 */
	sendMessage(event: string, payload?: any): void {
		this.send({
			v: PROTOCOL_VERSION,
			t: MessageType.SEND,
			x: event,
			...(payload !== undefined ? { p: payload } : {}),
		})
	}

	/**
	 * Send a REQUEST message
	 */
	sendRequest(event: string, requestId: string, payload?: any): void {
		this.send({
			v: PROTOCOL_VERSION,
			t: MessageType.REQUEST,
			x: event,
			id: requestId,
			w: Date.now(),
			...(payload !== undefined ? { p: payload } : {}),
		})
	}

	/**
	 * Send a RESPONSE_OK message
	 */
	sendResponseOk(event: string, requestId: string, timestamp: number, payload?: any): void {
		this.send({
			v: PROTOCOL_VERSION,
			t: MessageType.RESPONSE_OK,
			x: event,
			id: requestId,
			w: timestamp,
			...(payload !== undefined ? { p: payload } : {}),
		})
	}

	/**
	 * Send a RESPONSE_ERROR message
	 */
	sendResponseError(event: string, requestId: string, timestamp: number, error: string): void {
		this.send({
			v: PROTOCOL_VERSION,
			t: MessageType.RESPONSE_ERROR,
			x: event,
			id: requestId,
			w: timestamp,
			e: { message: error },
		})
	}

	/**
	 * Wait for a specific number of messages
	 */
	async waitForMessages(count: number, timeout = 5000): Promise<ProtocolMessage[]> {
		const startTime = Date.now()
		while (this.messageQueue.length < count) {
			if (Date.now() - startTime > timeout) {
				throw new Error(`Timeout waiting for ${count} messages, got ${this.messageQueue.length}`)
			}
			await new Promise(resolve => setTimeout(resolve, 10))
		}
		return this.messageQueue.slice(0, count)
	}

	/**
	 * Wait for next message
	 */
	async waitForMessage(timeout = 5000): Promise<ProtocolMessage> {
		const messages = await this.waitForMessages(1, timeout)
		return messages[0]
	}

	/**
	 * Get all received messages
	 */
	getMessages(): ProtocolMessage[] {
		return [...this.messageQueue]
	}

	/**
	 * Clear message queue
	 */
	clearMessages(): void {
		this.messageQueue = []
	}

	/**
	 * Check if connected
	 */
	get isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN
	}

	/**
	 * Get ready state
	 */
	get readyState(): number {
		return this.ws?.readyState ?? WebSocket.CLOSED
	}

	private debug(...args: any[]): void {
		if (this.options.debug) {
			console.log('[TestClient]', ...args)
		}
	}
}

/**
 * Helper to create a test client
 */
export function createTestClient(options?: TestClientOptions): TestClient {
	return new TestClient(options)
}

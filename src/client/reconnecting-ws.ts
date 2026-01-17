/**
 * Reconnecting WebSocket wrapper
 * Based on the original ws.ts but cleaned up
 */

export interface ReconnectingWSOptions {
	/** Custom WebSocket constructor (for Node.js environments) */
	WebSocket?: typeof WebSocket
	/** Maximum reconnection delay in ms */
	maxReconnectionDelay?: number
	/** Minimum reconnection delay in ms */
	minReconnectionDelay?: number
	/** Growth factor for reconnection delay */
	reconnectionDelayGrowFactor?: number
	/** Minimum uptime before resetting retry count */
	minUptime?: number
	/** Connection timeout in ms */
	connectionTimeout?: number
	/** Maximum retry attempts */
	maxRetries?: number
	/** Maximum queued messages when disconnected */
	maxEnqueuedMessages?: number
	/** Start in closed state (don't auto-connect) */
	startClosed?: boolean
	/** Enable debug logging */
	debug?: boolean
}

const DEFAULT_OPTIONS: Required<ReconnectingWSOptions> = {
	WebSocket: typeof WebSocket !== 'undefined' ? WebSocket : (null as any),
	maxReconnectionDelay: 10000,
	minReconnectionDelay: 1000 + Math.random() * 4000,
	reconnectionDelayGrowFactor: 1.3,
	minUptime: 5000,
	connectionTimeout: 4000,
	maxRetries: Infinity,
	maxEnqueuedMessages: Infinity,
	startClosed: false,
	debug: false,
}

export type UrlProvider = string | (() => string) | (() => Promise<string>)

export class ReconnectingWS {
	private ws?: WebSocket
	private retryCount = -1
	private uptimeTimeout?: ReturnType<typeof setTimeout>
	private connectTimeout?: ReturnType<typeof setTimeout>
	private shouldReconnect = true
	private connectLock = false
	private binaryType: BinaryType = 'arraybuffer'
	private closeCalled = false
	private messageQueue: (string | ArrayBuffer | Blob | ArrayBufferView)[] = []

	private readonly url: UrlProvider
	private readonly protocols?: string | string[]
	private readonly options: Required<ReconnectingWSOptions>

	// Event handlers
	public onopen?: (event: Event) => void
	public onclose?: (event: CloseEvent) => void
	public onerror?: (event: Event) => void
	public onmessage?: (event: MessageEvent) => void

	constructor(
		url: UrlProvider,
		protocols?: string | string[],
		options: ReconnectingWSOptions = {},
	) {
		this.url = url
		this.protocols = protocols
		this.options = { ...DEFAULT_OPTIONS, ...options }

		if (this.options.startClosed) {
			this.shouldReconnect = false
		}
	}

	/**
	 * WebSocket ready states
	 */
	static readonly CONNECTING = 0 as const
	static readonly OPEN = 1 as const
	static readonly CLOSING = 2 as const
	static readonly CLOSED = 3 as const

	get readyState(): number {
		if (this.ws) {
			return this.ws.readyState
		}
		return this.options.startClosed
			? ReconnectingWS.CLOSED
			: ReconnectingWS.CONNECTING
	}

	get bufferedAmount(): number {
		const queuedBytes = this.messageQueue.reduce((acc, message) => {
			if (typeof message === 'string') {
				acc += message.length
			} else if (message instanceof Blob) {
				acc += message.size
			} else {
				acc += message.byteLength
			}
			return acc
		}, 0)
		return queuedBytes + (this.ws?.bufferedAmount ?? 0)
	}

	get currentUrl(): string {
		return this.ws?.url ?? ''
	}

	get protocol(): string {
		return this.ws?.protocol ?? ''
	}

	get extensions(): string {
		return this.ws?.extensions ?? ''
	}

	/**
	 * Connect or reconnect to the WebSocket server
	 */
	connect(): void {
		if (this.connectLock || !this.shouldReconnect) {
			return
		}

		this.connectLock = true

		if (this.retryCount >= this.options.maxRetries) {
			this.debug('max retries reached')
			return
		}

		this.retryCount++
		this.debug('connecting, attempt', this.retryCount)

		this.removeListeners()

		this.wait()
			.then(() => this.resolveUrl())
			.then((url) => {
				if (this.closeCalled) {
					return
				}

				const WS = this.options.WebSocket
				if (!WS) {
					throw new Error('No WebSocket constructor available')
				}

				this.debug('creating websocket', url)
				this.ws = this.protocols ? new WS(url, this.protocols) : new WS(url)

				this.ws.binaryType = this.binaryType
				this.connectLock = false
				this.addListeners()

				clearTimeout(this.connectTimeout)
				this.connectTimeout = setTimeout(() => {
					this.handleTimeout()
				}, this.options.connectionTimeout)
			})
			.catch((error) => {
				this.debug('connection error', error)
				this.connectLock = false
				this.connect()
			})
	}

	/**
	 * Close the connection
	 */
	close(code = 1000, reason?: string): void {
		this.closeCalled = true
		this.shouldReconnect = false
		this.clearTimeouts()

		if (!this.ws) {
			this.debug('close enqueued: no ws instance')
			return
		}

		if (this.ws.readyState === ReconnectingWS.CLOSED) {
			this.debug('already closed')
			return
		}

		this.ws.close(code, reason)
	}

	/**
	 * Send a message
	 */
	send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
		if (this.ws && this.ws.readyState === ReconnectingWS.OPEN) {
			this.debug('sending message')
			this.ws.send(data)
		} else {
			if (this.messageQueue.length < this.options.maxEnqueuedMessages) {
				this.debug('queueing message')
				this.messageQueue.push(data)
			} else {
				this.debug('message queue full, dropping message')
			}
		}
	}

	/**
	 * Reconnect (alias for backwards compatibility)
	 */
	reconnect(code?: number, reason?: string): void {
		this.shouldReconnect = true
		this.closeCalled = false
		this.retryCount = -1

		if (!this.ws || this.ws.readyState === ReconnectingWS.CLOSED) {
			this.connect()
		} else {
			this.disconnect(code, reason)
			this.connect()
		}
	}

	private async resolveUrl(): Promise<string> {
		if (typeof this.url === 'string') {
			return this.url
		}
		const result = this.url()
		return result instanceof Promise ? result : result
	}

	private wait(): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, this.getNextDelay())
		})
	}

	private getNextDelay(): number {
		if (this.retryCount === 0) {
			return 0
		}

		let delay = this.options.minReconnectionDelay
			* this.options.reconnectionDelayGrowFactor ** (this.retryCount - 1)

		if (delay > this.options.maxReconnectionDelay) {
			delay = this.options.maxReconnectionDelay
		}

		this.debug('next delay', delay)
		return delay
	}

	private handleOpen = (event: Event): void => {
		this.debug('opened')
		clearTimeout(this.connectTimeout)

		this.uptimeTimeout = setTimeout(() => {
			this.debug('connection stable, resetting retry count')
			this.retryCount = 0
		}, this.options.minUptime)

		// Send queued messages
		for (const message of this.messageQueue) {
			this.ws?.send(message)
		}
		this.messageQueue = []

		this.onopen?.(event)
	}

	private handleClose = (event: CloseEvent): void => {
		this.debug('closed', event.code, event.reason)
		this.clearTimeouts()

		if (this.shouldReconnect) {
			this.connect()
		}

		this.onclose?.(event)
	}

	private handleError = (event: Event): void => {
		this.debug('error')
		this.disconnect()
		this.onerror?.(event)
		this.connect()
	}

	private handleMessage = (event: MessageEvent): void => {
		this.onmessage?.(event)
	}

	private handleTimeout(): void {
		this.debug('connection timeout')
		this.disconnect(undefined, 'timeout')
		this.connect()
	}

	private disconnect(code = 1000, reason?: string): void {
		this.clearTimeouts()
		if (!this.ws) {
			return
		}

		this.removeListeners()
		try {
			this.ws.close(code, reason)
		} catch (error) {
			// Ignore
		}
	}

	private addListeners(): void {
		if (!this.ws) return

		this.ws.addEventListener('open', this.handleOpen)
		this.ws.addEventListener('close', this.handleClose)
		this.ws.addEventListener('error', this.handleError)
		this.ws.addEventListener('message', this.handleMessage)
	}

	private removeListeners(): void {
		if (!this.ws) return

		this.ws.removeEventListener('open', this.handleOpen)
		this.ws.removeEventListener('close', this.handleClose)
		this.ws.removeEventListener('error', this.handleError)
		this.ws.removeEventListener('message', this.handleMessage)
	}

	private clearTimeouts(): void {
		clearTimeout(this.connectTimeout)
		clearTimeout(this.uptimeTimeout)
	}

	private debug(...args: any[]): void {
		if (this.options.debug) {
			console.log('[ReconnectingWS]', ...args)
		}
	}
}

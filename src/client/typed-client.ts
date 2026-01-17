import { z } from 'zod'
import {
	createTimeout,
	defaultSerializer,
	generateRequestId,
	matchesRequest,
	MessageType,
	normalizeError,
	PROTOCOL_VERSION,
	type RequestMessage,
	type ResponseErrorMessage,
	type ResponseOkMessage,
	type Serializer,
} from '../shared/index.ts'
import type { EventDefinition, InferEventMap } from '../shared/schema.ts'
import { ReconnectingWS, type ReconnectingWSOptions, type UrlProvider } from './reconnecting-ws.ts'

export interface TypedWSClientOptions extends ReconnectingWSOptions {
	/** Custom serializer (defaults to CBOR) */
	serializer?: Serializer
	/** Default request timeout in ms */
	requestTimeout?: number
	/** Enable runtime validation with Zod */
	validate?: boolean
}

interface PendingRequest {
	resolve: (value: any) => void
	reject: (error: any) => void
	timeout?: ReturnType<typeof setTimeout>
}

/**
 * Typed WebSocket client with request/response pattern
 */
export class TypedWSClient<TEvents extends Record<string, EventDefinition>> {
	private ws: ReconnectingWS
	private serializer: Serializer
	private eventSchemas: TEvents
	private pendingRequests = new Map<string, PendingRequest>()
	private options: TypedWSClientOptions
	private eventHandlers = new Map<string, Set<Function>>()

	constructor(
		url: UrlProvider,
		events: TEvents,
		options: TypedWSClientOptions = {},
	) {
		this.eventSchemas = events
		this.serializer = options.serializer ?? defaultSerializer
		this.options = {
			requestTimeout: 30000,
			validate: true,
			...options,
		}

		this.ws = new ReconnectingWS(url, undefined, options)
		this.ws.onmessage = this.handleMessage.bind(this)
		this.ws.onerror = this.handleError.bind(this)
		this.ws.onclose = this.handleClose.bind(this)
	}

	/**
	 * Connect to the WebSocket server
	 */
	connect(): void {
		this.ws.connect()
	}

	/**
	 * Close the connection
	 */
	close(code?: number, reason?: string): void {
		// Reject all pending requests
		for (const [key, pending] of this.pendingRequests) {
			clearTimeout(pending.timeout)
			pending.reject(new Error('Connection closed'))
		}
		this.pendingRequests.clear()

		this.ws.close(code, reason)
	}

	/**
	 * Get connection state
	 */
	get readyState(): number {
		return this.ws.readyState
	}

	/**
	 * Send a one-way message (fire and forget)
	 */
	send<K extends keyof TEvents>(
		event: K,
		payload?: InferEventMap<TEvents>[K]['request'],
	): void {
		const eventName = event as string

		// Validate payload if enabled
		if (this.options.validate && this.eventSchemas[eventName]?.request) {
			this.eventSchemas[eventName].request!.parse(payload)
		}

		const message = {
			v: PROTOCOL_VERSION,
			t: MessageType.SEND,
			x: eventName,
			...(payload !== undefined ? { p: payload } : {}),
		}

		const encoded = this.serializer.encode(message)
		this.ws.send(encoded)
	}

	/**
	 * Send a request and wait for response
	 */
	async request<K extends keyof TEvents>(
		event: K,
		payload?: InferEventMap<TEvents>[K]['request'],
		options?: { timeout?: number; requestId?: string },
	): Promise<InferEventMap<TEvents>[K]['response']> {
		const eventName = event as string

		// Validate request payload if enabled
		if (this.options.validate && this.eventSchemas[eventName]?.request) {
			this.eventSchemas[eventName].request!.parse(payload)
		}

		const requestId = options?.requestId ?? generateRequestId()
		const timestamp = Date.now()

		const message: RequestMessage = {
			v: PROTOCOL_VERSION,
			t: MessageType.REQUEST,
			x: eventName,
			id: requestId,
			w: timestamp,
			...(payload !== undefined ? { p: payload } : {}),
		}

		const encoded = this.serializer.encode(message)

		return new Promise((resolve, reject) => {
			const timeout = options?.timeout ?? this.options.requestTimeout!
			const timeoutHandle = setTimeout(() => {
				this.pendingRequests.delete(requestId)
				reject(new Error(`Request timeout after ${timeout}ms`))
			}, timeout)

			this.pendingRequests.set(requestId, {
				resolve,
				reject,
				timeout: timeoutHandle,
			})

			this.ws.send(encoded)
		})
	}

	/**
	 * Register handler for incoming send messages
	 */
	on<K extends keyof TEvents>(
		event: K,
		handler: (payload: InferEventMap<TEvents>[K]['request']) => void,
	): void {
		const eventName = event as string
		if (!this.eventHandlers.has(eventName)) {
			this.eventHandlers.set(eventName, new Set())
		}
		this.eventHandlers.get(eventName)!.add(handler)
	}

	/**
	 * Remove event handler
	 */
	off<K extends keyof TEvents>(
		event: K,
		handler: (payload: InferEventMap<TEvents>[K]['request']) => void,
	): void {
		const eventName = event as string
		this.eventHandlers.get(eventName)?.delete(handler)
	}

	/**
	 * Register handler for lifecycle events
	 */
	onOpen(handler: () => void): void {
		const existingHandler = this.ws.onopen
		this.ws.onopen = (event) => {
			existingHandler?.(event)
			handler()
		}
	}

	onClose(handler: (event: CloseEvent) => void): void {
		const existingHandler = this.ws.onclose
		this.ws.onclose = (event) => {
			existingHandler?.(event)
			handler(event)
		}
	}

	onError(handler: (event: Event) => void): void {
		const existingHandler = this.ws.onerror
		this.ws.onerror = (event) => {
			existingHandler?.(event)
			handler(event)
		}
	}

	private handleMessage(event: MessageEvent): void {
		try {
			const message = this.serializer.decode(event.data)

			// Handle responses
			if (
				message.t === MessageType.RESPONSE_OK
				|| message.t === MessageType.RESPONSE_ERROR
			) {
				this.handleResponse(message)
				return
			}

			// Handle incoming send messages
			if (message.t === MessageType.SEND) {
				const handlers = this.eventHandlers.get(message.x)
				if (handlers) {
					// Validate payload if enabled
					let payload = message.p
					if (this.options.validate && this.eventSchemas[message.x]?.request) {
						payload = this.eventSchemas[message.x].request!.parse(payload)
					}

					for (const handler of handlers) {
						try {
							handler(payload)
						} catch (error) {
							console.error('Error in event handler:', error)
						}
					}
				}
			}
		} catch (error) {
			console.error('Error handling message:', error)
		}
	}

	private handleResponse(
		message: ResponseOkMessage | ResponseErrorMessage,
	): void {
		const requestId = message.id ?? `${message.w}-${message.x}`
		const pending = this.pendingRequests.get(requestId)

		if (!pending) {
			console.warn('Received response for unknown request:', requestId)
			return
		}

		clearTimeout(pending.timeout)
		this.pendingRequests.delete(requestId)

		if (message.t === MessageType.RESPONSE_OK) {
			// Validate response payload if enabled
			let payload = message.p
			if (this.options.validate && this.eventSchemas[message.x]?.response) {
				try {
					payload = this.eventSchemas[message.x].response!.parse(payload)
				} catch (error) {
					pending.reject(error)
					return
				}
			}

			pending.resolve(payload)
		} else {
			pending.reject(new Error(message.e.message))
		}
	}

	private handleError(event: Event): void {
		// Errors are handled by the reconnecting wrapper
	}

	private handleClose(event: CloseEvent): void {
		// Reject all pending requests on close
		for (const [key, pending] of this.pendingRequests) {
			clearTimeout(pending.timeout)
			pending.reject(new Error('Connection closed'))
		}
		this.pendingRequests.clear()
	}
}

/**
 * Helper to create a typed client
 */
export function createClient<TEvents extends Record<string, EventDefinition>>(
	url: UrlProvider,
	events: TEvents,
	options?: TypedWSClientOptions,
) {
	return new TypedWSClient(url, events, options)
}

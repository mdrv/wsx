import type { ServerWebSocket } from 'bun'
import {
	defaultSerializer,
	MessageType,
	normalizeError,
	PROTOCOL_VERSION,
	type RequestMessage,
	type SendMessage,
	type Serializer,
} from '../shared/index.ts'
import type {
	EventDefinition,
	InferEventMap,
	RequestHandler,
	SendHandler,
} from '../shared/schema.ts'

/**
 * Typed WebSocket connection wrapper for server
 */
export class TypedWSConnection<
	TEvents extends Record<string, EventDefinition>,
> {
	private ws: ServerWebSocket<any>
	private serializer: Serializer
	private eventSchemas: TEvents
	private validate: boolean

	constructor(
		ws: ServerWebSocket<any>,
		eventSchemas: TEvents,
		serializer: Serializer = defaultSerializer,
		validate: boolean = true,
	) {
		this.ws = ws
		this.eventSchemas = eventSchemas
		this.serializer = serializer
		this.validate = validate
	}

	/**
	 * Send a one-way message to client
	 */
	send<K extends keyof TEvents>(
		event: K,
		payload?: InferEventMap<TEvents>[K]['response'],
	): void {
		const eventName = event as string

		// Validate payload if enabled
		if (this.validate && this.eventSchemas[eventName]?.response) {
			this.eventSchemas[eventName].response!.parse(payload)
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
	 * Send a successful response to a request
	 */
	respond<K extends keyof TEvents>(
		event: K,
		requestId: string | undefined,
		timestamp: number,
		payload?: InferEventMap<TEvents>[K]['response'],
	): void {
		const eventName = event as string

		// Validate payload if enabled
		if (this.validate && this.eventSchemas[eventName]?.response) {
			this.eventSchemas[eventName].response!.parse(payload)
		}

		const message = {
			v: PROTOCOL_VERSION,
			t: MessageType.RESPONSE_OK,
			x: eventName,
			...(requestId ? { id: requestId } : {}),
			w: timestamp,
			...(payload !== undefined ? { p: payload } : {}),
		}

		const encoded = this.serializer.encode(message)
		this.ws.send(encoded)
	}

	/**
	 * Send an error response to a request
	 */
	respondError(
		event: string,
		requestId: string | undefined,
		timestamp: number,
		error: unknown,
	): void {
		const message = {
			v: PROTOCOL_VERSION,
			t: MessageType.RESPONSE_ERROR,
			x: event,
			...(requestId ? { id: requestId } : {}),
			w: timestamp,
			e: normalizeError(error),
		}

		const encoded = this.serializer.encode(message)
		this.ws.send(encoded)
	}

	/**
	 * Close the connection
	 */
	close(code?: number, reason?: string): void {
		this.ws.close(code, reason)
	}

	/**
	 * Get raw WebSocket
	 */
	get raw(): ServerWebSocket<any> {
		return this.ws
	}
}

export interface TypedWSServerOptions {
	/** Custom serializer (defaults to CBOR) */
	serializer?: Serializer
	/** Enable runtime validation with Zod */
	validate?: boolean
	/** Enable debug logging */
	debug?: boolean
}

/**
 * Typed WebSocket server handler
 */
export class TypedWSServer<TEvents extends Record<string, EventDefinition>> {
	private eventSchemas: TEvents
	private serializer: Serializer
	private options: Required<TypedWSServerOptions>
	private sendHandlers = new Map<string, Set<SendHandler<any>>>()
	private requestHandlers = new Map<string, Set<RequestHandler<any, any>>>()

	constructor(events: TEvents, options: TypedWSServerOptions = {}) {
		this.eventSchemas = events
		this.serializer = options.serializer ?? defaultSerializer
		this.options = {
			validate: true,
			debug: false,
			...options,
		}
	}

	/**
	 * Register handler for send messages (one-way)
	 */
	onSend<K extends keyof TEvents>(
		event: K,
		handler: SendHandler<InferEventMap<TEvents>[K]['request']>,
	): void {
		const eventName = event as string
		if (!this.sendHandlers.has(eventName)) {
			this.sendHandlers.set(eventName, new Set())
		}
		this.sendHandlers.get(eventName)!.add(handler)
	}

	/**
	 * Register handler for request messages (request/response)
	 */
	onRequest<K extends keyof TEvents>(
		event: K,
		handler: RequestHandler<
			InferEventMap<TEvents>[K]['request'],
			InferEventMap<TEvents>[K]['response']
		>,
	): void {
		const eventName = event as string
		if (!this.requestHandlers.has(eventName)) {
			this.requestHandlers.set(eventName, new Set())
		}
		this.requestHandlers.get(eventName)!.add(handler)
	}

	/**
	 * Handle incoming message from client
	 */
	async handleMessage(
		ws: ServerWebSocket<any>,
		data: ArrayBuffer | string,
	): Promise<void> {
		try {
			const message = this.serializer.decode(
				typeof data === 'string' ? new TextEncoder().encode(data) : data,
			)

			this.debug('Received message:', message)

			const connection = new TypedWSConnection(
				ws,
				this.eventSchemas,
				this.serializer,
				this.options.validate,
			)

			if (message.t === MessageType.SEND) {
				await this.handleSend(connection, message)
			} else if (message.t === MessageType.REQUEST) {
				await this.handleRequest(connection, message)
			}
		} catch (error) {
			console.error('Error handling message:', error)
		}
	}

	private async handleSend(
		connection: TypedWSConnection<TEvents>,
		message: SendMessage,
	): Promise<void> {
		const handlers = this.sendHandlers.get(message.x)
		if (!handlers || handlers.size === 0) {
			this.debug('No handler for send event:', message.x)
			return
		}

		// Validate payload if enabled
		let payload = message.p
		if (this.options.validate && this.eventSchemas[message.x]?.request) {
			try {
				payload = this.eventSchemas[message.x].request!.parse(payload)
			} catch (error) {
				console.error('Validation error for send message:', error)
				return
			}
		}

		for (const handler of handlers) {
			try {
				await handler(payload)
			} catch (error) {
				console.error('Error in send handler:', error)
			}
		}
	}

	private async handleRequest(
		connection: TypedWSConnection<TEvents>,
		message: RequestMessage,
	): Promise<void> {
		const handlers = this.requestHandlers.get(message.x)
		if (!handlers || handlers.size === 0) {
			this.debug('No handler for request event:', message.x)
			connection.respondError(
				message.x,
				message.id,
				message.w,
				`No handler for event: ${message.x}`,
			)
			return
		}

		// Validate payload if enabled
		let payload = message.p
		if (this.options.validate && this.eventSchemas[message.x]?.request) {
			try {
				payload = this.eventSchemas[message.x].request!.parse(payload)
			} catch (error) {
				connection.respondError(message.x, message.id, message.w, error)
				return
			}
		}

		// Call the first handler (only one handler per request event)
		const handler = Array.from(handlers)[0]
		try {
			const result = await handler(payload)
			connection.respond(
				message.x as keyof TEvents,
				message.id,
				message.w,
				result,
			)
		} catch (error) {
			connection.respondError(message.x, message.id, message.w, error)
		}
	}

	private debug(...args: any[]): void {
		if (this.options.debug) {
			console.log('[TypedWSServer]', ...args)
		}
	}
}

/**
 * Helper to create a typed server
 */
export function createServer<TEvents extends Record<string, EventDefinition>>(
	events: TEvents,
	options?: TypedWSServerOptions,
) {
	return new TypedWSServer(events, options)
}

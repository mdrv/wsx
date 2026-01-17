/**
 * Protocol version for compatibility checking
 * Format: MAJOR.MINOR (e.g., "1.0", "1.1", "2.0")
 *
 * - MAJOR: Breaking changes to message format or behavior
 * - MINOR: Backward-compatible additions
 */
export const PROTOCOL_VERSION = '1.0'

/**
 * Message types in the protocol
 */
export enum MessageType {
	/** One-way message (fire and forget) */
	SEND = 'send',
	/** Request expecting a response */
	REQUEST = 'request',
	/** Response to a request (success) */
	RESPONSE_OK = 'response_ok',
	/** Response to a request (error) */
	RESPONSE_ERROR = 'response_error',
}

/**
 * Base message structure
 */
export interface BaseMessage {
	/** Protocol version */
	v: string
	/** Message type */
	t: MessageType
	/** Event name/action */
	x: string
}

/**
 * One-way send message
 */
export interface SendMessage<TPayload = unknown> extends BaseMessage {
	t: MessageType.SEND
	/** Optional payload */
	p?: TPayload
}

/**
 * Request message (expects response)
 */
export interface RequestMessage<TPayload = unknown> extends BaseMessage {
	t: MessageType.REQUEST
	/** Request ID for matching response */
	id?: string
	/** Timestamp for fallback matching */
	w: number
	/** Optional payload */
	p?: TPayload
}

/**
 * Successful response message
 */
export interface ResponseOkMessage<TPayload = unknown> extends BaseMessage {
	t: MessageType.RESPONSE_OK
	/** Request ID (if provided in request) */
	id?: string
	/** Timestamp from original request */
	w: number
	/** Response payload */
	p?: TPayload
}

/**
 * Error response message
 */
export interface ResponseErrorMessage extends BaseMessage {
	t: MessageType.RESPONSE_ERROR
	/** Request ID (if provided in request) */
	id?: string
	/** Timestamp from original request */
	w: number
	/** Error details */
	e: {
		/** Error message */
		message: string
		/** Optional error cause/stack */
		cause?: any
	}
}

/**
 * Union of all message types
 */
export type Message =
	| SendMessage
	| RequestMessage
	| ResponseOkMessage
	| ResponseErrorMessage

/**
 * Type guard for messages
 */
export function isSendMessage(msg: Message): msg is SendMessage {
	return msg.t === MessageType.SEND
}

export function isRequestMessage(msg: Message): msg is RequestMessage {
	return msg.t === MessageType.REQUEST
}

export function isResponseOkMessage(msg: Message): msg is ResponseOkMessage {
	return msg.t === MessageType.RESPONSE_OK
}

export function isResponseErrorMessage(
	msg: Message,
): msg is ResponseErrorMessage {
	return msg.t === MessageType.RESPONSE_ERROR
}

/**
 * Check if response matches request
 */
export function matchesRequest(
	response: ResponseOkMessage | ResponseErrorMessage,
	request: RequestMessage,
): boolean {
	// Prefer ID matching if available
	if (request.id && response.id) {
		return request.id === response.id && request.x === response.x
	}
	// Fallback to timestamp + event name matching
	return request.w === response.w && request.x === response.x
}

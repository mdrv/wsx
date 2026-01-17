import { z } from 'zod'
import { MessageType } from './protocol.ts'

/**
 * Schema for event definitions
 * Each event can have optional request and response payloads
 */
export const EventSchema = z.object({
	/** Request payload schema (optional) */
	request: z.any().optional(),
	/** Response payload schema (optional) */
	response: z.any().optional(),
})

export type EventDefinition = z.infer<typeof EventSchema>

/**
 * Base message schemas
 */
const BaseMessageSchema = z.object({
	v: z.string(),
	t: z.nativeEnum(MessageType),
	x: z.string(),
})

export const SendMessageSchema = BaseMessageSchema.extend({
	t: z.literal(MessageType.SEND),
	p: z.any().optional(),
})

export const RequestMessageSchema = BaseMessageSchema.extend({
	t: z.literal(MessageType.REQUEST),
	id: z.string().optional(),
	w: z.number(),
	p: z.any().optional(),
})

export const ResponseOkMessageSchema = BaseMessageSchema.extend({
	t: z.literal(MessageType.RESPONSE_OK),
	id: z.string().optional(),
	w: z.number(),
	p: z.any().optional(),
})

export const ResponseErrorMessageSchema = BaseMessageSchema.extend({
	t: z.literal(MessageType.RESPONSE_ERROR),
	id: z.string().optional(),
	w: z.number(),
	e: z.object({
		message: z.string(),
		cause: z.any().optional(),
	}),
})

export const MessageSchema = z.discriminatedUnion('t', [
	SendMessageSchema,
	RequestMessageSchema,
	ResponseOkMessageSchema,
	ResponseErrorMessageSchema,
])

/**
 * Helper to create a typed event schema
 */
export function defineEvents<
	T extends Record<string, { request?: z.ZodType; response?: z.ZodType }>,
>(events: T) {
	return events
}

/**
 * Extract TypeScript types from event definitions
 */
export type InferEventMap<T extends Record<string, EventDefinition>> = {
	[K in keyof T]: {
		request: T[K]['request'] extends z.ZodType ? z.infer<T[K]['request']>
			: never
		response: T[K]['response'] extends z.ZodType ? z.infer<T[K]['response']>
			: never
	}
}

/**
 * Type for send handlers (one-way messages)
 */
export type SendHandler<TReq> = TReq extends never ? () => void | Promise<void>
	: (payload: TReq) => void | Promise<void>

/**
 * Type for request handlers (request/response)
 */
export type RequestHandler<TReq, TRes> = TReq extends never ? () => TRes | Promise<TRes>
	: (payload: TReq) => TRes | Promise<TRes>

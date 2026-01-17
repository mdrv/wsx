import { describe, expect, it } from 'bun:test'
import {
	isRequestMessage,
	isResponseErrorMessage,
	isResponseOkMessage,
	isSendMessage,
	matchesRequest,
	MessageType,
	PROTOCOL_VERSION,
	type RequestMessage,
	type ResponseErrorMessage,
	type ResponseOkMessage,
	type SendMessage,
} from '../shared/protocol.ts'

describe('Protocol', () => {
	describe('Constants', () => {
		it('should have correct protocol version', () => {
			expect(PROTOCOL_VERSION).toBe('1.0')
		})

		it('should have correct message types', () => {
			expect(MessageType.SEND).toBeDefined()
			expect(MessageType.REQUEST).toBeDefined()
			expect(MessageType.RESPONSE_OK).toBeDefined()
			expect(MessageType.RESPONSE_ERROR).toBeDefined()

			// Ensure they are unique
			const types = [
				MessageType.SEND,
				MessageType.REQUEST,
				MessageType.RESPONSE_OK,
				MessageType.RESPONSE_ERROR,
			]
			const uniqueTypes = new Set(types)
			expect(uniqueTypes.size).toBe(4)
		})
	})

	describe('matchesRequest', () => {
		it('should match request and response by ID', () => {
			const request: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				id: 'req-123',
				w: 1000,
			}

			const response: ResponseOkMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_OK,
				x: 'test',
				id: 'req-123',
				w: 1000,
			}

			expect(matchesRequest(response, request)).toBe(true)
		})

		it('should match request and response by timestamp fallback', () => {
			const request: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				w: 1000,
			}

			const response: ResponseOkMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_OK,
				x: 'test',
				w: 1000,
			}

			expect(matchesRequest(response, request)).toBe(true)
		})

		it('should not match different events', () => {
			const request: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test1',
				id: 'req-123',
				w: 1000,
			}

			const response: ResponseOkMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_OK,
				x: 'test2',
				id: 'req-123',
				w: 1000,
			}

			expect(matchesRequest(response, request)).toBe(false)
		})

		it('should not match different timestamps when no ID', () => {
			const request: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				w: 1000,
			}

			const response: ResponseOkMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_OK,
				x: 'test',
				w: 2000,
			}

			expect(matchesRequest(response, request)).toBe(false)
		})

		it('should match error responses', () => {
			const request: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				id: 'req-123',
				w: 1000,
			}

			const response: ResponseErrorMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_ERROR,
				x: 'test',
				id: 'req-123',
				w: 1000,
				e: { message: 'error' },
			}

			expect(matchesRequest(response, request)).toBe(true)
		})

		it('should prioritize ID matching over timestamp', () => {
			const request: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				id: 'req-123',
				w: 1000,
			}

			const response: ResponseOkMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_OK,
				x: 'test',
				id: 'req-123',
				w: 2000, // Different timestamp
			}

			expect(matchesRequest(response, request)).toBe(true)
		})
	})

	describe('Type Guards', () => {
		it('should identify send messages', () => {
			const message: SendMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.SEND,
				x: 'test',
			}

			expect(isSendMessage(message)).toBe(true)
			expect(isRequestMessage(message)).toBe(false)
			expect(isResponseOkMessage(message)).toBe(false)
			expect(isResponseErrorMessage(message)).toBe(false)
		})

		it('should identify request messages', () => {
			const message: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				w: 1000,
			}

			expect(isRequestMessage(message)).toBe(true)
			expect(isSendMessage(message)).toBe(false)
			expect(isResponseOkMessage(message)).toBe(false)
			expect(isResponseErrorMessage(message)).toBe(false)
		})

		it('should identify response OK messages', () => {
			const message: ResponseOkMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_OK,
				x: 'test',
				w: 1000,
			}

			expect(isResponseOkMessage(message)).toBe(true)
			expect(isSendMessage(message)).toBe(false)
			expect(isRequestMessage(message)).toBe(false)
			expect(isResponseErrorMessage(message)).toBe(false)
		})

		it('should identify response ERROR messages', () => {
			const message: ResponseErrorMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_ERROR,
				x: 'test',
				w: 1000,
				e: { message: 'error' },
			}

			expect(isResponseErrorMessage(message)).toBe(true)
			expect(isSendMessage(message)).toBe(false)
			expect(isRequestMessage(message)).toBe(false)
			expect(isResponseOkMessage(message)).toBe(false)
		})
	})

	describe('Message Structure', () => {
		it('should handle messages with payloads', () => {
			const message: SendMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.SEND,
				x: 'test',
				p: { data: 'test' },
			}

			expect(isSendMessage(message)).toBe(true)
			expect(message.p).toEqual({ data: 'test' })
		})

		it('should handle messages without optional payloads', () => {
			const message: SendMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.SEND,
				x: 'test',
			}

			expect(isSendMessage(message)).toBe(true)
			expect(message.p).toBeUndefined()
		})

		it('should handle request messages with ID', () => {
			const message: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				id: 'custom-id',
				w: 1000,
			}

			expect(isRequestMessage(message)).toBe(true)
			expect(message.id).toBe('custom-id')
		})

		it('should handle request messages without ID', () => {
			const message: RequestMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.REQUEST,
				x: 'test',
				w: 1000,
			}

			expect(isRequestMessage(message)).toBe(true)
			expect(message.id).toBeUndefined()
		})

		it('should include error details in error responses', () => {
			const message: ResponseErrorMessage = {
				v: PROTOCOL_VERSION,
				t: MessageType.RESPONSE_ERROR,
				x: 'test',
				w: 1000,
				e: {
					message: 'Something went wrong',
					cause: 'Network error',
				},
			}

			expect(isResponseErrorMessage(message)).toBe(true)
			expect(message.e.message).toBe('Something went wrong')
			expect(message.e.cause).toBe('Network error')
		})
	})
})

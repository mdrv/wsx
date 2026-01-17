import { describe, expect, it } from 'bun:test'
import { matchesRequest, MessageType, PROTOCOL_VERSION } from '../shared/protocol.ts'

describe('Protocol', () => {
	it('should have correct protocol version', () => {
		expect(PROTOCOL_VERSION).toBe('1.0')
	})

	it('should match request and response by ID', () => {
		const request = {
			v: PROTOCOL_VERSION,
			t: MessageType.REQUEST,
			x: 'test',
			id: 'req-123',
			w: 1000,
		}

		const response = {
			v: PROTOCOL_VERSION,
			t: MessageType.RESPONSE_OK,
			x: 'test',
			id: 'req-123',
			w: 1000,
		}

		expect(matchesRequest(response, request)).toBe(true)
	})

	it('should match request and response by timestamp fallback', () => {
		const request = {
			v: PROTOCOL_VERSION,
			t: MessageType.REQUEST,
			x: 'test',
			w: 1000,
		}

		const response = {
			v: PROTOCOL_VERSION,
			t: MessageType.RESPONSE_OK,
			x: 'test',
			w: 1000,
		}

		expect(matchesRequest(response, request)).toBe(true)
	})

	it('should not match different events', () => {
		const request = {
			v: PROTOCOL_VERSION,
			t: MessageType.REQUEST,
			x: 'test1',
			id: 'req-123',
			w: 1000,
		}

		const response = {
			v: PROTOCOL_VERSION,
			t: MessageType.RESPONSE_OK,
			x: 'test2',
			id: 'req-123',
			w: 1000,
		}

		expect(matchesRequest(response, request)).toBe(false)
	})
})

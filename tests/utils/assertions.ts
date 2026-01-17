import { expect } from 'bun:test'
import type { Message } from '../../src/shared/protocol.ts'
import { PROTOCOL_VERSION } from '../../src/shared/protocol.ts'

/**
 * Assert that a message is valid and has the expected protocol version
 */
export function expectValidMessage(message: any): asserts message is Message {
	expect(message).toBeDefined()
	expect(message).toBeTypeOf('object')
	expect(message.v).toBe(PROTOCOL_VERSION)
	expect(message.t).toBeDefined()
	expect(message.x).toBeDefined()
}

/**
 * Assert that a message matches expected partial structure
 */
export function expectMessage(received: any, expected: Partial<Message>): void {
	expect(received).toBeDefined()

	if (expected.v !== undefined) {
		expect(received.v).toBe(expected.v)
	}
	if (expected.t !== undefined) {
		expect(received.t).toBe(expected.t)
	}
	if (expected.x !== undefined) {
		expect(received.x).toBe(expected.x)
	}
	if (expected.id !== undefined) {
		expect(received.id).toBe(expected.id)
	}
	if (expected.w !== undefined) {
		expect(received.w).toBe(expected.w)
	}
	if (expected.p !== undefined) {
		expect(received.p).toEqual(expected.p)
	}
}

/**
 * Assert that a value is a WebSocket-compatible message (binary or string)
 */
export function expectWebSocketMessage(message: any): void {
	const isValid = message instanceof ArrayBuffer
		|| message instanceof Uint8Array
		|| ArrayBuffer.isView(message)
		|| typeof message === 'string'

	expect(isValid).toBe(true)
}

/**
 * Assert that an error has the expected message
 */
export function expectErrorMessage(error: any, expectedMessage: string): void {
	expect(error).toBeInstanceOf(Error)
	expect(error.message).toContain(expectedMessage)
}

/**
 * Assert that a promise rejects with an error containing the expected message
 */
export async function expectRejection(
	promise: Promise<any>,
	expectedMessage?: string,
): Promise<void> {
	let error: any
	try {
		await promise
		throw new Error('Expected promise to reject, but it resolved')
	} catch (e) {
		error = e
	}

	if (expectedMessage) {
		expectErrorMessage(error, expectedMessage)
	}
}

/**
 * Assert that a value is within a range
 */
export function expectInRange(value: number, min: number, max: number): void {
	expect(value).toBeGreaterThanOrEqual(min)
	expect(value).toBeLessThanOrEqual(max)
}

/**
 * Assert that two timestamps are approximately equal (within tolerance)
 */
export function expectTimestampClose(actual: number, expected: number, tolerance = 1000): void {
	const diff = Math.abs(actual - expected)
	expect(diff).toBeLessThanOrEqual(tolerance)
}

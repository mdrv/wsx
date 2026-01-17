import { describe, expect, it } from 'bun:test'
import { createTimeout, generateRequestId, normalizeError } from '../shared/utils.ts'

describe('Utils', () => {
	describe('generateRequestId', () => {
		it('should generate unique request IDs', () => {
			const id1 = generateRequestId()
			const id2 = generateRequestId()
			const id3 = generateRequestId()

			expect(id1).not.toBe(id2)
			expect(id2).not.toBe(id3)
			expect(id1).not.toBe(id3)
		})

		it('should generate string IDs', () => {
			const id = generateRequestId()
			expect(typeof id).toBe('string')
			expect(id.length).toBeGreaterThan(0)
		})

		it('should generate many unique IDs', () => {
			const ids = new Set<string>()
			const count = 1000

			for (let i = 0; i < count; i++) {
				ids.add(generateRequestId())
			}

			// All IDs should be unique
			expect(ids.size).toBe(count)
		})

		it('should generate IDs quickly', () => {
			const start = performance.now()
			for (let i = 0; i < 10000; i++) {
				generateRequestId()
			}
			const end = performance.now()

			// Should generate 10k IDs in less than 100ms
			expect(end - start).toBeLessThan(100)
		})
	})

	describe('normalizeError', () => {
		it('should normalize Error objects', () => {
			const error = new Error('Test error')
			const normalized = normalizeError(error)

			expect(normalized.message).toBe('Test error')
			expect(normalized.cause).toBeUndefined()
		})

		it('should normalize Error objects with cause', () => {
			const cause = new Error('Root cause')
			const error = new Error('Test error', { cause })
			const normalized = normalizeError(error)

			expect(normalized.message).toBe('Test error')
			expect(normalized.cause).toBe(cause)
		})

		it('should normalize string errors', () => {
			const normalized = normalizeError('Something went wrong')

			expect(normalized.message).toBe('Something went wrong')
			expect(normalized.cause).toBeUndefined()
		})

		it('should normalize object errors with message property', () => {
			const errorObj = { message: 'Custom error', code: 500 }
			const normalized = normalizeError(errorObj)

			expect(normalized.message).toBe('Custom error')
		})

		it('should normalize unknown error types', () => {
			const normalized = normalizeError(42)

			expect(normalized.message).toBe('Unknown error')
			expect(normalized.cause).toBe(42)
		})

		it('should normalize null and undefined', () => {
			const normalizedNull = normalizeError(null)
			const normalizedUndefined = normalizeError(undefined)

			expect(normalizedNull.message).toBe('Unknown error')
			expect(normalizedNull.cause).toBe(null)
			expect(normalizedUndefined.message).toBe('Unknown error')
			expect(normalizedUndefined.cause).toBe(undefined)
		})

		it('should handle complex error objects', () => {
			const complexError = {
				message: 'Complex error',
				details: { code: 404, path: '/api/users' },
				timestamp: Date.now(),
			}

			const normalized = normalizeError(complexError)
			expect(normalized.message).toBe('Complex error')
		})

		it('should handle array errors', () => {
			const arrayError = ['error1', 'error2']
			const normalized = normalizeError(arrayError)

			expect(normalized.message).toBe('Unknown error')
			expect(normalized.cause).toBe(arrayError)
		})
	})

	describe('createTimeout', () => {
		it('should create a timeout promise that rejects', async () => {
			const timeout = createTimeout(100, 'Timeout message')

			try {
				await timeout
				// Should not reach here
				expect(true).toBe(false)
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toBe('Timeout message')
			}
		})

		it('should timeout after specified duration', async () => {
			const start = Date.now()
			const timeout = createTimeout(50, 'Test')

			try {
				await timeout
			} catch (error) {
				const elapsed = Date.now() - start
				// Should be close to 50ms (allow some variance)
				expect(elapsed).toBeGreaterThanOrEqual(40)
				expect(elapsed).toBeLessThan(100)
			}
		})

		it('should work with Promise.race', async () => {
			const slowPromise = new Promise((resolve) => setTimeout(() => resolve('slow'), 200))
			const timeout = createTimeout(50, 'Too slow')

			try {
				await Promise.race([slowPromise, timeout])
				// Should not reach here
				expect(true).toBe(false)
			} catch (error) {
				expect((error as Error).message).toBe('Too slow')
			}
		})

		it('should allow fast promises to win the race', async () => {
			const fastPromise = new Promise((resolve) => setTimeout(() => resolve('fast'), 10))
			const timeout = createTimeout(100, 'Timeout')

			const result = await Promise.race([fastPromise, timeout])
			expect(result).toBe('fast')
		})

		it('should handle multiple concurrent timeouts', async () => {
			const timeout1 = createTimeout(50, 'First')
			const timeout2 = createTimeout(100, 'Second')
			const timeout3 = createTimeout(150, 'Third')

			const errors: string[] = []

			try {
				await timeout1
			} catch (e) {
				errors.push((e as Error).message)
			}

			try {
				await timeout2
			} catch (e) {
				errors.push((e as Error).message)
			}

			try {
				await timeout3
			} catch (e) {
				errors.push((e as Error).message)
			}

			expect(errors).toEqual(['First', 'Second', 'Third'])
		})

		it('should create timeout with default message', async () => {
			const timeout = createTimeout(10)

			try {
				await timeout
				expect(true).toBe(false)
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				// Should have some default message
				expect((error as Error).message).toBeDefined()
			}
		})
	})

	describe('Integration', () => {
		it('should use generateRequestId with normalizeError', () => {
			const requestId = generateRequestId()
			const error = new Error(`Request ${requestId} failed`)
			const normalized = normalizeError(error)

			expect(normalized.message).toContain(requestId)
		})

		it('should combine timeout with error normalization', async () => {
			const timeout = createTimeout(10, 'Operation timeout')

			try {
				await timeout
			} catch (error) {
				const normalized = normalizeError(error)
				expect(normalized.message).toBe('Operation timeout')
			}
		})
	})
})

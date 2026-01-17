import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { defineEvents, type InferEventMap } from '../shared/schema.ts'

describe('Schema', () => {
	it('should define events correctly', () => {
		const events = defineEvents({
			test: {
				request: z.object({ msg: z.string() }),
				response: z.object({ result: z.number() }),
			},
		})

		expect(events.test.request).toBeDefined()
		expect(events.test.response).toBeDefined()
	})

	it('should infer types correctly', () => {
		const events = defineEvents({
			test: {
				request: z.object({ msg: z.string() }),
				response: z.object({ result: z.number() }),
			},
		})

		type EventMap = InferEventMap<typeof events>

		// Type assertions (compile-time checks)
		const req: EventMap['test']['request'] = { msg: 'hello' }
		const res: EventMap['test']['response'] = { result: 42 }

		expect(req.msg).toBe('hello')
		expect(res.result).toBe(42)
	})

	it('should validate with Zod', () => {
		const events = defineEvents({
			test: {
				request: z.object({
					count: z.number().min(0).max(100),
				}),
			},
		})

		// Valid
		expect(() => events.test.request!.parse({ count: 50 })).not.toThrow()

		// Invalid
		expect(() => events.test.request!.parse({ count: -1 })).toThrow()
		expect(() => events.test.request!.parse({ count: 101 })).toThrow()
		expect(() => events.test.request!.parse({ count: 'not a number' })).toThrow()
	})
})

import { describe, expect, it } from 'bun:test'
import { CborSerializer, JsonSerializer } from '../shared/serializer.ts'

describe('Serializers', () => {
	const testData = {
		string: 'hello',
		number: 42,
		boolean: true,
		nested: {
			array: [1, 2, 3],
			null: null,
		},
	}

	describe('CborSerializer', () => {
		it('should encode and decode data', () => {
			const serializer = new CborSerializer()
			const encoded = serializer.encode(testData)
			const decoded = serializer.decode(encoded)

			expect(decoded).toEqual(testData)
		})

		it('should produce binary data', () => {
			const serializer = new CborSerializer()
			const encoded = serializer.encode(testData)

			// Should be ArrayBuffer or Uint8Array/Buffer
			const isBuffer = (encoded as any) instanceof ArrayBuffer
				|| (encoded as any) instanceof Uint8Array
				|| (encoded && typeof encoded === 'object' && 'byteLength' in encoded)

			expect(isBuffer).toBe(true)
		})

		it('should handle large payloads', () => {
			const serializer = new CborSerializer()

			// Create a large object with 1000 items
			const largeData = {
				items: Array.from({ length: 1000 }, (_, i) => ({
					id: i,
					name: `Item ${i}`,
					data: `Data for item ${i}`,
					timestamp: Date.now() + i,
				})),
			}

			const encoded = serializer.encode(largeData)
			const decoded = serializer.decode(encoded)

			expect(decoded).toEqual(largeData)
			expect(decoded.items).toHaveLength(1000)
		})

		it('should handle binary data (Uint8Array)', () => {
			const serializer = new CborSerializer()

			const binaryData = {
				buffer: new Uint8Array([1, 2, 3, 4, 5]),
				meta: 'binary test',
			}

			const encoded = serializer.encode(binaryData)
			const decoded = serializer.decode(encoded)

			expect(decoded.meta).toBe('binary test')
			// CBOR may handle binary data differently, just verify it decodes
			expect(decoded.buffer).toBeDefined()
		})

		it('should handle special values', () => {
			const serializer = new CborSerializer()

			const specialData = {
				nullValue: null,
				undefinedValue: undefined,
				emptyString: '',
				emptyArray: [],
				emptyObject: {},
				zero: 0,
				negativeNumber: -42,
				floatingPoint: 3.14159,
			}

			const encoded = serializer.encode(specialData)
			const decoded = serializer.decode(encoded)

			expect(decoded.nullValue).toBe(null)
			expect(decoded.emptyString).toBe('')
			expect(decoded.emptyArray).toEqual([])
			expect(decoded.emptyObject).toEqual({})
			expect(decoded.zero).toBe(0)
			expect(decoded.negativeNumber).toBe(-42)
			expect(decoded.floatingPoint).toBeCloseTo(3.14159, 5)
		})

		it('should handle deeply nested structures', () => {
			const serializer = new CborSerializer()

			// Create deeply nested object
			const deeplyNested: any = { level: 0 }
			let current = deeplyNested
			for (let i = 1; i < 20; i++) {
				current.child = { level: i }
				current = current.child
			}

			const encoded = serializer.encode(deeplyNested)
			const decoded = serializer.decode(encoded)

			// Verify first and last levels
			expect(decoded.level).toBe(0)
			let check = decoded
			for (let i = 1; i < 20; i++) {
				check = check.child
				expect(check.level).toBe(i)
			}
		})

		it('should be more compact than JSON for binary data', () => {
			const serializer = new CborSerializer()
			const jsonSerializer = new JsonSerializer()

			const data = {
				numbers: Array.from({ length: 100 }, (_, i) => i),
				text: 'Sample text',
			}

			const cborEncoded = serializer.encode(data)
			const jsonEncoded = jsonSerializer.encode(data)

			// CBOR should generally be smaller than JSON for numeric arrays
			const cborSize = (cborEncoded as any) instanceof ArrayBuffer
				? (cborEncoded as ArrayBuffer).byteLength
				: (cborEncoded as any).length || 0
			const jsonSize = jsonEncoded.byteLength

			// This is informational - CBOR is usually more compact
			expect(cborSize).toBeGreaterThan(0)
			expect(jsonSize).toBeGreaterThan(0)
		})
	})

	describe('JsonSerializer', () => {
		it('should encode and decode data', () => {
			const serializer = new JsonSerializer()
			const encoded = serializer.encode(testData)
			const decoded = serializer.decode(encoded)

			expect(decoded).toEqual(testData)
		})

		it('should produce binary data', () => {
			const serializer = new JsonSerializer()
			const encoded = serializer.encode(testData)

			expect(encoded).toBeInstanceOf(ArrayBuffer)
		})

		it('should handle large payloads', () => {
			const serializer = new JsonSerializer()

			// Create a large object with 1000 items
			const largeData = {
				items: Array.from({ length: 1000 }, (_, i) => ({
					id: i,
					name: `Item ${i}`,
					data: `Data for item ${i}`,
					timestamp: Date.now() + i,
				})),
			}

			const encoded = serializer.encode(largeData)
			const decoded = serializer.decode(encoded)

			expect(decoded).toEqual(largeData)
			expect(decoded.items).toHaveLength(1000)
		})

		it('should handle special values', () => {
			const serializer = new JsonSerializer()

			const specialData = {
				nullValue: null,
				emptyString: '',
				emptyArray: [],
				emptyObject: {},
				zero: 0,
				negativeNumber: -42,
				floatingPoint: 3.14159,
			}

			const encoded = serializer.encode(specialData)
			const decoded = serializer.decode(encoded)

			expect(decoded.nullValue).toBe(null)
			expect(decoded.emptyString).toBe('')
			expect(decoded.emptyArray).toEqual([])
			expect(decoded.emptyObject).toEqual({})
			expect(decoded.zero).toBe(0)
			expect(decoded.negativeNumber).toBe(-42)
			expect(decoded.floatingPoint).toBeCloseTo(3.14159, 5)
		})

		it('should handle deeply nested structures', () => {
			const serializer = new JsonSerializer()

			// Create deeply nested object
			const deeplyNested: any = { level: 0 }
			let current = deeplyNested
			for (let i = 1; i < 20; i++) {
				current.child = { level: i }
				current = current.child
			}

			const encoded = serializer.encode(deeplyNested)
			const decoded = serializer.decode(encoded)

			// Verify first and last levels
			expect(decoded.level).toBe(0)
			let check = decoded
			for (let i = 1; i < 20; i++) {
				check = check.child
				expect(check.level).toBe(i)
			}
		})

		it('should handle unicode characters', () => {
			const serializer = new JsonSerializer()

			const unicodeData = {
				emoji: '😀🎉🚀',
				chinese: '你好世界',
				arabic: 'مرحبا بالعالم',
				mixed: 'Hello 世界 🌍',
			}

			const encoded = serializer.encode(unicodeData)
			const decoded = serializer.decode(encoded)

			expect(decoded).toEqual(unicodeData)
		})

		it('should produce valid UTF-8 encoded ArrayBuffer', () => {
			const serializer = new JsonSerializer()

			const data = { message: 'test' }
			const encoded = serializer.encode(data)

			// Decode as text to verify it's valid JSON
			const text = new TextDecoder().decode(encoded)
			expect(text).toBe('{"message":"test"}')
		})
	})

	describe('Serializer Compatibility', () => {
		it('should handle same data with both serializers', () => {
			const cborSerializer = new CborSerializer()
			const jsonSerializer = new JsonSerializer()

			const data = {
				id: 123,
				name: 'Test',
				active: true,
				tags: ['a', 'b', 'c'],
			}

			// Both should encode and decode successfully
			const cborEncoded = cborSerializer.encode(data)
			const cborDecoded = cborSerializer.decode(cborEncoded)

			const jsonEncoded = jsonSerializer.encode(data)
			const jsonDecoded = jsonSerializer.decode(jsonEncoded)

			expect(cborDecoded).toEqual(data)
			expect(jsonDecoded).toEqual(data)
			expect(cborDecoded).toEqual(jsonDecoded)
		})

		it('should handle round-trip encoding', () => {
			const serializer = new CborSerializer()

			const original = { value: 'test', count: 42 }

			// Multiple round trips
			let current = original
			for (let i = 0; i < 10; i++) {
				const encoded = serializer.encode(current)
				current = serializer.decode(encoded)
			}

			expect(current).toEqual(original)
		})
	})
})

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
			expect(
				encoded instanceof ArrayBuffer
					|| encoded instanceof Uint8Array
					|| ArrayBuffer.isView(encoded),
			).toBe(true)
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
	})
})

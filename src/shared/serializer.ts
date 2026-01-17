import { Decoder, Encoder } from 'cbor-x'

/**
 * Serializer interface for encoding/decoding messages
 */
export interface Serializer {
	encode(data: any): ArrayBuffer
	decode(data: ArrayBuffer | Uint8Array): any
}

/**
 * CBOR-X serializer (default)
 */
export class CborSerializer implements Serializer {
	private encoder: Encoder
	private decoder: Decoder

	constructor() {
		this.encoder = new Encoder({ mapsAsObjects: false })
		this.decoder = new Decoder({ mapsAsObjects: false })
	}

	encode(data: any): ArrayBuffer {
		return this.encoder.encode(data)
	}

	decode(data: ArrayBuffer | Uint8Array): any {
		return this.decoder.decode(new Uint8Array(data))
	}
}

/**
 * JSON serializer (for debugging or compatibility)
 */
export class JsonSerializer implements Serializer {
	encode(data: any): ArrayBuffer {
		const json = JSON.stringify(data)
		const encoder = new TextEncoder()
		return encoder.encode(json).buffer
	}

	decode(data: ArrayBuffer | Uint8Array): any {
		const decoder = new TextDecoder()
		const json = decoder.decode(data)
		return JSON.parse(json)
	}
}

/**
 * Default serializer instance
 */
export const defaultSerializer = new CborSerializer()

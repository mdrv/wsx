/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
	// Simple but effective: timestamp + random
	return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Create an error object from various error types
 */
export function normalizeError(error: unknown): {
	message: string
	cause?: any
} {
	if (error instanceof Error) {
		return {
			message: error.message,
			cause: error.cause,
		}
	}
	if (typeof error === 'string') {
		return { message: error }
	}
	if (typeof error === 'object' && error !== null && 'message' in error) {
		return error as { message: string; cause?: any }
	}
	return {
		message: 'Unknown error',
		cause: error,
	}
}

/**
 * Create a timeout promise
 */
export function createTimeout(ms: number, message?: string): Promise<never> {
	return new Promise((_, reject) => {
		setTimeout(() => {
			reject(new Error(message || `Timeout after ${ms}ms`))
		}, ms)
	})
}

/**
 * Check if code is running in browser
 */
export function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Simple assertion helper
 */
export function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

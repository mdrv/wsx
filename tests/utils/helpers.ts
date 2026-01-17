/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeout = 5000,
	interval = 50,
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return
		}
		await delay(interval)
	}

	throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	timeout: number,
	message?: string,
): Promise<T> {
	return Promise.race([
		promise,
		delay(timeout).then(() => {
			throw new Error(message || `Operation timed out after ${timeout}ms`)
		}),
	])
}

/**
 * Wait for an event to be emitted
 */
export function waitForEvent<T = any>(
	emitter: {
		addEventListener?: (event: string, handler: Function) => void
		on?: (event: string, handler: Function) => void
	},
	eventName: string,
	timeout = 5000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timeout waiting for event '${eventName}' after ${timeout}ms`))
		}, timeout)

		const handler = (data: T) => {
			clearTimeout(timer)
			resolve(data)
		}

		if (emitter.addEventListener) {
			emitter.addEventListener(eventName, handler)
		} else if (emitter.on) {
			emitter.on(eventName, handler)
		} else {
			clearTimeout(timer)
			reject(new Error('Emitter does not support addEventListener or on'))
		}
	})
}

/**
 * Collect messages for testing
 */
export class MessageCollector<T = any> {
	private messages: T[] = []

	add(message: T): void {
		this.messages.push(message)
	}

	getAll(): T[] {
		return [...this.messages]
	}

	getLast(): T | undefined {
		return this.messages[this.messages.length - 1]
	}

	getCount(): number {
		return this.messages.length
	}

	clear(): void {
		this.messages = []
	}

	async waitForCount(count: number, timeout = 5000): Promise<void> {
		await waitFor(() => this.messages.length >= count, timeout)
	}

	async waitForMessage(predicate: (msg: T) => boolean, timeout = 5000): Promise<T> {
		const startTime = Date.now()

		while (Date.now() - startTime < timeout) {
			const found = this.messages.find(predicate)
			if (found) return found
			await delay(50)
		}

		throw new Error(`Timeout waiting for message after ${timeout}ms`)
	}
}

/**
 * Get a random unused port
 */
export function getRandomPort(min = 9000, max = 9999): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

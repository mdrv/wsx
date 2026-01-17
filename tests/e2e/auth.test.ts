import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { TypedWSClient } from '../../src/client/typed-client.ts'
import { createElysiaWS } from '../../src/server/elysia.ts'
import { delay, waitFor } from '../utils/helpers.ts'

/**
 * E2E Auth Tests
 *
 * Tests authentication and authorization scenarios.
 * Port range: 9100+
 */

describe('E2E: Auth', () => {
	const PORT = 9102
	const WS_URL = `ws://localhost:${PORT}/ws`

	// Define auth events
	const authEvents = {
		login: {
			request: z.object({ username: z.string(), password: z.string() }),
			response: z.object({ success: z.boolean(), token: z.string().optional(), error: z.string().optional() }),
		},
		getProfile: {
			request: z.object({ token: z.string() }),
			response: z.object({ username: z.string(), role: z.string() }),
		},
		adminAction: {
			request: z.object({ token: z.string(), action: z.string() }),
			response: z.object({ success: z.boolean(), result: z.string() }),
		},
		refreshToken: {
			request: z.object({ oldToken: z.string() }),
			response: z.object({ newToken: z.string() }),
		},
	}

	type AuthEvents = typeof authEvents

	let app: Elysia

	// Simulated user database
	const users = new Map([
		['alice', { password: 'secret123', role: 'admin' }],
		['bob', { password: 'password', role: 'user' }],
	])

	// Simulated sessions
	const sessions = new Map<string, { username: string; role: string }>()

	beforeAll(async () => {
		const { server, handler } = createElysiaWS(authEvents)

		// Handle login
		server.onRequest('login', async (payload) => {
			const user = users.get(payload.username)

			if (!user || user.password !== payload.password) {
				return {
					success: false,
					error: 'Invalid credentials',
				}
			}

			// Generate token (simple version for testing)
			const token = `${payload.username}-${Date.now()}`
			sessions.set(token, { username: payload.username, role: user.role })

			return {
				success: true,
				token,
			}
		})

		// Handle get profile
		server.onRequest('getProfile', async (payload) => {
			const session = sessions.get(payload.token)

			if (!session) {
				throw new Error('Invalid token')
			}

			return {
				username: session.username,
				role: session.role,
			}
		})

		// Handle admin action
		server.onRequest('adminAction', async (payload) => {
			const session = sessions.get(payload.token)

			if (!session) {
				throw new Error('Invalid token')
			}

			if (session.role !== 'admin') {
				throw new Error('Unauthorized: Admin role required')
			}

			return {
				success: true,
				result: `Executed ${payload.action}`,
			}
		})

		// Handle token refresh
		server.onRequest('refreshToken', async (payload) => {
			const session = sessions.get(payload.oldToken)

			if (!session) {
				throw new Error('Invalid token')
			}

			// Generate new token
			const newToken = `${session.username}-${Date.now()}`
			sessions.set(newToken, session)
			sessions.delete(payload.oldToken)

			return {
				newToken,
			}
		})

		app = new Elysia().ws('/ws', handler).listen(PORT)

		await delay(100) // Wait for server to start
	})

	afterAll(() => {
		app?.stop()
		sessions.clear()
	})

	it('should successfully login with valid credentials', async () => {
		const client = new TypedWSClient(WS_URL, authEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Login
		const response = await client.request('login', {
			username: 'alice',
			password: 'secret123',
		})

		expect(response.success).toBe(true)
		expect(response.token).toBeDefined()
		expect(response.token).toContain('alice')

		client.close()
		await delay(50)
	})

	it('should reject invalid credentials', async () => {
		const client = new TypedWSClient(WS_URL, authEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Try to login with wrong password
		const response = await client.request('login', {
			username: 'alice',
			password: 'wrongpassword',
		})

		expect(response.success).toBe(false)
		expect(response.error).toBe('Invalid credentials')
		expect(response.token).toBeUndefined()

		client.close()
		await delay(50)
	})

	it('should retrieve user profile with valid token', async () => {
		const client = new TypedWSClient(WS_URL, authEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Login first
		const loginResponse = await client.request('login', {
			username: 'bob',
			password: 'password',
		})

		expect(loginResponse.success).toBe(true)
		const token = loginResponse.token!

		// Get profile
		const profile = await client.request('getProfile', { token })

		expect(profile.username).toBe('bob')
		expect(profile.role).toBe('user')

		client.close()
		await delay(50)
	})

	it('should reject profile request with invalid token', async () => {
		const client = new TypedWSClient(WS_URL, authEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Try to get profile with invalid token
		try {
			await client.request('getProfile', { token: 'invalid-token' })
			expect(true).toBe(false) // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
			expect((error as Error).message).toContain('Invalid token')
		}

		client.close()
		await delay(50)
	})

	it('should allow admin to perform admin actions', async () => {
		const client = new TypedWSClient(WS_URL, authEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Login as admin
		const loginResponse = await client.request('login', {
			username: 'alice',
			password: 'secret123',
		})

		const token = loginResponse.token!

		// Perform admin action
		const response = await client.request('adminAction', {
			token,
			action: 'deleteUser',
		})

		expect(response.success).toBe(true)
		expect(response.result).toBe('Executed deleteUser')

		client.close()
		await delay(50)
	})

	it('should reject non-admin from performing admin actions', async () => {
		const client = new TypedWSClient(WS_URL, authEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Login as regular user
		const loginResponse = await client.request('login', {
			username: 'bob',
			password: 'password',
		})

		const token = loginResponse.token!

		// Try to perform admin action
		try {
			await client.request('adminAction', {
				token,
				action: 'deleteUser',
			})
			expect(true).toBe(false) // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
			expect((error as Error).message).toContain('Unauthorized')
		}

		client.close()
		await delay(50)
	})

	it('should allow token refresh', async () => {
		const client = new TypedWSClient(WS_URL, authEvents)
		client.connect()

		// Wait for connection
		let connected = false
		client.onOpen(() => {
			connected = true
		})
		await waitFor(() => connected, 2000)

		// Login
		const loginResponse = await client.request('login', {
			username: 'alice',
			password: 'secret123',
		})

		const oldToken = loginResponse.token!

		// Refresh token
		const refreshResponse = await client.request('refreshToken', { oldToken })

		expect(refreshResponse.newToken).toBeDefined()
		expect(refreshResponse.newToken).not.toBe(oldToken)
		expect(refreshResponse.newToken).toContain('alice')

		// Old token should no longer work
		try {
			await client.request('getProfile', { token: oldToken })
			expect(true).toBe(false) // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
		}

		// New token should work
		const profile = await client.request('getProfile', {
			token: refreshResponse.newToken,
		})

		expect(profile.username).toBe('alice')

		client.close()
		await delay(50)
	})
})

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

	describe('Complex Nested Schemas', () => {
		it('should handle deeply nested object schemas', () => {
			const events = defineEvents({
				userUpdate: {
					request: z.object({
						user: z.object({
							id: z.number(),
							profile: z.object({
								name: z.string(),
								address: z.object({
									street: z.string(),
									city: z.string(),
									country: z.string(),
								}),
							}),
						}),
					}),
					response: z.object({ success: z.boolean() }),
				},
			})

			const validRequest = {
				user: {
					id: 123,
					profile: {
						name: 'John Doe',
						address: {
							street: '123 Main St',
							city: 'New York',
							country: 'USA',
						},
					},
				},
			}

			expect(() => events.userUpdate.request!.parse(validRequest)).not.toThrow()

			// Missing nested field
			const invalidRequest = {
				user: {
					id: 123,
					profile: {
						name: 'John Doe',
						address: {
							street: '123 Main St',
							// missing city and country
						},
					},
				},
			}

			expect(() => events.userUpdate.request!.parse(invalidRequest)).toThrow()
		})

		it('should handle arrays in schemas', () => {
			const events = defineEvents({
				bulkUpdate: {
					request: z.object({
						items: z.array(z.object({
							id: z.number(),
							value: z.string(),
						})),
					}),
					response: z.object({
						updated: z.array(z.number()),
					}),
				},
			})

			const validRequest = {
				items: [
					{ id: 1, value: 'first' },
					{ id: 2, value: 'second' },
					{ id: 3, value: 'third' },
				],
			}

			expect(() => events.bulkUpdate.request!.parse(validRequest)).not.toThrow()

			// Invalid item in array
			const invalidRequest = {
				items: [
					{ id: 1, value: 'first' },
					{ id: 'not a number', value: 'second' },
				],
			}

			expect(() => events.bulkUpdate.request!.parse(invalidRequest)).toThrow()
		})
	})

	describe('Optional Fields', () => {
		it('should handle optional fields in schemas', () => {
			const events = defineEvents({
				createUser: {
					request: z.object({
						username: z.string(),
						email: z.string().email(),
						age: z.number().optional(),
						bio: z.string().optional(),
					}),
					response: z.object({
						id: z.number(),
						created: z.boolean(),
					}),
				},
			})

			// With optional fields
			const withOptional = {
				username: 'johndoe',
				email: 'john@example.com',
				age: 25,
				bio: 'Hello world',
			}

			expect(() => events.createUser.request!.parse(withOptional)).not.toThrow()

			// Without optional fields
			const withoutOptional = {
				username: 'johndoe',
				email: 'john@example.com',
			}

			expect(() => events.createUser.request!.parse(withoutOptional)).not.toThrow()

			// Invalid email (required field validation)
			const invalidEmail = {
				username: 'johndoe',
				email: 'not-an-email',
			}

			expect(() => events.createUser.request!.parse(invalidEmail)).toThrow()
		})

		it('should handle nullable fields', () => {
			const events = defineEvents({
				updateProfile: {
					request: z.object({
						name: z.string(),
						avatar: z.string().nullable(),
					}),
				},
			})

			// With null value
			expect(() =>
				events.updateProfile.request!.parse({
					name: 'John',
					avatar: null,
				})
			).not.toThrow()

			// With string value
			expect(() =>
				events.updateProfile.request!.parse({
					name: 'John',
					avatar: 'https://example.com/avatar.png',
				})
			).not.toThrow()
		})
	})

	describe('Union Types', () => {
		it('should handle union types in schemas', () => {
			const events = defineEvents({
				message: {
					request: z.object({
						type: z.union([z.literal('text'), z.literal('image'), z.literal('video')]),
						content: z.string(),
					}),
				},
			})

			// Valid types
			expect(() => events.message.request!.parse({ type: 'text', content: 'Hello' })).not.toThrow()
			expect(() => events.message.request!.parse({ type: 'image', content: 'url' })).not.toThrow()
			expect(() => events.message.request!.parse({ type: 'video', content: 'url' })).not.toThrow()

			// Invalid type
			expect(() => events.message.request!.parse({ type: 'audio', content: 'url' })).toThrow()
		})

		it('should handle discriminated unions', () => {
			const events = defineEvents({
				action: {
					request: z.discriminatedUnion('type', [
						z.object({
							type: z.literal('create'),
							data: z.object({ name: z.string() }),
						}),
						z.object({
							type: z.literal('update'),
							data: z.object({ id: z.number(), name: z.string() }),
						}),
						z.object({
							type: z.literal('delete'),
							data: z.object({ id: z.number() }),
						}),
					]),
				},
			})

			// Valid create action
			expect(() =>
				events.action.request!.parse({
					type: 'create',
					data: { name: 'New Item' },
				})
			).not.toThrow()

			// Valid update action
			expect(() =>
				events.action.request!.parse({
					type: 'update',
					data: { id: 123, name: 'Updated Item' },
				})
			).not.toThrow()

			// Valid delete action
			expect(() =>
				events.action.request!.parse({
					type: 'delete',
					data: { id: 123 },
				})
			).not.toThrow()

			// Invalid - wrong type
			expect(() =>
				events.action.request!.parse({
					type: 'invalid',
					data: { id: 123 },
				})
			).toThrow()

			// Invalid - delete without id
			expect(() =>
				events.action.request!.parse({
					type: 'delete',
					data: { name: 'Item' },
				})
			).toThrow()
		})
	})

	describe('Custom Validators', () => {
		it('should handle custom refinements', () => {
			const events = defineEvents({
				setPassword: {
					request: z.object({
						password: z.string().min(8),
						confirmPassword: z.string(),
					}).refine((data) => data.password === data.confirmPassword, {
						message: 'Passwords do not match',
						path: ['confirmPassword'],
					}),
				},
			})

			// Valid - passwords match
			expect(() =>
				events.setPassword.request!.parse({
					password: 'securepassword',
					confirmPassword: 'securepassword',
				})
			).not.toThrow()

			// Invalid - passwords don't match
			expect(() =>
				events.setPassword.request!.parse({
					password: 'password1',
					confirmPassword: 'password2',
				})
			).toThrow()

			// Invalid - too short
			expect(() =>
				events.setPassword.request!.parse({
					password: 'short',
					confirmPassword: 'short',
				})
			).toThrow()
		})

		it('should handle custom transformations', () => {
			const events = defineEvents({
				normalizeEmail: {
					request: z.object({
						email: z.string().email().transform((val) => val.toLowerCase()),
					}),
				},
			})

			const result = events.normalizeEmail.request!.parse({
				email: 'USER@EXAMPLE.COM',
			})

			expect(result.email).toBe('user@example.com')
		})
	})

	describe('Schema Composition', () => {
		it('should compose schemas with extend', () => {
			const baseSchema = z.object({
				id: z.number(),
				createdAt: z.number(),
			})

			const events = defineEvents({
				createPost: {
					request: baseSchema.extend({
						title: z.string(),
						content: z.string(),
					}),
				},
			})

			const validRequest = {
				id: 1,
				createdAt: Date.now(),
				title: 'My Post',
				content: 'Post content',
			}

			expect(() => events.createPost.request!.parse(validRequest)).not.toThrow()

			// Missing base field
			const missingBase = {
				title: 'My Post',
				content: 'Post content',
			}

			expect(() => events.createPost.request!.parse(missingBase)).toThrow()
		})

		it('should compose schemas with merge', () => {
			const userSchema = z.object({
				userId: z.number(),
				username: z.string(),
			})

			const timestampSchema = z.object({
				createdAt: z.number(),
				updatedAt: z.number(),
			})

			const events = defineEvents({
				userActivity: {
					request: userSchema.merge(timestampSchema).merge(z.object({
						action: z.string(),
					})),
				},
			})

			const validRequest = {
				userId: 123,
				username: 'john',
				createdAt: Date.now(),
				updatedAt: Date.now(),
				action: 'login',
			}

			expect(() => events.userActivity.request!.parse(validRequest)).not.toThrow()
		})

		it('should handle partial schemas', () => {
			const fullSchema = z.object({
				name: z.string(),
				email: z.string().email(),
				age: z.number(),
			})

			const events = defineEvents({
				partialUpdate: {
					request: fullSchema.partial(),
				},
			})

			// All fields optional in partial
			expect(() => events.partialUpdate.request!.parse({ name: 'John' })).not.toThrow()
			expect(() => events.partialUpdate.request!.parse({ email: 'john@example.com' })).not.toThrow()
			expect(() => events.partialUpdate.request!.parse({ age: 25 })).not.toThrow()
			expect(() => events.partialUpdate.request!.parse({})).not.toThrow()

			// But validation still applies
			expect(() => events.partialUpdate.request!.parse({ email: 'not-an-email' })).toThrow()
		})

		it('should handle pick and omit', () => {
			const fullSchema = z.object({
				id: z.number(),
				name: z.string(),
				email: z.string().email(),
				password: z.string(),
				createdAt: z.number(),
			})

			const eventsWithPick = defineEvents({
				publicProfile: {
					response: fullSchema.pick({ id: true, name: true, email: true }),
				},
			})

			const eventsWithOmit = defineEvents({
				safeUser: {
					response: fullSchema.omit({ password: true }),
				},
			})

			// Pick - only selected fields
			expect(() =>
				eventsWithPick.publicProfile.response!.parse({
					id: 1,
					name: 'John',
					email: 'john@example.com',
				})
			).not.toThrow()

			// Omit - all except password
			expect(() =>
				eventsWithOmit.safeUser.response!.parse({
					id: 1,
					name: 'John',
					email: 'john@example.com',
					createdAt: Date.now(),
				})
			).not.toThrow()
		})
	})

	describe('Send-only Events', () => {
		it('should handle events with only request schema', () => {
			const events = defineEvents({
				notify: {
					request: z.object({ message: z.string() }),
				},
			})

			expect(events.notify.request).toBeDefined()
			expect((events.notify as any).response).toBeUndefined()

			expect(() => events.notify.request!.parse({ message: 'Hello' })).not.toThrow()
		})

		it('should handle events with no payload', () => {
			const events = defineEvents({
				ping: {
					request: z.object({}),
					response: z.object({}),
				},
			})

			expect(() => events.ping.request!.parse({})).not.toThrow()
			expect(() => events.ping.response!.parse({})).not.toThrow()
		})
	})
})

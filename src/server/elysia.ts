import type { ServerWebSocket } from 'bun'
import type { Elysia } from 'elysia'
import type { EventDefinition } from '../shared/schema.ts'
import { TypedWSServer, type TypedWSServerOptions } from './typed-server.ts'

/**
 * Plugin for Elysia to add typed WebSocket support
 */
export function elysiaTypedWS<TEvents extends Record<string, EventDefinition>>(
	server: TypedWSServer<TEvents>,
) {
	return {
		/**
		 * WebSocket upgrade handler
		 */
		upgrade(request: Request) {
			// You can add custom upgrade logic here (auth, etc.)
			return true
		},

		/**
		 * WebSocket open handler
		 */
		open(ws: ServerWebSocket<any>) {
			console.log('[ElysiaTypedWS] Client connected')
		},

		/**
		 * WebSocket message handler
		 */
		async message(ws: ServerWebSocket<any>, message: ArrayBuffer | string) {
			await server.handleMessage(ws, message)
		},

		/**
		 * WebSocket close handler
		 */
		close(ws: ServerWebSocket<any>, code: number, reason: string) {
			console.log('[ElysiaTypedWS] Client disconnected', code, reason)
		},

		/**
		 * WebSocket error handler
		 */
		error(ws: ServerWebSocket<any>, error: Error) {
			console.error('[ElysiaTypedWS] Error:', error)
		},
	}
}

/**
 * Helper to create Elysia WebSocket handler with typed server
 */
export function createElysiaWS<TEvents extends Record<string, EventDefinition>>(
	events: TEvents,
	options?: TypedWSServerOptions,
) {
	const server = new TypedWSServer(events, options)
	return {
		server,
		handler: elysiaTypedWS(server),
	}
}

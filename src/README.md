# @mdrv/ws v001

Type-safe WebSocket library with Zod validation for Elysia and browser clients.

## Features

- ✅ **End-to-end type safety** - Full TypeScript support from client to server
- ✅ **Zod validation** - Runtime validation of all messages
- ✅ **Auto-reconnection** - Robust reconnection with exponential backoff
- ✅ **Request/response pattern** - Promise-based RPC over WebSocket
- ✅ **Message queuing** - Queue messages when disconnected
- ✅ **Protocol versioning** - Built-in compatibility checking
- ✅ **CBOR serialization** - Fast binary encoding (JSON also available)
- ✅ **Elysia integration** - First-class Elysia framework support

## Quick Start

### Installation

```bash
bun add @mdrv/ws zod cbor-x elysia
```

### Define Events

Create a shared event schema:

```typescript
// events.ts
import { defineEvents } from '@mdrv/ws/v001/shared'
import { z } from 'zod'

export const events = defineEvents({
	ping: {
		request: z.object({ timestamp: z.number() }),
		response: z.object({ pong: z.string() }),
	},
	notify: {
		request: z.object({ message: z.string() }),
		// No response = one-way message
	},
})
```

### Server (Elysia)

```typescript
// server.ts
import { createElysiaWS } from '@mdrv/ws/v001/server'
import { Elysia } from 'elysia'
import { events } from './events'

const { server, handler } = createElysiaWS(events, {
	validate: true, // Enable Zod validation
	debug: true, // Enable logging
})

// Handle request/response
server.onRequest('ping', async payload => {
	console.log('Received ping:', payload.timestamp)
	return { pong: 'Hello!' }
})

// Handle one-way messages
server.onSend('notify', async payload => {
	console.log('Notification:', payload.message)
})

new Elysia()
	.ws('/ws', handler)
	.listen(3000)
```

### Client (Browser/Bun)

```typescript
// client.ts
import { createClient } from '@mdrv/ws/v001/client'
import { events } from './events'

const client = createClient('ws://localhost:3000/ws', events, {
	validate: true,
	debug: true,
})

client.connect()

client.onOpen(async () => {
	// Request/response
	const result = await client.request('ping', {
		timestamp: Date.now(),
	})
	console.log(result.pong) // "Hello!"

	// One-way send
	client.send('notify', {
		message: 'Hello from client!',
	})
})
```

## Architecture

The library is organized into three main parts:

### Shared (`v001/shared/`)

Common types, protocol definition, and utilities used by both client and server:

- `protocol.ts` - Message types and protocol version
- `schema.ts` - Zod schema helpers and type inference
- `serializer.ts` - CBOR/JSON serializers
- `utils.ts` - Utility functions

### Client (`v001/client/`)

Browser and Bun client implementation:

- `reconnecting-ws.ts` - WebSocket wrapper with auto-reconnect
- `typed-client.ts` - Type-safe client with Zod validation

### Server (`v001/server/`)

Server-side implementation:

- `typed-server.ts` - Core server logic
- `elysia.ts` - Elysia framework adapter

## API Reference

### Client API

#### `createClient(url, events, options?)`

Create a typed WebSocket client.

**Options:**

```typescript
{
  validate?: boolean           // Enable Zod validation (default: true)
  requestTimeout?: number      // Default request timeout in ms (default: 30000)
  debug?: boolean             // Enable debug logging (default: false)
  serializer?: Serializer     // Custom serializer (default: CBOR)
  
  // Reconnection options
  maxReconnectionDelay?: number
  minReconnectionDelay?: number
  reconnectionDelayGrowFactor?: number
  maxRetries?: number
  startClosed?: boolean
}
```

**Methods:**

```typescript
client.connect()                           // Connect to server
client.close(code?, reason?)              // Close connection
client.send(event, payload?)               // Send one-way message
client.request(event, payload?, options?)  // Send request, await response
client.on(event, handler)                  // Listen for messages
client.off(event, handler)                 // Remove listener
client.onOpen(handler)                     // Connection opened
client.onClose(handler)                    // Connection closed
client.onError(handler)                    // Connection error
```

### Server API

#### `createElysiaWS(events, options?)`

Create Elysia WebSocket handler.

**Options:**

```typescript
{
  validate?: boolean      // Enable Zod validation (default: true)
  debug?: boolean        // Enable debug logging (default: false)
  serializer?: Serializer // Custom serializer (default: CBOR)
}
```

**Methods:**

```typescript
server.onSend(event, handler) // Handle one-way messages
server.onRequest(event, handler) // Handle request/response
server.handleMessage(ws, data) // Internal message handler
```

## Message Protocol

v001 uses a versioned binary protocol:

```typescript
// One-way send
{
  v: "1.0",              // Protocol version
  t: "send",             // Message type
  x: "eventName",        // Event name
  p?: { ... }            // Optional payload
}

// Request
{
  v: "1.0",
  t: "request",
  x: "eventName",
  id?: "unique-id",      // Optional request ID
  w: 1234567890,         // Timestamp (fallback matching)
  p?: { ... }
}

// Response (success)
{
  v: "1.0",
  t: "response_ok",
  x: "eventName",
  id?: "unique-id",
  w: 1234567890,
  p?: { ... }
}

// Response (error)
{
  v: "1.0",
  t: "response_error",
  x: "eventName",
  id?: "unique-id",
  w: 1234567890,
  e: {
    message: "Error message",
    cause?: ...
  }
}
```

## Examples

See `/v001/examples/` for complete working examples:

- **01-ping-pong** - Basic request/response and one-way messages
- **02-chat** - Multi-user chat with rooms and broadcasting
- **03-auth** - Authentication and protected endpoints

## Migration from Old Version

Key differences from the old codebase:

### Architecture

- **Old**: Complex mixin pattern with `WsWithAction`
- **New**: Clean composition-based API

### API Changes

```typescript
// Old
ws.x.eventName(args) // Send
ws.w.eventName(args) // Request
ws.y.eventName(result) // Server response

// New
client.send('eventName', args) // Send
client.request('eventName', args) // Request
server.onRequest('eventName', handler) // Server response
```

### Event Definition

```typescript
// Old
const events = { eventName: { a: schema, s: schema } }

// New
const events = defineEvents({
	eventName: {
		request: schema,
		response: schema,
	},
})
```

### Server Setup

```typescript
// Old
const wsz = new WSZ(eventKeys, ws)
wsz.respond(e)({ eventName: (y, n, args) => ... })

// New
const { server, handler } = createElysiaWS(events)
server.onRequest('eventName', async (payload) => {
  return result
})
```

## Testing

```bash
# Run all tests
bun test v001/tests/

# Watch mode
bun test --watch v001/tests/

# Run examples
bun run example:ping
bun run example:chat
bun run example:auth
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run example server
bun v001/examples/01-ping-pong/server.ts

# Run example client
bun v001/examples/01-ping-pong/client.ts
```

## Comparison with Alternatives

### vs tRPC

- **tRPC**: RPC-focused, HTTP-based with WebSocket subscriptions
- **@mdrv/ws**: WebSocket-first, bidirectional messaging
- **@mdrv/ws**: First-class Elysia support (tRPC doesn't have official Elysia adapter)

### vs Socket.IO

- **Socket.IO**: No built-in type safety or validation
- **@mdrv/ws**: Full TypeScript + Zod validation
- **@mdrv/ws**: Simpler API, less overhead

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

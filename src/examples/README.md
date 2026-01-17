# @mdrv/ws v001 Examples

This directory contains working examples demonstrating the library's features.

## Examples

### 01-ping-pong

Basic request/response pattern with one-way notifications.

**Run:**

```bash
# Terminal 1 - Start server
bun v001/examples/01-ping-pong/server.ts

# Terminal 2 - Start client
bun v001/examples/01-ping-pong/client.ts
```

**Features:**

- Request/response pattern (`ping` -> `pong`)
- One-way messages (`notify`)
- Auto-reconnection
- Type-safe payloads

---

### 02-chat

Multi-user chat room with real-time messaging.

**Run:**

```bash
# Terminal 1 - Start server
bun v001/examples/02-chat/server.ts

# Terminal 2 - Client 1
bun v001/examples/02-chat/client.ts alice

# Terminal 3 - Client 2
bun v001/examples/02-chat/client.ts bob

# Terminal 4 - Client 3 (different room)
bun v001/examples/02-chat/client.ts charlie lobby
```

**Features:**

- Multiple chat rooms
- Broadcasting messages
- User join/leave notifications
- Connection state management

---

### 03-auth

Authentication and authorization pattern.

**Run:**

```bash
# Terminal 1 - Start server
bun v001/examples/03-auth/server.ts

# Terminal 2 - Authenticated client
bun v001/examples/03-auth/client.ts secret-token

# Terminal 3 - Unauthorized client
bun v001/examples/03-auth/client.ts wrong-token
```

**Features:**

- Token-based authentication
- Protected endpoints
- Error handling
- Per-connection state

---

## Common Patterns

### Event Definition

```typescript
import { z } from 'zod'
import { defineEvents } from '../../shared/schema.ts'

const events = defineEvents({
  myEvent: {
    request: z.object({ ... }),
    response: z.object({ ... }),
  },
})
```

### Server Setup

```typescript
import { createElysiaWS } from '../../server/index.ts'

const { server, handler } = createElysiaWS(events)

server.onRequest('myEvent', async (payload) => {
	return { result: 'ok' }
})

new Elysia().ws('/ws', handler).listen(3000)
```

### Client Setup

```typescript
import { createClient } from '../../client/index.ts'

const client = createClient('ws://localhost:3000/ws', events)

client.connect()

// Request/response
const result = await client.request('myEvent', { ... })

// One-way send
client.send('myEvent', { ... })

// Listen for messages
client.on('myEvent', (data) => { ... })
```

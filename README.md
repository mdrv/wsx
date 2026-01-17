# @mdrv/wsx

Type-safe WebSocket library with Zod validation for Elysia and browser clients.

## Documentation

📚 **[View Full Documentation](https://mdrv.github.io/wsx/)**

## Features

- ✅ **End-to-end type safety** - Full TypeScript support from client to server
- ✅ **Zod validation** - Runtime validation of all messages
- ✅ **Auto-reconnection** - Robust reconnection with exponential backoff
- ✅ **Request/response pattern** - Promise-based RPC over WebSocket
- ✅ **Message queuing** - Queue messages when disconnected
- ✅ **Protocol versioning** - Built-in compatibility checking
- ✅ **CBOR serialization** - Fast binary encoding (JSON also available)
- ✅ **Elysia integration** - First-class Elysia framework support

## Installation

```bash
bun add @mdrv/wsx zod cbor-x elysia
```

## Quick Example

```typescript
// Define events
import { defineEvents } from '@mdrv/wsx/v001/shared'
import { z } from 'zod'

export const events = defineEvents({
	ping: {
		request: z.object({ timestamp: z.number() }),
		response: z.object({ pong: z.string() }),
	},
})

// Server
import { createElysiaWS } from '@mdrv/wsx/v001/server'
import { Elysia } from 'elysia'

const { server, handler } = createElysiaWS(events)
server.onRequest('ping', async payload => ({ pong: 'Hello!' }))
new Elysia().ws('/ws', handler).listen(3000)

// Client
import { createClient } from '@mdrv/wsx/v001/client'

const client = createClient('ws://localhost:3000/ws', events)
client.connect()
client.onOpen(async () => {
	const result = await client.request('ping', { timestamp: Date.now() })
	console.log(result.pong) // "Hello!"
})
```

## Learn More

- 📖 [Quick Start Guide](https://mdrv.github.io/wsx/quick-start)
- 📚 [API Reference](https://mdrv.github.io/wsx/api)
- 💡 [Examples](https://mdrv.github.io/wsx/examples)
- 🔄 [Migration Guide](https://mdrv.github.io/wsx/migration)

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build package
bun b

# Build documentation
cd docs && bun b
```

## License

MIT

## Links

- [npm Package](https://www.npmjs.com/package/@mdrv/wsx)
- [GitHub Repository](https://github.com/mdrv/wsx)
- [Documentation](https://mdrv.github.io/wsx/)

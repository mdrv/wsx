# @mdrv/ws v001 Tests

Basic test suite using Bun's built-in test runner.

## Running Tests

```bash
# Run all tests
bun test v001/tests/

# Run specific test file
bun test v001/tests/protocol.test.ts

# Watch mode
bun test --watch v001/tests/
```

## Test Coverage

- `protocol.test.ts` - Protocol message matching logic
- `serializer.test.ts` - CBOR and JSON serializers
- `schema.test.ts` - Zod schema validation and type inference

## Adding More Tests

To add end-to-end tests with actual WebSocket connections, you can create integration tests that start a server and connect clients. Example:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { createClient } from '../client/index.ts'
import { createElysiaWS } from '../server/index.ts'

describe('Integration', () => {
  let server: any

  beforeAll(() => {
    // Start server
    const { server: ws, handler } = createElysiaWS(events)
    server = new Elysia().ws('/ws', handler).listen(3999)
  })

  afterAll(() => {
    // Stop server
    server.stop()
  })

  it('should connect and exchange messages', async () => {
    // Test implementation
  })
})
```

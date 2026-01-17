# Testing Architecture Design

## Overview

This design establishes a comprehensive testing strategy for @mdrv/wsx using Bun's built-in test runner. The strategy covers unit, integration, and end-to-end tests with focus on critical paths.

## Testing Pyramid

```
      /\
     /E2E\      - 3 test files (~10-15 tests)
    /------\    - Full workflows, examples
   /  Intg  \   - 4 test files (~25-35 tests)
  /----------\  - Client-server communication
 /    Unit    \ - 8-10 test files (~50-70 tests)
/--------------\- Individual module behavior
```

**Rationale**: Focus testing effort on unit tests (fast, isolated) with sufficient integration tests to verify interactions and minimal E2E tests to validate complete workflows.

## Test Organization

### Directory Structure

```
src/
├── client/
│   ├── __tests__/
│   │   ├── reconnecting-ws.test.ts
│   │   └── typed-client.test.ts
│   ├── reconnecting-ws.ts
│   ├── typed-client.ts
│   └── index.ts
├── server/
│   ├── __tests__/
│   │   ├── typed-server.test.ts
│   │   └── elysia.test.ts
│   ├── typed-server.ts
│   ├── elysia.ts
│   └── index.ts
├── shared/
│   └── (keep tests in src/tests/ for now)
└── tests/
    ├── protocol.test.ts (existing)
    ├── serializer.test.ts (existing)
    ├── schema.test.ts (existing)
    ├── utils.test.ts (new)
    └── README.md

tests/
├── integration/
│   ├── connection.test.ts
│   ├── request-response.test.ts
│   ├── send.test.ts
│   └── reconnection.test.ts
├── e2e/
│   ├── ping-pong.test.ts
│   ├── chat.test.ts
│   └── auth.test.ts
└── utils/
    ├── mock-server.ts
    ├── test-client.ts
    ├── fixtures.ts
    ├── assertions.ts
    └── helpers.ts
```

**Rationale**:

- Unit tests live next to source files (`__tests__/`) for easy navigation
- Shared tests stay in `src/tests/` (existing location)
- Integration and E2E tests in dedicated `tests/` directory
- Test utilities centralized in `tests/utils/`

## Test Utilities

### Mock Server (`tests/utils/mock-server.ts`)

Purpose: Lightweight WebSocket server for testing client behavior without full Elysia setup.

```typescript
export class MockServer {
	constructor(port: number)
	start(): Promise<void>
	stop(): Promise<void>
	onConnection(callback: (ws: WebSocket) => void): void
	sendToClient(message: any): void
	getReceivedMessages(): any[]
	simulateDisconnect(): void
	simulateError(error: Error): void
}
```

**Rationale**: Unit tests for client need server, but shouldn't depend on full server implementation. Mock server provides minimal WebSocket server for client testing.

### Test Client (`tests/utils/test-client.ts`)

Purpose: Simplified WebSocket client for testing server behavior.

```typescript
export class TestClient {
	constructor(url: string)
	connect(): Promise<void>
	disconnect(): void
	send(message: any): void
	waitForMessage(timeout?: number): Promise<any>
	getReceivedMessages(): any[]
}
```

**Rationale**: Server tests need client, but shouldn't use TypedWSClient (circular dependency). Test client is minimal WebSocket client for server testing.

### Fixtures (`tests/utils/fixtures.ts`)

Purpose: Reusable event definitions and test data.

```typescript
export const testEvents = defineEvents({
	ping: {
		request: z.object({ timestamp: z.number() }),
		response: z.object({ pong: z.string() }),
	},
	notify: {
		request: z.object({ message: z.string() }),
	},
	// ... more test events
})

export const samplePayloads = {
	ping: { timestamp: Date.now() },
	pong: { pong: 'hello' },
	// ... more payloads
}
```

**Rationale**: Avoid duplicating event definitions across tests. Centralized fixtures ensure consistency and reduce boilerplate.

### Helpers (`tests/utils/helpers.ts`)

Purpose: Common async patterns for tests.

```typescript
export async function waitForConnection(
	client: TypedWSClient<any>,
	timeout = 5000,
): Promise<void>

export async function waitForMessage(
	handler: () => void,
	timeout = 1000,
): Promise<any>

export function delay(ms: number): Promise<void>

export async function withTimeout<T>(
	promise: Promise<T>,
	timeout: number,
	message?: string,
): Promise<T>
```

**Rationale**: WebSocket tests involve async operations. Helper functions reduce boilerplate and improve test readability.

### Assertions (`tests/utils/assertions.ts`)

Purpose: Custom assertions for WebSocket scenarios.

```typescript
export function expectMessage(
	received: any,
	expected: Partial<Message>,
): void

export function expectValidMessage(message: any): void

export function expectProtocolVersion(message: any, version: string): void
```

**Rationale**: Domain-specific assertions make tests more expressive and failures more informative.

## Critical Paths to Test

### 1. Connection Lifecycle (High Priority)

- **Client connects** → Server receives connection
- **Client disconnects** → Server handles cleanup
- **Server closes** → Client attempts reconnection
- **Network error** → Client reconnects with backoff

**Why critical**: Core functionality. Failure breaks entire library.

### 2. Request/Response Pattern (High Priority)

- **Client request** → Server handler → Client receives response
- **Request timeout** → Client rejects promise
- **Server error** → Client receives error response
- **Validation error** → Appropriate error thrown

**Why critical**: Primary communication pattern. Users depend on reliable request/response.

### 3. Reconnection Logic (High Priority)

- **Exponential backoff** works correctly
- **Retry limits** are respected
- **Message queue** persists and sends on reconnect
- **Uptime tracking** resets retry count

**Why critical**: Advertised feature. Complex logic prone to bugs.

### 4. Validation (Medium Priority)

- **Zod schemas** validate payloads
- **Invalid data** throws descriptive errors
- **Validation can be disabled** for performance

**Why critical**: Type safety is core value proposition.

### 5. Error Handling (Medium Priority)

- **Network errors** are caught and handled
- **Protocol errors** don't crash application
- **Handler errors** are sent as error responses
- **Timeouts** reject pending requests

**Why critical**: Graceful degradation improves user experience.

## Testing Strategies

### Unit Tests

**Approach**: Test individual classes/functions in isolation using mocks.

**Example**: Testing ReconnectingWS without real WebSocket server

```typescript
describe('ReconnectingWS', () => {
	it('should reconnect with exponential backoff', async () => {
		const ws = new ReconnectingWS('ws://mock', {
			minReconnectionDelay: 100,
			reconnectionDelayGrowFactor: 2,
		})
		// Mock WebSocket failures
		// Verify delay increases: 100ms, 200ms, 400ms, ...
	})
})
```

**Rationale**: Fast, deterministic, easy to write. Catches logic errors early.

### Integration Tests

**Approach**: Test client-server communication with real WebSocket connections on localhost.

**Example**: Testing request/response flow

```typescript
describe('Request/Response', () => {
	let server: any
	let client: TypedWSClient<any>

	beforeAll(async () => {
		// Start real server on localhost
		server = await startTestServer()
	})

	afterAll(async () => {
		await server.stop()
	})

	it('should handle request/response', async () => {
		const response = await client.request('ping', { timestamp: Date.now() })
		expect(response.pong).toBeDefined()
	})
})
```

**Rationale**: Verifies components work together. Catches integration issues.

### End-to-End Tests

**Approach**: Run complete example scenarios to validate user-facing workflows.

**Example**: Testing ping-pong example

```typescript
describe('Ping-Pong Example', () => {
	it('should complete ping-pong workflow', async () => {
		// Mimic exact code from examples/01-ping-pong/
		// Verify it works as documented
	})
})
```

**Rationale**: Validates documentation examples work. Gives confidence in user experience.

## Performance Considerations

### Test Speed Targets

- **Unit tests**: < 100ms each (fast feedback)
- **Integration tests**: < 1s each (acceptable for CI)
- **E2E tests**: < 5s each (only for critical workflows)

### Parallelization

Bun test runner runs tests in parallel by default. Strategy:

- Unit tests can run in parallel (isolated)
- Integration tests may need sequential execution (shared ports)
- E2E tests can run in parallel (use different ports)

### Resource Management

- **Cleanup**: Always close connections in `afterEach`/`afterAll`
- **Timeouts**: Set reasonable timeouts to prevent hanging tests
- **Ports**: Use dynamic port allocation or port ranges to avoid conflicts

## Coverage Strategy

**Focus on critical paths rather than coverage percentage.**

### Must Cover (100%)

- Connection lifecycle
- Request/response flow
- Reconnection logic
- Validation errors

### Should Cover (80%+)

- Error handling
- Edge cases in utilities
- Message queuing

### Nice to Have (50%+)

- Rare error scenarios
- Performance edge cases
- Backward compatibility

**Rationale**: 100% coverage is expensive and provides diminishing returns. Focus on high-value tests.

## Trade-offs and Decisions

### ✅ Keep Bun Test Runner

- **Pro**: Fast, built-in, TypeScript support
- **Pro**: No additional dependencies
- **Pro**: Familiar to Bun users
- **Con**: Less mature than Jest/Vitest
- **Decision**: Bun test is sufficient for project needs

### ✅ Colocate Unit Tests

- **Pro**: Easy to find tests for source file
- **Pro**: Encourages testing while coding
- **Con**: Slightly more complex directory structure
- **Decision**: Benefits outweigh complexity

### ✅ Separate Integration/E2E Tests

- **Pro**: Clear distinction between test types
- **Pro**: Can run subsets independently
- **Con**: More directories to manage
- **Decision**: Organization clarity is valuable

### ✅ Focus on Critical Paths

- **Pro**: Maximum value for effort
- **Pro**: Faster test suite
- **Con**: Lower coverage percentage
- **Decision**: Quality over quantity

### ❌ No CI/CD Changes Yet

- **Pro**: Keeps change scoped
- **Pro**: Can add later when needed
- **Con**: Tests not enforced automatically
- **Decision**: Manual testing sufficient for now, CI/CD is future work

## Open Questions

1. **Should we add coverage reporting?**
   - Deferred to future work
   - Can be added without changing tests

2. **Should we test browser compatibility?**
   - Deferred (unclear if library targets browsers)
   - Would require browser test environment

3. **Should we add snapshot testing?**
   - Not planned (protocol is stable)
   - Can be added if needed for message formats

4. **Should we mock WebSocket at OS level?**
   - No - use real WebSocket connections
   - More realistic, catches actual bugs

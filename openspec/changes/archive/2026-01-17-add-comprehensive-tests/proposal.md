# Change: Add Comprehensive Test Suite

## Why

The @mdrv/wsx library currently has only basic unit tests covering:

- Protocol message matching logic (3 tests)
- CBOR and JSON serializers (6 tests)
- Zod schema validation and type inference (2 tests)

**Total: 11 tests covering only shared utilities**

This leaves critical functionality untested:

- **Client reconnection logic** - The core feature that handles auto-reconnection with exponential backoff, uptime tracking, and connection timeouts
- **Server request/response handling** - Processing incoming requests, validating payloads, sending responses
- **Message queuing** - Queueing messages when disconnected and sending them on reconnection
- **Error handling** - Network errors, validation errors, timeout errors, protocol errors
- **Type safety validation** - Runtime validation with Zod schemas
- **Edge cases** - Race conditions, concurrent requests, malformed messages
- **Integration scenarios** - Full client-server communication flows

Without comprehensive tests, the library lacks:

- **Confidence in refactoring** - Changes may break critical paths without detection
- **Regression prevention** - Bugs can be reintroduced unknowingly
- **Documentation value** - Tests serve as executable examples of expected behavior
- **Reliability assurance** - Critical paths are not validated systematically

## What Changes

### Test Infrastructure

- Add test configuration with coverage reporting
- Add test script to package.json following convention (`t` → test)
- Configure Bun test runner with TypeScript support
- Add test utilities and helpers for common patterns

### Unit Tests

Expand unit test coverage for individual modules:

- **Client (`src/client/`)**
  - `reconnecting-ws.test.ts` - ReconnectingWS class behavior
    - Connection establishment and lifecycle
    - Reconnection logic with exponential backoff
    - Message queuing when disconnected
    - Retry count and uptime tracking
    - Connection timeout handling
  - `typed-client.test.ts` - TypedWSClient request/response
    - Request/response pattern with promises
    - Event handlers registration and invocation
    - Validation with Zod schemas
    - Timeout handling for requests
    - Error propagation

- **Server (`src/server/`)**
  - `typed-server.test.ts` - TypedWSServer and TypedWSConnection
    - Request handler registration and invocation
    - Send handler registration
    - Response validation
    - Error handling and error responses
    - Connection lifecycle
  - `elysia.test.ts` - Elysia integration
    - Handler creation and configuration
    - Message routing to handlers
    - WebSocket lifecycle hooks

- **Shared (`src/shared/`)**
  - Expand existing tests with edge cases:
    - `protocol.test.ts` - Add type guards, error cases
    - `serializer.test.ts` - Add error handling, large payloads
    - `schema.test.ts` - Add complex schemas, optional fields
  - `utils.test.ts` - Utility functions
    - ID generation uniqueness
    - Error normalization
    - Timeout creation

### Integration Tests

Add integration tests that verify client-server communication:

- **Connection flow** (`tests/integration/connection.test.ts`)
  - Client connects to server successfully
  - Server receives connection event
  - Client handles connection failure
  - Client reconnects after disconnection

- **Request/Response pattern** (`tests/integration/request-response.test.ts`)
  - Client sends request, server responds
  - Multiple concurrent requests
  - Request timeout handling
  - Response error handling
  - Validation errors on both sides

- **One-way messaging** (`tests/integration/send.test.ts`)
  - Client sends one-way messages
  - Server sends one-way messages
  - Handler invocation without response

- **Reconnection scenarios** (`tests/integration/reconnection.test.ts`)
  - Client reconnects after server restart
  - Message queue is sent on reconnection
  - Pending requests handle reconnection
  - Retry limits are respected

### End-to-End Tests

Add E2E tests that verify complete workflows:

- **Ping-pong example** (`tests/e2e/ping-pong.test.ts`)
  - Full ping-pong workflow from example
  - Type safety validation
  - Performance under load

- **Chat example** (`tests/e2e/chat.test.ts`)
  - Multiple clients connecting
  - Broadcasting messages
  - Client disconnection handling

- **Auth example** (`tests/e2e/auth.test.ts`)
  - Authentication flow
  - Authorized vs unauthorized requests
  - Session management

### Test Utilities

Create shared test utilities:

- **Mock server** - Lightweight WebSocket server for testing
- **Test client** - Simplified client for testing server logic
- **Assertions** - Custom matchers for WebSocket scenarios
- **Fixtures** - Reusable event definitions and payloads
- **Helpers** - Wait for connection, wait for message, etc.

## Impact

- Affected specs: **testing** (new capability)
- Affected files:
  - New: `package.json` - Add `t` script for running tests
  - New: `bunfig.toml` (optional) - Bun test configuration
  - New: `src/client/__tests__/` - Client unit tests
  - New: `src/server/__tests__/` - Server unit tests
  - New: `src/shared/__tests__/` - Expanded shared tests (or keep in `tests/`)
  - New: `tests/integration/` - Integration tests
  - New: `tests/e2e/` - End-to-end tests
  - New: `tests/utils/` - Test utilities and helpers
  - Modified: `src/tests/README.md` - Update with new test organization
- Build/CI: No changes to CI/CD at this time (future consideration)
- Coverage focus: Critical paths (connection, reconnection, request/response, validation)
- Test count estimate: 80-120 tests total (currently 11)
- No breaking changes to library code
- Tests serve as living documentation of expected behavior

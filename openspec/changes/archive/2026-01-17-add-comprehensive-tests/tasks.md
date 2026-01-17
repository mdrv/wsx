# Tasks

## Prerequisites

- [ ] Review existing tests in `src/tests/` to understand patterns
- [ ] Review source code structure and critical paths
- [ ] Identify test utilities needed for common patterns

## Test Infrastructure Setup

- [ ] Add `t` script to package.json: `bun test`
- [ ] (Optional) Create bunfig.toml with test configuration
- [ ] Create `tests/utils/` directory for shared test utilities
- [ ] Create mock server utility for testing clients
- [ ] Create test client utility for testing server
- [ ] Create common fixtures (event definitions, payloads)
- [ ] Create custom assertions/helpers (waitForConnection, waitForMessage, etc.)

## Unit Tests - Client

- [ ] Create `src/client/__tests__/reconnecting-ws.test.ts`
  - [ ] Test connection establishment
  - [ ] Test successful connection lifecycle (open → message → close)
  - [ ] Test reconnection after disconnect with exponential backoff
  - [ ] Test retry count increments and resets on successful uptime
  - [ ] Test connection timeout handling
  - [ ] Test max retries limit
  - [ ] Test message queuing when disconnected
  - [ ] Test max enqueued messages limit
  - [ ] Test manual close stops reconnection
  - [ ] Test startClosed option
  - [ ] Test URL provider (string, function, async function)

- [ ] Create `src/client/__tests__/typed-client.test.ts`
  - [ ] Test request/response pattern returns promise
  - [ ] Test multiple concurrent requests
  - [ ] Test request timeout throws error
  - [ ] Test response validation with Zod
  - [ ] Test request validation with Zod
  - [ ] Test validation errors are caught and rejected
  - [ ] Test event handlers registration (onRequest, onSend)
  - [ ] Test event handlers invocation with correct payload
  - [ ] Test send (one-way) message
  - [ ] Test error propagation from server
  - [ ] Test lifecycle methods (onOpen, onClose, onError)
  - [ ] Test pending requests cleanup on disconnect

## Unit Tests - Server

- [ ] Create `src/server/__tests__/typed-server.test.ts`
  - [ ] Test request handler registration
  - [ ] Test request handler invocation with payload
  - [ ] Test response validation with Zod
  - [ ] Test error response on handler exception
  - [ ] Test error response on validation failure
  - [ ] Test send handler registration
  - [ ] Test send handler invocation
  - [ ] Test connection send method
  - [ ] Test connection respond method
  - [ ] Test multiple handlers for same event (if supported)

- [ ] Create `src/server/__tests__/elysia.test.ts`
  - [ ] Test createElysiaWS returns handler
  - [ ] Test handler configuration (serializer, validation)
  - [ ] Test message routing to correct handlers
  - [ ] Test WebSocket lifecycle hooks (open, message, close)
  - [ ] Test server broadcast functionality (if exists)

## Unit Tests - Shared (Expand Existing)

- [ ] Expand `src/tests/protocol.test.ts`
  - [ ] Test type guard functions (isSendMessage, isRequestMessage, etc.)
  - [ ] Test matchesRequest edge cases (missing ID, mismatched events)
  - [ ] Test message type constants

- [ ] Expand `src/tests/serializer.test.ts`
  - [ ] Test error handling for invalid data
  - [ ] Test large payloads (performance)
  - [ ] Test binary data types (Uint8Array, Buffer, ArrayBuffer)
  - [ ] Test edge cases (empty objects, null, undefined)

- [ ] Expand `src/tests/schema.test.ts`
  - [ ] Test complex nested schemas
  - [ ] Test optional fields in event definitions
  - [ ] Test events without request schema
  - [ ] Test events without response schema
  - [ ] Test InferEventMap type utility

- [ ] Create `src/tests/utils.test.ts`
  - [ ] Test generateRequestId uniqueness
  - [ ] Test normalizeError with different error types
  - [ ] Test createTimeout utility
  - [ ] Test any other utility functions

## Integration Tests

- [ ] Create `tests/integration/connection.test.ts`
  - [ ] Test client connects to server successfully
  - [ ] Test server receives open event
  - [ ] Test client handles connection failure (server not running)
  - [ ] Test client reconnects after server disconnect
  - [ ] Test multiple clients connect to same server

- [ ] Create `tests/integration/request-response.test.ts`
  - [ ] Test client request receives server response
  - [ ] Test response payload matches schema
  - [ ] Test multiple concurrent requests from same client
  - [ ] Test request timeout when server doesn't respond
  - [ ] Test server response error propagates to client
  - [ ] Test validation error on request payload
  - [ ] Test validation error on response payload

- [ ] Create `tests/integration/send.test.ts`
  - [ ] Test client send triggers server handler
  - [ ] Test server send triggers client handler
  - [ ] Test one-way messages don't expect response
  - [ ] Test handler receives correct payload
  - [ ] Test validation on send messages

- [ ] Create `tests/integration/reconnection.test.ts`
  - [ ] Test client reconnects after server restart
  - [ ] Test queued messages sent on reconnection
  - [ ] Test pending requests fail gracefully on disconnect
  - [ ] Test retry limits are respected
  - [ ] Test exponential backoff timing
  - [ ] Test uptime reset after successful connection

## End-to-End Tests

- [ ] Create `tests/e2e/ping-pong.test.ts`
  - [ ] Test complete ping-pong workflow from example
  - [ ] Test type safety (compile-time and runtime)
  - [ ] Test performance with rapid ping-pongs

- [ ] Create `tests/e2e/chat.test.ts`
  - [ ] Test multiple clients connecting
  - [ ] Test message broadcasting to all clients
  - [ ] Test client disconnect handling
  - [ ] Test chat history (if applicable)

- [ ] Create `tests/e2e/auth.test.ts`
  - [ ] Test authentication flow
  - [ ] Test authorized request succeeds
  - [ ] Test unauthorized request fails
  - [ ] Test token validation (if applicable)

## Documentation

- [ ] Update `src/tests/README.md` with new test organization
  - [ ] Document test directory structure
  - [ ] Document how to run different test types
  - [ ] Document test utilities usage
  - [ ] Add examples of writing new tests
- [ ] Add inline code comments for complex test scenarios
- [ ] Add JSDoc to test utility functions

## Validation

- [ ] Run all tests: `bun test`
- [ ] Verify all tests pass
- [ ] Check test coverage focuses on critical paths
- [ ] Ensure tests are fast (unit < 100ms, integration < 1s, e2e < 5s)
- [ ] Verify no flaky tests (run multiple times)
- [ ] Review test output for clarity and usefulness

## Future Considerations (Not in Scope)

- [ ] CI/CD integration (GitHub Actions workflow)
- [ ] Coverage reporting (codecov, coveralls)
- [ ] Pre-commit hooks for running tests
- [ ] Performance benchmarks
- [ ] Mutation testing
- [ ] Browser compatibility tests (if library supports browsers)

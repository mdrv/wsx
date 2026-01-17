# testing Specification

## Purpose

Ensure the @mdrv/wsx library maintains high quality and reliability through comprehensive automated testing covering unit, integration, and end-to-end scenarios with focus on critical paths.

## ADDED Requirements

### Requirement: Test Infrastructure

The project SHALL provide test infrastructure using Bun's built-in test runner with TypeScript support.

#### Scenario: Run all tests

- **WHEN** a developer executes `bun test`
- **THEN** all unit, integration, and E2E tests SHALL run
- **AND** the test results SHALL be displayed clearly
- **AND** the process SHALL exit with code 0 on success, non-zero on failure

#### Scenario: Run specific test types

- **WHEN** a developer executes `bun test src/`
- **THEN** only unit tests SHALL run
- **WHEN** a developer executes `bun test tests/integration/`
- **THEN** only integration tests SHALL run
- **WHEN** a developer executes `bun test tests/e2e/`
- **THEN** only E2E tests SHALL run

#### Scenario: Test utilities are available

- **WHEN** tests need common functionality
- **THEN** test utilities SHALL be available in `tests/utils/`
- **AND** utilities SHALL include mock server, test client, fixtures, helpers, and assertions

### Requirement: Unit Test Coverage

The project SHALL have unit tests for all client, server, and shared modules testing individual components in isolation.

#### Scenario: Client reconnection logic is tested

- **WHEN** ReconnectingWS is tested
- **THEN** connection establishment SHALL be verified
- **AND** reconnection with exponential backoff SHALL be verified
- **AND** message queuing when disconnected SHALL be verified
- **AND** retry limits SHALL be verified
- **AND** connection timeout handling SHALL be verified
- **AND** uptime tracking and retry count reset SHALL be verified

#### Scenario: Client typed API is tested

- **WHEN** TypedWSClient is tested
- **THEN** request/response pattern with promises SHALL be verified
- **AND** concurrent requests SHALL be verified
- **AND** request timeout handling SHALL be verified
- **AND** Zod validation for requests and responses SHALL be verified
- **AND** event handler registration and invocation SHALL be verified
- **AND** error propagation SHALL be verified

#### Scenario: Server typed API is tested

- **WHEN** TypedWSServer and TypedWSConnection are tested
- **THEN** request handler registration and invocation SHALL be verified
- **AND** send handler registration and invocation SHALL be verified
- **AND** response validation SHALL be verified
- **AND** error handling and error responses SHALL be verified
- **AND** connection lifecycle SHALL be verified

#### Scenario: Shared utilities are tested

- **WHEN** shared utilities are tested
- **THEN** protocol message matching SHALL be verified
- **AND** serializers (CBOR, JSON) SHALL be verified
- **AND** schema validation and type inference SHALL be verified
- **AND** utility functions (ID generation, error normalization) SHALL be verified

### Requirement: Integration Test Coverage

The project SHALL have integration tests verifying client-server communication with real WebSocket connections.

#### Scenario: Connection flow is tested

- **WHEN** connection integration is tested
- **THEN** client connecting to server SHALL be verified
- **AND** server receiving connection event SHALL be verified
- **AND** client handling connection failure SHALL be verified
- **AND** client reconnecting after disconnect SHALL be verified

#### Scenario: Request/response pattern is tested

- **WHEN** request/response integration is tested
- **THEN** client request receiving server response SHALL be verified
- **AND** multiple concurrent requests SHALL be verified
- **AND** request timeout when server doesn't respond SHALL be verified
- **AND** server error propagation SHALL be verified
- **AND** validation errors on both sides SHALL be verified

#### Scenario: One-way messaging is tested

- **WHEN** one-way messaging is tested
- **THEN** client send triggering server handler SHALL be verified
- **AND** server send triggering client handler SHALL be verified
- **AND** handlers receiving correct payloads SHALL be verified

#### Scenario: Reconnection scenarios are tested

- **WHEN** reconnection integration is tested
- **THEN** client reconnecting after server restart SHALL be verified
- **AND** queued messages being sent on reconnection SHALL be verified
- **AND** pending requests handling reconnection SHALL be verified
- **AND** retry limits being respected SHALL be verified

### Requirement: End-to-End Test Coverage

The project SHALL have E2E tests validating complete user-facing workflows based on documentation examples.

#### Scenario: Ping-pong example works

- **WHEN** the ping-pong example is tested end-to-end
- **THEN** the complete workflow SHALL execute successfully
- **AND** type safety SHALL be verified at runtime
- **AND** the example SHALL match documentation

#### Scenario: Chat example works

- **WHEN** the chat example is tested end-to-end
- **THEN** multiple clients connecting SHALL work
- **AND** message broadcasting SHALL work
- **AND** client disconnection SHALL be handled gracefully

#### Scenario: Auth example works

- **WHEN** the auth example is tested end-to-end
- **THEN** authentication flow SHALL work
- **AND** authorized requests SHALL succeed
- **AND** unauthorized requests SHALL fail appropriately

### Requirement: Test Organization

The project SHALL organize tests in a clear, maintainable structure.

#### Scenario: Unit tests are colocated

- **WHEN** a developer looks for unit tests
- **THEN** client unit tests SHALL be in `src/client/__tests__/`
- **AND** server unit tests SHALL be in `src/server/__tests__/`
- **AND** shared unit tests SHALL be in `src/tests/`

#### Scenario: Integration tests are separated

- **WHEN** a developer looks for integration tests
- **THEN** integration tests SHALL be in `tests/integration/`
- **AND** each integration test file SHALL focus on one area (connection, request-response, send, reconnection)

#### Scenario: E2E tests are separated

- **WHEN** a developer looks for E2E tests
- **THEN** E2E tests SHALL be in `tests/e2e/`
- **AND** each E2E test SHALL correspond to a documentation example

#### Scenario: Test utilities are centralized

- **WHEN** tests need shared utilities
- **THEN** utilities SHALL be in `tests/utils/`
- **AND** utilities SHALL include mock server, test client, fixtures, helpers, and assertions

### Requirement: Test Quality

The project SHALL maintain high-quality tests that are fast, reliable, and focused on critical paths.

#### Scenario: Unit tests are fast

- **WHEN** unit tests run
- **THEN** each unit test SHALL complete in less than 100ms
- **AND** unit tests SHALL not depend on external resources
- **AND** unit tests SHALL be deterministic

#### Scenario: Integration tests are reliable

- **WHEN** integration tests run
- **THEN** each integration test SHALL complete in less than 1 second
- **AND** integration tests SHALL clean up resources in afterEach/afterAll
- **AND** integration tests SHALL not have race conditions

#### Scenario: E2E tests validate workflows

- **WHEN** E2E tests run
- **THEN** each E2E test SHALL complete in less than 5 seconds
- **AND** E2E tests SHALL test complete user workflows
- **AND** E2E tests SHALL match documentation examples

#### Scenario: Tests focus on critical paths

- **WHEN** tests are reviewed
- **THEN** connection lifecycle SHALL be thoroughly tested
- **AND** request/response pattern SHALL be thoroughly tested
- **AND** reconnection logic SHALL be thoroughly tested
- **AND** validation SHALL be thoroughly tested
- **AND** error handling SHALL be thoroughly tested

### Requirement: Test Documentation

The project SHALL document the testing approach, organization, and how to write new tests.

#### Scenario: Test README is comprehensive

- **WHEN** a developer reads `src/tests/README.md`
- **THEN** the test directory structure SHALL be documented
- **AND** how to run different test types SHALL be documented
- **AND** how to use test utilities SHALL be documented
- **AND** examples of writing new tests SHALL be provided

#### Scenario: Test utilities are documented

- **WHEN** a developer uses test utilities
- **THEN** each utility function SHALL have JSDoc comments
- **AND** usage examples SHALL be provided
- **AND** the purpose of each utility SHALL be clear

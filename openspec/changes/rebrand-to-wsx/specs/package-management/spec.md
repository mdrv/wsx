# Package Management Specification

## ADDED Requirements

### Requirement: Package Identity

The package SHALL be named `@mdrv/wsx` (scoped package under the @mdrv organization) and published to the npm registry under this identifier.

#### Scenario: Package is discoverable

- **WHEN** a user searches for `@mdrv/wsx` on npm
- **THEN** the package SHALL be found with its proper metadata

#### Scenario: Package can be installed

- **WHEN** a user runs `npm install @mdrv/wsx` or `bun add @mdrv/wsx`
- **THEN** the package SHALL install successfully with all required files

### Requirement: TypeScript Source Development

During development, the package SHALL expose TypeScript source files (.ts) through the exports field to enable direct TypeScript consumption without build step.

#### Scenario: Development import resolves to source

- **WHEN** a developer imports from `@mdrv/wsx` in a TypeScript project
- **THEN** the import SHALL resolve to `.ts` files in the `src/` directory
- **AND** TypeScript types SHALL be available directly from source

### Requirement: JavaScript Distribution

When published to npm, the package SHALL distribute transpiled JavaScript files to ensure Node.js compatibility.

#### Scenario: Published package uses transpiled files

- **WHEN** the package is published to npm
- **THEN** the `publishConfig.main` SHALL point to transpiled `.js` files in `dist/`
- **AND** the `publishConfig.types` SHALL point to generated `.d.ts` files in `dist/`
- **AND** the `publishConfig.exports` SHALL remap all paths from source `.ts` to dist `.js`

#### Scenario: Only distribution files are published

- **WHEN** the package is published
- **THEN** only the `dist/` directory SHALL be included in the published tarball
- **AND** source TypeScript files SHALL NOT be included in the published package

### Requirement: Build Transpilation

The package SHALL use tsdown to transpile TypeScript source to JavaScript for Node.js compatibility.

#### Scenario: Build script transpiles successfully

- **WHEN** the build script is executed
- **THEN** tsdown SHALL transpile all TypeScript files from `src/` to `dist/`
- **AND** type declaration files (.d.ts) SHALL be generated alongside JavaScript files
- **AND** the output SHALL be compatible with Node.js runtime

#### Scenario: Build preserves module structure

- **WHEN** tsdown transpiles the source
- **THEN** the directory structure SHALL be preserved in the output
- **AND** relative import paths SHALL remain functional

### Requirement: Dual Export Strategy

The package SHALL support both development (source TypeScript) and production (transpiled JavaScript) consumption patterns through package.json exports configuration.

#### Scenario: Development exports point to source

- **WHEN** the package.json exports field is evaluated during development
- **THEN** exports SHALL point to `.ts` files for direct TypeScript consumption

#### Scenario: Published exports point to transpiled code

- **WHEN** the publishConfig.exports field is used after npm publish
- **THEN** all exports SHALL be remapped to `.js` files in the `dist/` directory
- **AND** types SHALL point to corresponding `.d.ts` files

#### Scenario: Version-based exports are supported

- **WHEN** a user imports a versioned subpath like `@mdrv/wsx/v255`
- **THEN** the import SHALL resolve correctly to the appropriate module
- **AND** both source (dev) and transpiled (prod) paths SHALL work

### Requirement: Source Code Migration

The package source code SHALL be migrated from `/x/a/a/sv/a/ws` which contains WebSocket and Svelte utilities.

#### Scenario: Source files are copied to project

- **WHEN** implementing this change
- **THEN** relevant source files from `/x/a/a/sv/a/ws/v255` SHALL be copied to the project `src/` directory
- **AND** files from `/x/a/a/sv/a/ws/v000` SHALL be evaluated and copied if needed

#### Scenario: Import paths are updated

- **WHEN** source files are migrated
- **THEN** any internal import paths SHALL be updated to reflect the new package structure
- **AND** external dependencies SHALL be properly declared in package.json

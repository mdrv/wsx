# Change: Rebrand to wsx with TypeScript Transpilation

## Why

The project is being rebranded from its previous identity to **@mdrv/wsx** (wsx stands for WebSocket with action/extended) as the new scoped package name. The source code is being migrated from `/x/a/a/sv/a/ws` which contains WebSocket utilities built with TypeScript and Svelte. To ensure Node.js compatibility and follow modern publishing practices, the project needs a build pipeline that transpiles TypeScript to JavaScript for distribution.

## What Changes

- **BREAKING**: Package name changes to `@mdrv/wsx` (scoped package)
- Add tsdown as the build transpiler (esbuild-based, zero-config)
- Configure `package.json` with `publishConfig` to remap exports from TypeScript source to transpiled JavaScript
- Set up dual exports: source files point to `.ts` during development, published files point to `.js` in `dist/`
- Follow the pattern established by `github.com/mdrv/serai` for publishConfig structure

## Impact

- Affected specs: `package-management` (new capability)
- Affected code: 
  - New `package.json` configuration
  - New build scripts using tsdown
  - Source files from `/x/a/a/sv/a/ws` (WebSocket/Svelte utilities)

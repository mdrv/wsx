# Implementation Tasks

## 1. Package Configuration
- [ ] 1.1 Create package.json with name "@mdrv/wsx"
- [ ] 1.2 Configure publishConfig with main, types, and exports pointing to dist/
- [ ] 1.3 Set up exports mapping for development (source .ts) and production (dist .js)
- [ ] 1.4 Add tsdown to devDependencies
- [ ] 1.5 Configure build script using tsdown
- [ ] 1.6 Set files array to ["dist"] for npm publishing

## 2. Source Code Migration
- [ ] 2.1 Copy source files from /x/a/a/sv/a/ws/v255 to project src/
- [ ] 2.2 Copy source files from /x/a/a/sv/a/ws/v000 to project src/ (if needed)
- [ ] 2.3 Review and fix any TypeScript errors in migrated files
- [ ] 2.4 Update import paths to reflect new package structure

## 3. Build System
- [ ] 3.1 Test tsdown build locally
- [ ] 3.2 Verify transpiled output in dist/ directory
- [ ] 3.3 Ensure type declarations (.d.ts) are generated
- [ ] 3.4 Add .npmignore or configure files to exclude source from published package

## 4. Validation
- [ ] 4.1 Run build script and verify output
- [ ] 4.2 Test that package can be imported (both .ts in dev and .js after build)
- [ ] 4.3 Verify package.json exports work correctly
- [ ] 4.4 Run dprint to format all files

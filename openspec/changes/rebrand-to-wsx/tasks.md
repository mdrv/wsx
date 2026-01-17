# Implementation Tasks

## 1. Package Configuration

- [x] 1.1 Create package.json with name "@mdrv/wsx"
- [x] 1.2 Configure publishConfig with main, types, and exports pointing to dist/
- [x] 1.3 Set up exports mapping for development (source .ts) and production (dist .js)
- [x] 1.4 Add tsdown to devDependencies
- [x] 1.5 Configure build script using tsdown
- [x] 1.6 Set files array to ["dist"] for npm publishing

## 2. Source Code Migration

- [x] 2.1 Copy source files from /x/a/a/sv/a/ws/v255 to project src/
- [x] 2.2 Copy source files from /x/a/a/sv/a/ws/v000 to project src/ (if needed)
- [x] 2.3 Review and fix any TypeScript errors in migrated files
- [x] 2.4 Update import paths to reflect new package structure

## 3. Build System

- [x] 3.1 Test tsdown build locally
- [x] 3.2 Verify transpiled output in dist/ directory
- [x] 3.3 Ensure type declarations (.d.ts) are generated
- [x] 3.4 Add .npmignore or configure files to exclude source from published package

## 4. Validation

- [x] 4.1 Run build script and verify output
- [x] 4.2 Test that package can be imported (both .ts in dev and .js after build)
- [x] 4.3 Verify package.json exports work correctly
- [x] 4.4 Run dprint to format all files

## 5. GitHub Setup

- [x] 5.1 Initialize Git repository
- [x] 5.2 Create GitHub repository at mdrv/wsx
- [x] 5.3 Configure remote as 'gh' (not 'origin')
- [x] 5.4 Disable issues and wiki
- [x] 5.5 Push initial commit to GitHub

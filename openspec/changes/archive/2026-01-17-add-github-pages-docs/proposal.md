# Change: Add GitHub Pages Documentation with Astro

## Why

The @mdrv/wsx library currently has comprehensive README files and examples in the source code, but lacks a dedicated documentation website. A proper documentation site hosted on GitHub Pages will:

- Provide better discoverability and navigation for API documentation
- Offer searchable, organized content for users
- Present examples and guides in a more accessible format
- Improve developer onboarding experience
- Establish professional presentation for the library

Following the project conventions in AGENTS.md, all Markdown documentation (except README) should be stored in `/docs` directory, and GitHub Pages should use Astro framework.

## What Changes

- Add Astro-based documentation site in `/docs` directory
- Configure GitHub Pages to serve from `/docs` directory
- Create custom minimal theme using Panda CSS (per AGENTS.md conventions)
- Implement search functionality and navigation sidebar
- Structure documentation into sections:
  - Getting Started
  - API Reference (Client, Server, Shared)
  - Usage Guides
  - Examples (Ping-pong, Chat, Auth)
  - Migration Guide
- Configure Astro build for static site generation
- Add package.json scripts following project conventions (d, b, p)

## Impact

- Affected specs: `documentation` (new capability)
- Affected code:
  - New `/docs` directory with Astro project
  - New documentation content derived from src/README.md and src/SUMMARY.md
  - GitHub repository settings (Pages configuration)
  - New build scripts in package.json for docs

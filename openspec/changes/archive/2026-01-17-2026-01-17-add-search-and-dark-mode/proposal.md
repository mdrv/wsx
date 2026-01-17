# Change: Add Pagefind Search and Dark Mode to Documentation Site

## Why

The @mdrv/wsx documentation site (added in v1.1.0) provides comprehensive documentation but lacks two important user experience features:

- **Search functionality** - Users cannot quickly find specific topics across documentation pages, requiring manual navigation through all pages
- **Dark mode** - Users have no option to switch to a dark theme, which is important for accessibility and user preference, especially for developers who often work in dark environments
- **Mobile navigation issues** - The hamburger menu doesn't close when clicking navigation links, and visibility wasn't guaranteed across all pages

These missing features reduce the usability and accessibility of the documentation site.

## What Changes

### Pagefind Search Integration

- Install Pagefind v1.4.0 as development dependency
- Update build script to run `pagefind --site dist` after Astro build
- Add Pagefind UI component to main content area in DocsLayout
- Configure Pagefind with sensible defaults (show sub-results, excerpt length)
- Index all 13 documentation pages automatically on build

### Dark Mode Implementation

- Add theme toggle button in header with sun/moon icons
- Implement theme persistence using localStorage
- Create CSS custom properties system for theming:
  - Background colors: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
  - Text colors: `--text-primary`, `--text-secondary`, `--text-tertiary`
  - Other: `--border-color`, `--code-bg`, `--overlay-bg`
- Update all components with dark mode support:
  - Header (toggle button + theming)
  - Footer (color variables)
  - Navigation (link colors)
  - DocsLayout (content styling)
- Prevent flash of unstyled content with inline theme initialization script
- Add dark mode styles for Pagefind search UI

### Mobile Menu Improvements

- Ensure hamburger button visibility on all pages
- Add auto-close functionality when clicking navigation links
- Improve mobile menu accessibility and user experience

## Impact

- Affected specs: `documentation` (enhanced capabilities)
- Affected files:
  - `docs/package.json` - Added Pagefind dependency, updated build script
  - `docs/bun.lock` - Updated lockfile
  - `docs/src/components/Header.astro` - Dark mode toggle, improved mobile button
  - `docs/src/components/Footer.astro` - Dark mode theming
  - `docs/src/components/Navigation.astro` - Dark mode theming
  - `docs/src/layouts/DocsLayout.astro` - Search UI, dark mode system, mobile fixes
- Build output: Pagefind generates indexed search data in `dist/pagefind/`
- User experience: Significantly improved with search and theme customization
- No breaking changes to existing documentation content or structure

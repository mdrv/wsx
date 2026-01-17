# documentation Specification

## Purpose

Provide comprehensive, searchable, and accessible documentation for the @mdrv/wsx library through a GitHub Pages-hosted Astro site with search functionality and theme customization.

## MODIFIED Requirements

### Requirement: Documentation Site Hosting

The project SHALL host comprehensive documentation on GitHub Pages using Astro framework in the `/docs` directory.

#### Scenario: Documentation site is accessible

- **WHEN** a user navigates to the GitHub Pages URL
- **THEN** the documentation site SHALL load successfully
- **AND** the site SHALL be served from the `/docs` directory on the main branch

#### Scenario: Documentation builds successfully

- **WHEN** the build command is executed in the docs directory
- **THEN** Astro SHALL generate a static site
- **AND** all pages SHALL be rendered without errors
- **AND** the output SHALL be placed in `/docs/dist`
- **AND** Pagefind search indexing SHALL run after build

### Requirement: Search Functionality

The documentation site SHALL provide search functionality powered by Pagefind to help users find content quickly.

#### Scenario: Search is available

- **WHEN** a user visits the documentation site
- **THEN** a search input SHALL be visible at the top of the content area
- **AND** the search SHALL be powered by Pagefind static indexing

#### Scenario: Search returns relevant results

- **WHEN** a user enters a search query
- **THEN** matching pages SHALL be returned with excerpts
- **AND** results SHALL highlight matched content
- **AND** search SHALL work without requiring a backend service
- **AND** all 13 documentation pages SHALL be indexed

#### Scenario: Search indexes on build

- **WHEN** the build command `bun run b` is executed
- **THEN** Astro SHALL build the site first
- **AND** Pagefind SHALL index all HTML pages
- **AND** search index SHALL be output to `dist/pagefind/`

### Requirement: Build Scripts Convention

The documentation project SHALL follow package.json script conventions: d (dev), b (build), p (preview).

#### Scenario: Development server runs

- **WHEN** the command `bun run d` is executed in docs directory
- **THEN** Astro dev server SHALL start
- **AND** the site SHALL be accessible on localhost
- **AND** changes SHALL hot-reload

#### Scenario: Production build succeeds

- **WHEN** the command `bun run b` is executed
- **THEN** Astro SHALL build the site for production
- **AND** Pagefind SHALL index the built pages
- **AND** optimized assets SHALL be output to dist directory
- **AND** search index SHALL be generated in dist/pagefind

#### Scenario: Preview works locally

- **WHEN** the command `bun run p` is executed after build
- **THEN** a local server SHALL serve the built site
- **AND** the site SHALL match production behavior

### Requirement: Responsive Design

The documentation site SHALL be fully responsive and accessible on all device sizes.

#### Scenario: Mobile navigation works

- **WHEN** a user visits the site on a mobile device (< 768px)
- **THEN** navigation SHALL be accessible via a hamburger menu button
- **AND** clicking the button SHALL open a slide-in sidebar
- **AND** clicking a navigation link SHALL close the mobile menu
- **AND** clicking the overlay SHALL close the mobile menu
- **AND** content SHALL be readable without horizontal scrolling
- **AND** touch interactions SHALL work properly

#### Scenario: Hamburger button is always visible on mobile

- **WHEN** a user views any page on mobile
- **THEN** the hamburger menu button SHALL be visible in the header
- **AND** the button SHALL be accessible and functional

#### Scenario: Accessibility standards met

- **WHEN** the site is evaluated for accessibility
- **THEN** semantic HTML SHALL be used throughout
- **AND** ARIA labels SHALL be present where needed
- **AND** keyboard navigation SHALL work for all interactive elements

## ADDED Requirements

### Requirement: Dark Mode Support

The documentation site SHALL provide a dark mode option with theme persistence for improved accessibility and user preference.

#### Scenario: Theme toggle is available

- **WHEN** a user visits the documentation site
- **THEN** a theme toggle button SHALL be visible in the header
- **AND** the button SHALL display appropriate icon (sun/moon)
- **AND** clicking the button SHALL switch between light and dark themes

#### Scenario: Theme persists across sessions

- **WHEN** a user selects a theme preference
- **THEN** the preference SHALL be saved to localStorage
- **AND** the preference SHALL be restored on subsequent visits
- **AND** no flash of unstyled content SHALL occur on page load

#### Scenario: Dark mode styles all components

- **WHEN** dark mode is enabled
- **THEN** all components SHALL use dark mode color scheme
- **AND** CSS custom properties SHALL define theme colors
- **AND** the following variables SHALL be defined:
  - `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
  - `--text-primary`, `--text-secondary`, `--text-tertiary`
  - `--border-color`, `--code-bg`, `--overlay-bg`
- **AND** Pagefind search UI SHALL be styled for dark mode

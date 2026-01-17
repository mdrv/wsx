# Design: GitHub Pages Documentation Site

## Context

The @mdrv/wsx library needs comprehensive, searchable documentation hosted on GitHub Pages. The source code already contains excellent README files and working examples, but these need to be transformed into a navigable website.

Constraints:

- Must use Astro framework (per AGENTS.md)
- Documentation lives in `/docs` directory (per AGENTS.md)
- Must use Panda CSS for styling (per AGENTS.md)
- Package scripts follow conventions: d/b/s/p (per AGENTS.md)
- GitHub Pages serves from `/docs` on main branch

## Goals / Non-Goals

**Goals:**

- Create searchable documentation site with intuitive navigation
- Convert existing README/SUMMARY content into web-friendly format
- Provide clear API reference with TypeScript examples
- Include all three working examples with explanations
- Custom minimal theme that's fast and accessible
- Zero-config deployment via GitHub Pages

**Non-Goals:**

- Interactive playground (can be added later)
- Multi-version documentation (v1.0.0 only for now)
- Complex build pipeline or hosting setup
- Theming customization UI

## Decisions

### 1. Astro + Panda CSS Stack

**Decision:** Use Astro for static site generation with Panda CSS for styling.

**Rationale:**

- Astro is fast, generates pure HTML/CSS/JS
- Excellent Markdown support with MDX
- Panda CSS provides type-safe styling per project conventions
- Both tools align with modern, minimal approach

**Alternatives considered:**

- Starlight: Full-featured but goes against "custom minimal theme" requirement
- Docusaurus/VitePress: React/Vue-based, heavier than needed

### 2. Documentation Structure

**Decision:** Organize docs into clear sections with flat navigation.

```
docs/
├── src/
│   ├── pages/
│   │   ├── index.mdx              # Landing page
│   │   ├── getting-started.mdx    # Quick start
│   │   ├── api/
│   │   │   ├── client.mdx         # Client API
│   │   │   ├── server.mdx         # Server API
│   │   │   └── shared.mdx         # Shared utilities
│   │   ├── guides/
│   │   │   ├── events.mdx         # Defining events
│   │   │   ├── validation.mdx     # Zod validation
│   │   │   └── reconnection.mdx   # Auto-reconnection
│   │   ├── examples/
│   │   │   ├── ping-pong.mdx
│   │   │   ├── chat.mdx
│   │   │   └── auth.mdx
│   │   └── migration.mdx          # v000 → v001
│   ├── components/
│   │   ├── Navigation.astro       # Sidebar nav
│   │   ├── Search.astro           # Search component
│   │   └── CodeBlock.astro        # Syntax highlighted code
│   └── layouts/
│       └── DocsLayout.astro       # Main layout
├── astro.config.mjs
├── panda.config.ts
├── package.json
└── tsconfig.json
```

**Rationale:**

- Clear content hierarchy
- Easy to navigate and maintain
- Matches user mental model (API → Guides → Examples)

### 3. Search Implementation

**Decision:** Use Pagefind for static search (no runtime dependencies).

**Rationale:**

- Generates search index at build time
- No backend required
- Fast, works offline
- Perfect for GitHub Pages

**Alternatives considered:**

- Algolia: Overkill, requires account setup
- Lunr.js: Runtime indexing, slower

### 4. Build Output Location

**Decision:** Configure Astro to build to `/docs/dist` with base path handling.

**Rationale:**

- GitHub Pages can serve from `/docs` root or `/docs/dist`
- Keeping built assets in `/docs/dist` separates source from output
- Gitignore `/docs/dist`, GitHub Actions can build on deploy

**Alternatives:**

- Build to project root `/dist`: Conflicts with package dist
- Build in-place: Mixes source and built files

## Risks / Trade-offs

**Risk:** Panda CSS learning curve
**Mitigation:** Use simple utility classes, document patterns in code

**Risk:** Search indexing on large docs
**Mitigation:** Pagefind is fast, scales well to thousands of pages

**Trade-off:** Custom theme vs. Starlight
**Pro:** Full control, minimal bundle, follows project conventions
**Con:** More initial setup work

## Migration Plan

1. Initialize Astro project in `/docs`
2. Install and configure Panda CSS
3. Convert existing README content to MDX
4. Build navigation and layout components
5. Add search functionality
6. Configure GitHub Pages
7. Test locally and on GitHub Pages
8. Update main README to link to docs site

**Rollback:** If docs site has issues, remove `/docs` directory and revert README links.

## Open Questions

- Should we auto-generate API docs from TypeScript source? (Probably not needed for v1, manual is fine)
- Include interactive examples? (Defer to future enhancement)

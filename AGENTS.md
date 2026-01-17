<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

- Always ask questions when in need of clarity even in the middle of session (unless author explicitly stated not to ask questions).
- Must always check NPM registry for the latest version of every package.
- Must not build the project nor commit to Git without developer consent.
- Must use latest Panda CSS for complex styling. (guide: https://panda-css.com/docs/docs/installation/svelte)
- Else, must prefer inline styling (right on HTML tags) in Svelte components.
- Must utilize Bun and TypeScript on every possible area of code.
- At the end of agent session, use dprint to format all files in repo.
- All Markdown files (except README) that explains the project must be stored on `/docs` directory.
- Must always utilize GitHub pages using Astro that lives on `/docs` directory.
- On package.json scripts:
  - `b` → `build`
  - `d` → `dev`
  - `s` → `start`
  - `p` → `preview`

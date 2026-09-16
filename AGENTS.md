# TuneForge

TuneForge is a desktop-first music library and playlist management application.

## Tech Stack

- Vue 3
- Nuxt 3
- TypeScript
- Pinia
- Tailwind CSS
- Tauri 2
- SQLite
- Drizzle ORM

## Development Rules

- Use Vue 3 Composition API.
- Use `<script setup lang="ts">`.
- Prefer TypeScript over JavaScript.
- Keep components small and focused.
- Do not add new dependencies unless they are necessary.
- Do not change the project architecture without explaining why.
- Do not commit secrets, API keys, tokens, or `.env` files.

## Architecture

TuneForge should separate the UI from music-related business logic.

The UI must not directly handle:

- filesystem operations
- USB device operations
- music service integrations

Music-related logic should eventually live in a separate Music Core.

## Git

Make small, focused changes.

Before making large changes:
1. Explain what you intend to change.
2. Inspect the existing implementation.
3. Preserve existing functionality unless the task explicitly requires changing it.

## Communication

- Always communicate with the user in Russian.
- Explain plans, decisions, warnings, and results in Russian.
- Keep code, variable names, function names, file names, Git commit messages, and technical identifiers in English.
- Code comments should be in English unless explicitly requested otherwise.
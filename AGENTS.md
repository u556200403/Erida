# Erida

Erida is a desktop-first music library and playlist management application.

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

Erida should separate the UI from music-related business logic.

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

## Project knowledge

Project documentation is stored in:

docs/obsidian/

Before implementing a feature, read:

- docs/obsidian/00 - Project/Erida.md
- docs/obsidian/03 - Development/Current State.md
- docs/obsidian/03 - Development/Next Steps.md

Read relevant architecture and feature notes when necessary.

After completing a meaningful development task:

1. Update Current State.md.
2. Update the corresponding feature note.
3. Record important architectural decisions as an ADR.
4. Update Next Steps.md if development priorities changed.

Do not change documented architectural decisions silently.
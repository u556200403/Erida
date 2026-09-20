---
name: project-docs-sync
description: Synchronize project documentation with the actual repository state after completed development work.
---

# Project Documentation Sync
Synchronize project documentation with the actual state of the repository.

## Source of truth

Treat the current codebase and Git history as the source of truth.

Existing documentation may be outdated. Never mark functionality as implemented only because it is mentioned in documentation, an issue, commit message, or plan.

## Workflow

1. Read `AGENTS.md` and relevant project documentation.
2. Inspect the current Git state, recent commits, and changes relevant to the completed work.
3. Inspect the affected implementation and tests when necessary to verify the actual behavior.
4. Compare the verified repository state with the documentation.
5. Update only documentation that is actually outdated.
6. Review the resulting diff for accuracy and unnecessary changes.
7. Report what was updated and why.
8. Suggest an appropriate Conventional Commit message.

## Documentation scope

For this repository, consider:

- `docs/obsidian/Development/Current State.md`
- `docs/obsidian/Development/Next Steps.md`
- `docs/obsidian/Project/Roadmap.md`
- relevant files under `docs/obsidian/Architecture/`

Update `Roadmap.md` only when the status, scope, or ordering of roadmap work has actually changed.

Update architecture documentation only when an architectural decision or documented architecture has actually changed.


## Validation

- Always run `git diff --check` after documentation changes.
- Do not run the full application test suite for documentation-only changes unless the documentation update depends on behavior that cannot be verified from the repository state.
- Prefer existing CI results, tests, implementation, and Git history as evidence of completed work.

## Constraints

- Do not modify source code, tests, dependencies, or project configuration.
- Do not invent implementation details.
- Do not mark planned work as completed without evidence in the repository.
- Do not rewrite or reformat unrelated documentation.
- Preserve the existing documentation structure and terminology.
- Prefer small, focused documentation diffs.
- If the documentation is already accurate, make no changes and report that no synchronization is required.

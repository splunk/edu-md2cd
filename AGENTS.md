# AGENTS.md

## Tech Stack & Patterns
- Always use Node.js and JavaScript (ES modules).
- Always follow the pipeline and plugin architecture patterns.
- Always build core functionality into `src/utils` (Service-like API).
- Always import `utils` into pipeline stages; never duplicate logic.
- Never build core functionality directly into stages.
- Never add new stages unless explicitly instructed.

## Strict Coding Standards
- Always use descriptive, camelCase for variables and functions.
- Always use PascalCase for classes and constructor functions.
- Always validate all inputs and handle errors gracefully.
- Always propagate errors via context or explicit error objects.
- Always document all exported functions and classes.
- Never use magic values; always define constants.
- Never use synchronous file system operations in pipeline logic.
- Never use global variables or mutable shared state.
- Never use deprecated Node.js APIs or legacy syntax.
- Never commit code with lint or formatting errors.

## Governance & Reviews
- Always make changes modular and isolated.
- Always document all changes in pull requests.
- Always require Code Owner approval for all merges.
- Never merge without a clear description and rationale.
- Never bypass review or CI checks.

## Testing Requirements
- Always add or update unit tests for every code change.
- Always place tests in the `tests/` directory, mirroring source structure.
- Always use fixtures for input/output scenarios.
- Never suggest code without corresponding tests.
- Never leave tests failing; all tests must pass before merging.

## Project Structure
- Always place core logic in `src/utils/`.
- Always place pipeline stages in `src/stages/`.
- Always place entry points in `src/`.
- Always place plugins in `plugins/`.
- Always place schemas in `schemas/`.
- Always place themes in `themes/`.
- Always place tests in `tests/`, mirroring the source structure.
- Never place business logic in stages or plugins.
- Never place tests outside the `tests/` directory.
- Never place configuration files outside `.github/` or root.

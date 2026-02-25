# Workflow Index

Use these slash commands to trigger automated workflows efficiently.

## Core Workflows
- **`/pre`**: Load initial context (Changelog, Schema, Current Tasks). 
- **`/post`**: End-of-session cleanup (Code Review, Changelog Update, Task Rotation).

## Manual Workflows
- **`/changelog`**: Manual trigger for changelog update and rotation.
- **`/archive`**: Archive completed tasks to historical folders.
- **`/docs`**: Update user documentation based on recent changes.

## Best Practices
- **Turbo Mode**: Workflows with `// turbo-all` will be executed automatically without confirmation for terminal steps.
- **Context Awareness**: Use `/pre` at the start of every turn to ensure the latest state is loaded.

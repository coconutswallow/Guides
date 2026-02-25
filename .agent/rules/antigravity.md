---
trigger: always_on
---

---
description: High-level agent instructions
---
# Mandatory Pre-flight Check
At the beginning of every interaction, execute:
1. **`/pre`** (`.agent/workflows/pre/load-context.md`): Load Changelog, Schema, and Tasks.

# Mandatory Post-flight Checks
After completion of tasks, execute:
1. **`/post`** (`.agent/workflows/post/finalize.md`): Review code, update changelog/rotation.
2. If terminal errors occurred, update `./agent/rules/terminal-commands.md`.


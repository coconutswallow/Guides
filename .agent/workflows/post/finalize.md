---
description: Combined Post-Task Finalization (Review + Changelog)
---

# Session Finalization Checklist

Execute these steps in order to close the task:

## 1. Code Review
- [ ] Compliance check against `.agent/rules/code-instructions.md`.
- [ ] Check for security & performance (loops, database joins).
- [ ] Verify error handling uses `assets/js/error-logger.js`.

## 2. Changelog & Rotation
- [ ] **Prepend** new entry to the **TOP** of `.context/changelog.md` (just below the header).
- [ ] **Rotate**: If entries > 10, move the bottom one to `.context/archive/changelog-YYYY-MM.md`.
- [ ] Update `.context/database-schema.md` if table structure changed.
- [ ] Update `.context/directory.md` if new folders were created.

## 3. Cleanup
- [ ] Delete temporary debug scripts or migrations.
- [ ] Update `/.context/current-tasks/` status.

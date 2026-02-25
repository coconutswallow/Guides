---
description: Archive completed task documentation when switching focus areas
---

# Archive Completed Task Documentation

This workflow helps clean up `Context/current-tasks/` by moving completed documentation to archives.

## When to Run
- When user says "we're done with [feature]" or "moving to [new feature]"
- When user explicitly requests: "archive the current tasks"
- When `current-tasks/` has more than 2-3 files

## Steps

1. **Identify completed tasks**
   - Ask user which feature area is complete (e.g., "print-system")
   - OR detect from context if user is switching focus areas

2. **Create archive subdirectory**
   - Create `.Context/archive/[feature-name]/` if it doesn't exist

3. **Move completed documentation**
   - Move all related files from `current-tasks/` to the archive
   - Preserve filenames and structure

4. **Update Context/README.md**
   - Update the "Current Focus Area" section
   - Add archived feature to the "Archive" section

5. **Report**
   - Confirm what was archived
   - Show what remains in `/.Context/current-tasks/`

## Safety
- Always ask for confirmation before moving files
- Never delete files, only move to archive
- Keep a clear audit trail of what was moved
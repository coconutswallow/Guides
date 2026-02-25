---
description: Changelog Entry Format & Rotation
---

# Changelog Standards

## Entry Format
> **Note**: Always **PREPEND** new entries to the **TOP** of the file.

```markdown
## YYYY-MM-DD HH:MM (PST)
**System:** [Affected Area]
**Changes:**
- **Feature**: High-level description
- **Database**: Schema changes
- **Fix**: Critical remedies
```

## Rotation Rules
- Keep max **10 entries** in `.Context/changelog.md`.
- Move excess to `.Context/archive/changelog-YYYY-MM.md`.
- Preserve the top metadata block in the main file.
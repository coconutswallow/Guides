---
trigger: always_on
description: Code instructions for development standards and practices
---

When developing code for this project, follow these standards to ensure maintainability and clarity:

1. **Documentation**:
   - Use comprehensive documentation to facilitate debugging by both humans and AI agents.
   - Every file MUST include a JSDoc header describing its purpose and contents.
   - Functions and complex logic blocks should have JSDoc comments explaining parameters, return values, and behavior.

2. **Modularization**:
   - Files should not exceed 1000 lines of code.
   - If a file approaches or exceeds this limit, suggest and implement ways to modularize the code into smaller, logical components.

3. **Styling and CSS**:
   - Always refer to the global design system in `/assets/css/style.css` (or `style.css`) for core colors and styles before adding new ones.
   - Use project-specific CSS files (e.g., in `/assets/css/`) rather than internal `<style>` blocks.
   - Minimize inline style formatting within HTML/JS code.

4. **Data and Constants**:
   - Minimize hard-coding values.
   - Store shared constants in a dedicated `constants.js` or state manager module.
   - For values that may change or need to be persistent across sessions, use Supabase for storage.

5.  **Context Update**:
   - If any of the context files are not up-to-date after your edits (e.g. a new file is created, or a new table is created), update the context file at the very end, following the existing structure.

6. **Automated Testing**:
   - For every new feature, component, or complex logic block created, you SHOULD generate a corresponding `.test.js` or `.test.jsx` file in `test/`.
   - The test should explicitly verify the requirements specified in the user's code prompt.
   - Follow the standards defined for Vitest in the project root.

7. **Terminal commands**:
   - If terminal commands are required, remember that this is run on a Windows PC. Use the appropriate commands given this context.  If there are errors, update the corrected instructions in /.agent/rules/terminal-commands.md

8. **SQL update commands**:
   - for database migrations, generate the SQL script, but ask me to run them manually and save the scripts to /migrations.  once complete, I have move the script manually to /archives/migrations/
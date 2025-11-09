---
layout: doc
title: "Markdown Author's Guide"
order: 2
---

# Markdown Author's Guide for Non-Technical Writers

Welcome! This guide will teach you everything you need to know to write beautiful documentation for the Hawthorne Guild Guide. Don't worry if you've never used Markdown before - it's easier than you think!

## What is Markdown?

Markdown is a simple way to format text using plain characters like `#`, `*`, and `-`. You write in plain text, and the website automatically converts it to beautiful, formatted pages.

**Think of it like this:** Instead of clicking buttons in Microsoft Word, you type special characters that tell the website how to format your text.

---

## Getting Started: The Front Matter

Every document needs to start with "front matter" - a small block at the very top that tells the website about your page:

```yaml
---
layout: doc
title: "Your Page Title Here"
order: 10
---
```

**What each part means:**
- `layout: doc` - Always use this (tells the site to format it as a documentation page)
- `title:` - The title that appears at the top of the page and in the menu
- `order:` - A number that determines where it appears in the menu (lower numbers = higher up)

**Tips:**
- Use order numbers like 10, 20, 30 so you can easily add pages in between later
- Always put your title in quotes if it contains special characters
- Don't forget the three dashes (`---`) at the start and end!

---

## Headings

Headings create section titles in your document. Use the `#` symbol:

**Syntax:**
```markdown
# Heading 1 (Largest)
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6 (Smallest)
```

**How it looks:**
- Heading 1 appears in ALL CAPS, burgundy color, very large
- Heading 2 has a bottom border line underneath it
- Heading 3 is also in ALL CAPS but smaller
- Heading 4, 5, 6 get progressively smaller

**Best Practices:**
- Use Heading 1 (`#`) only once at the top of your page (usually your title)
- Use Heading 2 (`##`) for main sections
- Use Heading 3 (`###`) for subsections
- Don't skip levels (don't go from `##` to `####`)

---

## Paragraphs and Line Breaks

Just write normally! Press Enter twice to create a new paragraph.

**Syntax:**
```markdown
This is the first paragraph. It has several sentences.

This is the second paragraph. Notice the blank line between them.
```

**How it looks:**

This is the first paragraph. It has several sentences.

This is the second paragraph. Notice the blank line between them.

---

## Text Formatting

### Bold Text

**Syntax:**
```markdown
**This text is bold**
```

**How it looks:** **This text is bold** (appears darker and thicker)

**When to use:** To emphasize important terms, rules, or key concepts.

### Italic Text

**Syntax:**
```markdown
*This text is italic*
```

**How it looks:** *This text is italic* (appears slanted)

**When to use:** For emphasis, book titles, or to highlight something subtly.

### Bold AND Italic

**Syntax:**
```markdown
***This text is bold and italic***
```

**How it looks:** ***This text is bold and italic***

---

## Lists

### Bulleted Lists (Unordered)

**Syntax:**
```markdown
- First item
- Second item
- Third item
  - Nested item (add 2 spaces before the dash)
  - Another nested item
- Fourth item
```

**How it looks:**
- First item
- Second item
- Third item
  - Nested item
  - Another nested item
- Fourth item

**Tips:**
- Use a dash (`-`), asterisk (`*`), or plus (`+`) - they all work!
- Add 2 spaces before a dash to create a sub-item

### Numbered Lists (Ordered)

**Syntax:**
```markdown
1. First step
2. Second step
3. Third step
   1. Sub-step (add 3 spaces before the number)
   2. Another sub-step
4. Fourth step
```

**How it looks:**
1. First step
2. Second step
3. Third step
   1. Sub-step
   2. Another sub-step
4. Fourth step

**Tips:**
- The actual numbers don't matter - Markdown will number them correctly automatically
- You can write `1. 1. 1. 1.` and it will display as `1. 2. 3. 4.`

---

## Links

**Syntax:**
```markdown
[Text people click on](https://example.com)
```

**Example:**
```markdown
Check out the [D&D Beyond website](https://www.dndbeyond.com) for more info.
```

**How it looks:** Check out the [D&D Beyond website](https://www.dndbeyond.com) for more info.

**For internal links (other pages on our site):**
```markdown
See the [Server Rules](/Guides/rules/server-rules.html) for more information.
```

**Tips:**
- The text in square brackets `[]` is what people see
- The URL in parentheses `()` is where they go when they click
- Links appear in rust color and get underlined when you hover

---

## Tables

Tables are great for organizing information like stats, schedules, or rules.

**Syntax:**
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
| Data 7   | Data 8   | Data 9   |
```

**How it looks:**

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
| Data 7   | Data 8   | Data 9   |

**Tips:**
- The pipes (`|`) separate columns
- The dashes (`---`) in the second row separate the header from the content
- The table automatically gets burgundy headers and alternating row colors
- Rows change color when you hover over them
- Don't worry about making the pipes line up perfectly - it still works!

**Alignment in tables:**
```markdown
| Left-aligned | Center-aligned | Right-aligned |
|:-------------|:--------------:|--------------:|
| Text         | Text           | Text          |
```

- `:---` = left-aligned
- `:---:` = center-aligned  
- `---:` = right-aligned

---

## Blockquotes

Blockquotes are perfect for highlighting important information, rules, or quotes.

**Syntax:**
```markdown
> This is a blockquote.
> It can span multiple lines.
> 
> It can even have multiple paragraphs!
```

**How it looks:**
> This is a blockquote.
> It can span multiple lines.
> 
> It can even have multiple paragraphs!

**Styling:** Blockquotes appear with a burgundy left border, italic text, and are slightly indented.

**When to use:** DM notes, important warnings, actual quotes from NPCs or lore books.

---

## Code and Technical Text

### Inline Code

For small snippets like commands or technical terms.

**Syntax:**
```markdown
Use the `!quest` command to see your active quests.
```

**How it looks:** Use the `!quest` command to see your active quests.

**Styling:** Code appears in a monospace font with a light tan background.

### Code Blocks

For longer code or formatted text you want to preserve exactly as written.

**Syntax:**
````markdown
```
This is a code block.
Everything here keeps its exact formatting.
Even    weird     spacing!
```
````

**How it looks:**
```
This is a code block.
Everything here keeps its exact formatting.
Even    weird     spacing!
```

---

## Horizontal Rules (Dividers)

Create a visual break between sections with a horizontal line.

**Syntax:**
```markdown
---
```

or

```markdown
***
```

**How it looks:** A tan/gray line that spans the width of the page (see the dividers throughout this document!)

**When to use:** To separate major sections or topics.

---

## Images

**Syntax:**
```markdown
![Alt text describing the image](path/to/image.jpg)
```

**Example:**
```markdown
![Map of the Sword Coast](/assets/images/sword-coast-map.jpg)
```

**Tips:**
- The text in square brackets `[]` is the "alt text" - describes the image for screen readers
- Images automatically get rounded corners and a subtle shadow
- Images scale to fit the page width on mobile devices

---

## Special Notices and Alerts

You can create colored alert boxes using HTML (don't worry, it's simple!):

**Info Box (Blue):**
```html
<div class="alert-info">
📘 <strong>Note:</strong> This is helpful information for players.
</div>
```

**Warning Box (Yellow):**
```html
<div class="alert-warning">
⚠️ <strong>Warning:</strong> This rule is strictly enforced!
</div>
```

**Danger Box (Red):**
```html
<div class="alert-danger">
🚫 <strong>Important:</strong> Breaking this rule may result in a ban.
</div>
```

**Success Box (Green):**
```html
<div class="alert-success">
✅ <strong>Tip:</strong> This is a great strategy for new players!
</div>
```

---

## Server Role Colors

When mentioning Discord roles, you can use special CSS classes to color them correctly:

**Syntax:**
```html
<span class="role-adventurer">Adventurer</span>
<span class="role-trial-dm">Trial DM</span>
<span class="role-full-dm">Full DM</span>
<span class="role-auditor">Auditor</span>
<span class="role-lore">Lore Team</span>
<span class="role-rules">Rules Team</span>
<span class="role-engineer">Engineer</span>
<span class="role-admins">Admins</span>
```

**How it looks:**
- <span style="color: #999999; font-weight: 600;">Adventurer</span> (gray)
- <span style="color: #25c059; font-weight: 600;">Trial DM</span> (light green)
- <span style="color: #1a7939; font-weight: 600;">Full DM</span> (dark green)
- <span style="color: #ff9900; font-weight: 600; background: #333; padding: 2px 4px; border-radius: 3px;">Auditor</span> (orange with dark background)
- <span style="color: #1f628e; font-weight: 600; background: #333; padding: 2px 4px; border-radius: 3px;">Lore Team</span> (blue)
- <span style="color: #f975f2; font-weight: 600; background: #333; padding: 2px 4px; border-radius: 3px;">Rules Team</span> (pink)
- <span style="color: #1abc9c; font-weight: 700; background: #333; padding: 2px 4px; border-radius: 3px;">Engineer</span> (teal)

---

## Combining Elements

You can mix and match different formatting! Here's an example:

**Syntax:**
```markdown
## Character Creation Rules

When creating a character, follow these steps:

1. **Choose Your Race** - Select from the PHB races
2. **Choose Your Class** - Pick one of these options:
   - Fighter
   - Wizard
   - Rogue
3. **Roll Stats** - Use the `!stats` command

> **Important:** All characters must be approved by a <span class="role-full-dm">Full DM</span> before play.

See the [Character Creation Guide](/Guides/players-guide/character-creation/) for details.
```

**How it looks:**

## Character Creation Rules

When creating a character, follow these steps:

1. **Choose Your Race** - Select from the PHB races
2. **Choose Your Class** - Pick one of these options:
   - Fighter
   - Wizard
   - Rogue
3. **Roll Stats** - Use the `!stats` command

> **Important:** All characters must be approved by a Full DM before play.

See the Character Creation Guide for details.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting Blank Lines
```markdown
## Heading
This paragraph won't format correctly!
```

### ✅ Correct:
```markdown
## Heading

This paragraph will format correctly!
```

---

### ❌ Mistake 2: Not Using Enough #
```markdown
Heading 2
This won't create a heading!
```

### ✅ Correct:
```markdown
## Heading 2

Now it's a proper heading!
```

---

### ❌ Mistake 3: Broken Links
```markdown
[Click here](broken link)
```

### ✅ Correct:
```markdown
[Click here](https://www.example.com)
```

---

## Quick Reference Cheat Sheet

| What You Want | Syntax | Example |
|---------------|--------|---------|
| Heading | `## Heading Text` | ## Heading Text |
| Bold | `**bold**` | **bold** |
| Italic | `*italic*` | *italic* |
| Link | `[text](url)` | [Google](https://google.com) |
| Bullet List | `- item` | • item |
| Numbered List | `1. item` | 1. item |
| Code | `` `code` `` | `code` |
| Quote | `> quote` | Indented italic text |
| Horizontal Rule | `---` | ─────────── |

---

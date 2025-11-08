#!/usr/bin/env python3
"""
Monster Markdown Formatter
Processes monster markdown files to:
1. Add title with ## if it doesn't exist in the description section
2. Remove leading spaces in the description section
"""

import re
from pathlib import Path


def process_monster_file(filepath):
    """Process a single monster markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split content into front matter, description, and stat block
    parts = content.split('---')
    
    if len(parts) < 3:
        print(f"Warning: {filepath} doesn't have proper front matter structure")
        return False
    
    front_matter = parts[1]
    rest_of_content = '---'.join(parts[2:])
    
    # Extract title from front matter
    title_match = re.search(r'^title:\s*(.+)$', front_matter, re.MULTILINE)
    if not title_match:
        print(f"Warning: No title found in front matter of {filepath}")
        return False
    
    title = title_match.group(1).strip()
    
    # Find where the stat block starts (the block quote with ___\n> ##)
    stat_block_pattern = r'(___\s*\n\s*>\s*##)'
    stat_block_match = re.search(stat_block_pattern, rest_of_content)
    
    if not stat_block_match:
        print(f"Warning: No stat block found in {filepath}")
        return False
    
    # Split description and stat block
    description = rest_of_content[:stat_block_match.start()]
    stat_block = rest_of_content[stat_block_match.start():]
    
    # Process description section
    # 1. Remove leading/trailing whitespace
    description = description.strip()
    
    # 2. Remove leading spaces from each line
    description_lines = description.split('\n')
    description_lines = [line.lstrip() for line in description_lines]
    description = '\n'.join(description_lines)
    
    # 3. Check if title exists as ## heading
    title_heading = f"## {title}"
    if not description.startswith(title_heading):
        # Add title at the beginning
        description = f"{title_heading}\n\n{description}"
    
    # Reconstruct the file
    new_content = f"---{front_matter}---\n\n{description}\n\n{stat_block}"
    
    # Write back to file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✓ Processed: {filepath}")
    return True


def main():
    # Get the monsters directory (one level up from tools)
    monsters_dir = Path(__file__).parent.parent / '_monsters'
    
    if not monsters_dir.exists():
        print(f"Error: Directory not found: {monsters_dir}")
        return
    
    # Process all markdown files in the _monsters directory
    markdown_files = list(monsters_dir.glob('*.md'))
    
    if not markdown_files:
        print(f"No markdown files found in {monsters_dir}")
        return
    
    print(f"Found {len(markdown_files)} markdown file(s) to process\n")
    
    processed = 0
    for md_file in markdown_files:
        if process_monster_file(md_file):
            processed += 1
    
    print(f"\nProcessed {processed} out of {len(markdown_files)} files")


if __name__ == '__main__':
    main()
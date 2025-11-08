#!/usr/bin/env python3
"""
Move 'description' field from YAML front matter to markdown body.
This avoids YAML parsing issues with special characters and long text.
"""

import re
from pathlib import Path

def extract_frontmatter_and_body(content):
    """Split content into front matter and body."""
    pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
    match = re.match(pattern, content, re.DOTALL)
    
    if not match:
        return None, None, content
    
    return match.group(1), match.group(2), content

def parse_yaml_simple(yaml_content):
    """Simple YAML parser that handles multiline fields."""
    lines = yaml_content.split('\n')
    fields = {}
    current_key = None
    current_value = []
    
    for line in lines:
        # Check if this is a new key-value pair
        if ':' in line and not line.startswith(' ') and not line.startswith('\t'):
            # Save previous field if exists
            if current_key:
                fields[current_key] = '\n'.join(current_value).strip()
            
            # Parse new field
            parts = line.split(':', 1)
            current_key = parts[0].strip()
            value = parts[1].strip() if len(parts) > 1 else ''
            
            # Handle multiline field starting with |
            if value == '|':
                current_value = []
            else:
                current_value = [value] if value else []
        elif current_key:
            # Continuation of multiline value
            current_value.append(line)
    
    # Save last field
    if current_key:
        fields[current_key] = '\n'.join(current_value).strip()
    
    return fields

def rebuild_yaml(fields, exclude_keys=None):
    """Rebuild YAML front matter from fields dict."""
    if exclude_keys is None:
        exclude_keys = set()
    
    lines = []
    for key, value in fields.items():
        if key in exclude_keys:
            continue
        
        # Check if value is multiline
        if '\n' in value:
            lines.append(f"{key}: |")
            for line in value.split('\n'):
                lines.append(f"  {line}")
        else:
            lines.append(f"{key}: {value}")
    
    return '\n'.join(lines)

def process_file(filepath, dry_run=True):
    """Process a single markdown file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract front matter and body
        yaml_content, body, original = extract_frontmatter_and_body(content)
        
        if not yaml_content:
            return {'status': 'no_frontmatter'}
        
        # Parse YAML
        fields = parse_yaml_simple(yaml_content)
        
        if 'description' not in fields:
            return {'status': 'no_description'}
        
        # Extract description
        description = fields['description']
        
        # Rebuild YAML without description
        new_yaml = rebuild_yaml(fields, exclude_keys={'description'})
        
        # Build new content with description in body
        new_content = f"---\n{new_yaml}\n---\n\n{description}\n\n{body.strip()}\n"
        
        if not dry_run:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
        
        return {
            'status': 'success',
            'description_preview': description[:100] + '...' if len(description) > 100 else description
        }
        
    except Exception as e:
        return {'status': 'error', 'error': str(e)}

def main():
    """Move descriptions from front matter to body."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("📝 MOVE DESCRIPTION TO BODY")
    print("=" * 70)
    print("\nThis script will:")
    print("  1. Extract 'description' from YAML front matter")
    print("  2. Place it as the first content after front matter")
    print("  3. Keep all other front matter fields intact")
    
    # First, do a dry run
    collections = ['_monsters', '_rules']
    files_to_process = []
    
    for collection in collections:
        collection_path = project_root / collection
        
        if not collection_path.exists():
            continue
        
        md_files = list(collection_path.rglob('*.md'))
        
        for md_file in md_files:
            result = process_file(md_file, dry_run=True)
            if result.get('status') == 'success':
                files_to_process.append((md_file, result))
    
    if not files_to_process:
        print("\n✅ No files need processing!")
        print("   (No files found with 'description' in front matter)")
        return
    
    # Show what will be changed
    print(f"\n📋 Found {len(files_to_process)} files with descriptions:\n")
    
    for filepath, result in files_to_process:
        print(f"  📄 {filepath.name}")
        if 'description_preview' in result:
            preview = result['description_preview'].replace('\n', ' ')
            print(f"     Preview: {preview}\n")
    
    # Ask for confirmation
    print("=" * 70)
    response = input("\n❓ Process these files? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y']:
        print("\n❌ Cancelled. No files were modified.")
        return
    
    # Apply changes
    print("\n🔨 Processing files...\n")
    success_count = 0
    error_count = 0
    
    for filepath, _ in files_to_process:
        result = process_file(filepath, dry_run=False)
        if result.get('status') == 'success':
            success_count += 1
            print(f"  ✅ Processed: {filepath.name}")
        elif result.get('status') == 'error':
            error_count += 1
            print(f"  ❌ Error: {filepath.name} - {result.get('error')}")
    
    print("\n" + "=" * 70)
    print(f"✅ Successfully processed {success_count} file(s)")
    if error_count > 0:
        print(f"❌ {error_count} file(s) had errors")
    
    print("\n💡 Next steps:")
    print("  1. Review changes: git diff")
    print("  2. Update your layout template to render the description")
    print("  3. Commit: git add . && git commit -m 'Move descriptions to body'")
    print("  4. Push to trigger new build")
    
    print("\n📌 Note: Your statblock layout may need updating to display")
    print("   the description. The content will be available as {{ content }}")

if __name__ == '__main__':
    main()
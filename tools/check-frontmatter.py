#!/usr/bin/env python3
"""
Comprehensive Jekyll build diagnostic tool.
Checks for various issues that could cause build failures.
"""

import os
import re
import yaml
from pathlib import Path
from collections import defaultdict

def parse_frontmatter_full(content):
    """Extract and parse YAML front matter with error detection."""
    pattern = r'^---\s*\n(.*?)\n---\s*\n'
    match = re.match(pattern, content, re.DOTALL)
    
    if not match:
        return None, "No front matter found"
    
    yaml_content = match.group(1)
    
    try:
        # Try to parse as proper YAML
        frontmatter = yaml.safe_load(yaml_content)
        return frontmatter, None
    except yaml.YAMLError as e:
        return None, f"YAML parse error: {str(e)}"

def check_file_comprehensive(filepath):
    """Perform comprehensive checks on a markdown file."""
    issues = []
    warnings = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check 1: Front matter parsing
        frontmatter, error = parse_frontmatter_full(content)
        
        if error:
            issues.append(f"Front matter issue: {error}")
            return {'file': filepath, 'issues': issues, 'warnings': warnings, 'frontmatter': None}
        
        if frontmatter is None:
            warnings.append("No front matter (may be processed by jekyll-optional-front-matter)")
            return {'file': filepath, 'issues': issues, 'warnings': warnings, 'frontmatter': None}
        
        # Check 2: Layout field
        layout = frontmatter.get('layout')
        if not layout:
            warnings.append("Missing 'layout' field")
        
        # Check 3: Invalid YAML structures
        if isinstance(frontmatter, str):
            issues.append("Front matter parsed as string instead of dict")
        
        # Check 4: Special characters in values
        for key, value in frontmatter.items() if isinstance(frontmatter, dict) else []:
            if isinstance(value, str):
                # Check for unescaped special characters
                if '"' in value and "'" in value:
                    warnings.append(f"Mixed quotes in '{key}' field")
                # Check for problematic unicode
                if any(ord(c) > 127 for c in value):
                    # Check specifically for problematic characters
                    problematic = [c for c in value if ord(c) in [8211, 8212, 8216, 8217, 8220, 8221]]
                    if problematic:
                        warnings.append(f"Smart quotes/dashes in '{key}' field: {problematic}")
        
        # Check 5: Collection field conflicts
        if 'collection' in frontmatter:
            warnings.append(f"Has 'collection' field: {frontmatter['collection']}")
        
        # Check 6: Empty or null layout
        if layout == '' or layout is None:
            issues.append("Layout field is empty or null")
        
        # Check 7: Whitespace issues in front matter
        raw_frontmatter = content.split('---')[1] if content.count('---') >= 2 else ""
        if raw_frontmatter:
            lines = raw_frontmatter.split('\n')
            for i, line in enumerate(lines, 1):
                if line.strip() and ':' in line:
                    key_part = line.split(':')[0]
                    # Check for tabs
                    if '\t' in line:
                        warnings.append(f"Line {i}: Contains tab characters")
                    # Check for trailing spaces after key
                    if key_part.endswith(' '):
                        warnings.append(f"Line {i}: Trailing space after key")
        
        # Check 8: File encoding issues
        try:
            content.encode('ascii')
        except UnicodeEncodeError:
            # Has non-ASCII characters - check if they're problematic
            non_ascii_chars = set(c for c in content if ord(c) > 127)
            if any(ord(c) in [8211, 8212, 8216, 8217, 8220, 8221] for c in non_ascii_chars):
                warnings.append("Contains smart quotes or em-dashes (may cause issues)")
        
        return {
            'file': filepath,
            'issues': issues,
            'warnings': warnings,
            'frontmatter': frontmatter,
            'layout': layout
        }
        
    except Exception as e:
        return {
            'file': filepath,
            'issues': [f"Error reading file: {str(e)}"],
            'warnings': [],
            'frontmatter': None
        }

def check_config_file(project_root):
    """Check _config.yml for issues."""
    config_path = project_root / '_config.yml'
    issues = []
    
    if not config_path.exists():
        return ["_config.yml not found"]
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # Check for collections configuration
        if 'collections' in config:
            collections = config['collections']
            for coll_name, coll_settings in collections.items():
                if isinstance(coll_settings, dict):
                    output = coll_settings.get('output', False)
                    if output:
                        issues.append(f"Collection '{coll_name}' has output: true (will generate pages)")
        
        # Check for exclude settings
        if 'exclude' in config:
            print(f"  ℹ️  Exclude list: {config['exclude']}")
        
        # Check defaults
        if 'defaults' in config:
            print(f"  ℹ️  Found {len(config['defaults'])} default configurations")
            for i, default in enumerate(config['defaults']):
                scope = default.get('scope', {})
                values = default.get('values', {})
                print(f"    Default {i+1}: scope={scope}, values={values}")
        
    except Exception as e:
        issues.append(f"Error parsing _config.yml: {str(e)}")
    
    return issues

def main():
    """Run comprehensive diagnostics."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("🔍 JEKYLL BUILD DIAGNOSTIC TOOL")
    print("=" * 70)
    
    # Check _config.yml
    print("\n📄 Checking _config.yml...")
    config_issues = check_config_file(project_root)
    if config_issues:
        print("  ⚠️  Config issues found:")
        for issue in config_issues:
            print(f"    - {issue}")
    else:
        print("  ✅ _config.yml looks good")
    
    # Check collections
    collections = ['_monsters', '_rules']
    
    all_results = []
    files_with_issues = []
    files_with_warnings = []
    
    for collection in collections:
        collection_path = project_root / collection
        
        if not collection_path.exists():
            print(f"\n⚠️  Collection not found: {collection}")
            continue
        
        md_files = list(collection_path.rglob('*.md'))
        
        print(f"\n📁 Checking {collection}/ ({len(md_files)} files)")
        print("-" * 70)
        
        layout_counts = defaultdict(int)
        
        for md_file in md_files:
            result = check_file_comprehensive(md_file)
            all_results.append(result)
            
            # Count layouts
            if result.get('layout'):
                layout_counts[result['layout']] += 1
            else:
                layout_counts['(no layout)'] += 1
            
            # Report issues
            if result['issues']:
                files_with_issues.append(result)
                print(f"\n  ❌ {md_file.name}")
                for issue in result['issues']:
                    print(f"     - {issue}")
            
            # Report warnings
            if result['warnings']:
                files_with_warnings.append(result)
                print(f"\n  ⚠️  {md_file.name}")
                for warning in result['warnings']:
                    print(f"     - {warning}")
        
        # Show layout distribution
        print(f"\n  Layout distribution:")
        for layout, count in sorted(layout_counts.items()):
            print(f"    - {layout}: {count} files")
    
    # Final summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    print(f"Total files checked: {len(all_results)}")
    print(f"Files with ISSUES: {len(files_with_issues)}")
    print(f"Files with WARNINGS: {len(files_with_warnings)}")
    
    if not files_with_issues and not files_with_warnings:
        print("\n✅ No obvious issues found!")
        print("\n💡 Possible causes of build failure:")
        print("  1. Plugin incompatibility (GitHub Pages has restricted plugins)")
        print("  2. Liquid template syntax errors in layout files")
        print("  3. Missing dependencies or theme issues")
        print("  4. Memory/timeout issues with large builds")
        print("  5. Check if _monsters collection has 'output: true' in _config.yml")
        print("\n  Run: grep -A 5 'collections:' _config.yml")

if __name__ == '__main__':
    main()
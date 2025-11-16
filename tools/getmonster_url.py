import os
import csv
import re

def extract_title_from_frontmatter(content):
    """Extract title from YAML frontmatter"""
    match = re.search(r'^---\s*\n.*?^title:\s*(.+?)\s*$.*?^---\s*\n', 
                     content, re.MULTILINE | re.DOTALL)
    if match:
        return match.group(1).strip()
    return None

def generate_url(filename):
    """Generate URL from filename"""
    # Remove .md extension and convert to URL format
    name = filename.replace('.md', '')
    base_url = "https://hawthorneguild.github.io/Guides/monster-compendium/"
    return f"{base_url}{name}/"

def main():
    # Set up paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    monsters_dir = os.path.join(os.path.dirname(script_dir), '_monsters')
    output_file = os.path.join(script_dir, 'monsters.csv')
    
    # Check if _monsters directory exists
    if not os.path.exists(monsters_dir):
        print(f"Error: Directory {monsters_dir} not found")
        return
    
    monsters = []
    
    # Process each .md file
    for filename in os.listdir(monsters_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(monsters_dir, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    title = extract_title_from_frontmatter(content)
                    
                    if title:
                        url = generate_url(filename)
                        monsters.append({'title': title, 'url': url})
                        print(f"Processed: {title}")
                    else:
                        print(f"Warning: No title found in {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")
    
    # Write to CSV
    if monsters:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['title', 'url'])
            writer.writeheader()
            writer.writerows(monsters)
        
        print(f"\nSuccess! Created {output_file} with {len(monsters)} monsters")
    else:
        print("No monsters found to process")

if __name__ == "__main__":
    main()
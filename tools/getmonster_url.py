import os
import re
import csv

def generate_slug(text):
    """Converts title to a URL-friendly slug."""
    slug = text.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug)
    return slug

def process_monsters():
    # Define paths relative to /tools
    source_dir = os.path.join('..', '_monsters')
    output_file = 'monster_list.csv'
    base_url = "https://hawthorneguild.github.io/Guides/monster-compendium/"

    monster_data = []

    # Check if directory exists
    if not os.path.exists(source_dir):
        print(f"Error: Directory {source_dir} not found.")
        return

    # Regex patterns for YAML frontmatter
    title_pattern = re.compile(r'^title:\s*(.*)$', re.MULTILINE)
    creator_pattern = re.compile(r'^creator:\s*(.*)$', re.MULTILINE)

    for filename in os.listdir(source_dir):
        if filename.endswith('.md'):
            file_path = os.path.join(source_dir, filename)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Extract Title
                title_match = title_pattern.search(content)
                name = title_match.group(1).strip() if title_match else "Unknown"
                
                # Extract Creator
                creator_match = creator_pattern.search(content)
                creator = creator_match.group(1).strip() if creator_match else "Unknown"
                
                # Generate URL
                slug = generate_slug(name)
                url = f"{base_url}{slug}/"
                
                monster_data.append({
                    'monster name': name,
                    'monster creator': creator,
                    'monster URL': url
                })

    # Write to CSV
    keys = ['monster name', 'monster creator', 'monster URL']
    with open(output_file, 'w', newline='', encoding='utf-8') as output_csv:
        dict_writer = csv.DictWriter(output_csv, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(monster_data)

    print(f"Successfully processed {len(monster_data)} monsters into {output_file}")

if __name__ == "__main__":
    process_monsters()
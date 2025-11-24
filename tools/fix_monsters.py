import os

def standardize_statblocks():
    # Determine the path to the _monsters directory
    # Assumes this script is running from /tools, so we go up one level (..) then into _monsters
    base_dir = os.path.dirname(__file__)
    target_dir = os.path.normpath(os.path.join(base_dir, '..', '_monsters'))

    print(f"Target Directory: {os.path.abspath(target_dir)}")

    if not os.path.exists(target_dir):
        print("Error: '_monsters' directory not found at the expected path.")
        return

    files_modified = 0
    files_scanned = 0

    # Walk through the directory structure
    for root, dirs, files in os.walk(target_dir):
        for filename in files:
            if filename.endswith(".md"):
                files_scanned += 1
                filepath = os.path.join(root, filename)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    
                    # specific string replacements
                    # 1. Replace **Armor Class** with **AC**
                    if "**Armor Class**" in content:
                        content = content.replace("**Armor Class**", "**AC**")
                    
                    # 2. Replace **Hit Points** with **HP**
                    if "**Hit Points**" in content:
                        content = content.replace("**Hit Points**", "**HP**")

                    # Write back only if changes were made
                    if content != original_content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Updated: {filename}")
                        files_modified += 1
                        
                except Exception as e:
                    print(f"Error processing {filename}: {e}")

    print("-" * 30)
    print(f"Complete.")
    print(f"Scanned: {files_scanned} files")
    print(f"Modified: {files_modified} files")

if __name__ == "__main__":
    standardize_statblocks()
import csv
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import PreservedScalarString
from pathlib import Path

# --- Configuration ---
script_file = Path(__file__).resolve()
script_dir = script_file.parent
project_root = script_dir.parent

# Adjust paths as needed for your folder structure
tsv_file_path = project_root / 'tools' / 'faqs - Sheet1.tsv'
yml_file_path = project_root / '_data' / 'faqs.yml'
# ---------------------

def create_block_scalar(text):
    """
    Converts a string into a YAML block scalar, preserving newlines.
    """
    if not text:
        return ""

    # 1. Normalize Carriage Returns (Windows compatibility)
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # 2. Handle Literal "\n" (Legacy support if you typed backslash-n)
    #    We convert these into real newlines first.
    text = text.replace(r'\n', '\n')

    # 3. Markdown Formatting:
    #    The website likely needs a "blank line" (double newline) to render a paragraph break.
    #    We replace every single newline with two newlines.
    #    (We prevent creating 4 newlines if they already exist)
    processed_text = text.replace('\n', '\n\n')

    # Cleanup: Remove potential triple/quadruple newlines to keep it tidy
    while '\n\n\n' in processed_text:
        processed_text = processed_text.replace('\n\n\n', '\n\n')

    return PreservedScalarString(processed_text.strip())

def convert_tsv_to_yml(tsv_path, yml_path):
    faq_list = []
    
    try:
        # Use 'utf-8-sig' to handle potential BOM from Excel/Sheets exports
        with open(tsv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            for row in reader:
                if not row.get('question'):
                    continue
                
                faq_item = {
                    'question': row['question'].strip(),
                    'category': row['category'].strip(),
                    'answer': create_block_scalar(row.get('answer', ''))
                }
                faq_list.append(faq_item)

    except FileNotFoundError:
        print(f"❌ Error: Input file not found at {tsv_path}")
        return
    except Exception as e:
        print(f"❌ Error reading TSV: {e}")
        return

    # --- YAML Writing ---
    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)
    yaml.width = 800 

    try:
        with open(yml_path, mode='w', encoding='utf-8') as f:
            yaml.dump(faq_list, f)
        
        print(f"✅ Successfully converted {len(faq_list)} items.")
        print(f"Output: {yml_file_path}")

    except Exception as e:
        print(f"❌ Error writing YML: {e}")

if __name__ == "__main__":
    convert_tsv_to_yml(tsv_file_path, yml_file_path)
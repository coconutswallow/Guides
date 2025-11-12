import csv
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import PreservedScalarString

# --- Configuration ---
tsv_file_path = '_data/faqs.tsv'  # The input file from your spreadsheet
yml_file_path = '_data/faqs.yml'  # The final output file

# ---------------------

def create_block_scalar(text):
  """
  Converts a string into a YML block scalar (|)
  by replacing literal '\n' with newlines.
  """
  # Replace the user-typed '\n' with actual newlines
  processed_text = text.replace(r'\n', '\n')
  
  # Strip any leading/trailing newlines to keep YML clean
  processed_text = processed_text.strip()
  
  # Use PreservedScalarString to force the '|' block style
  return PreservedScalarString(processed_text)

def convert_tsv_to_yml(tsv_path, yml_path):
  faq_list = []
  
  try:
    with open(tsv_path, mode='r', encoding='utf-8') as f:
      # Use csv.reader with tab delimiter
      reader = csv.DictReader(f, delimiter='\t')
      
      for row in reader:
        # Check for empty rows
        if not row.get('question'):
          continue
          
        faq_item = {
          'question': row['question'].strip(),
          'category': row['category'].strip(),
          # Use our special function for the answer
          'answer': create_block_scalar(row['answer'])
        }
        faq_list.append(faq_item)

  except FileNotFoundError:
    print(f"Error: Input file not found at {tsv_path}")
    return
  except Exception as e:
    print(f"Error reading TSV: {e}")
    return

  # Initialize the YAML dumper
  yaml = YAML()
  yaml.indent(mapping=2, sequence=4, offset=2) # Clean indentation
  yaml.width = 800 # Prevent line wrapping

  try:
    with open(yml_path, mode='w', encoding='utf-8') as f:
      yaml.dump(faq_list, f)
    
    print(f"✅ Successfully converted {len(faq_list)} items.")
    print(f"Input:  {tsv_path}")
    print(f"Output: {yml_file_path}")

  except Exception as e:
    print(f"Error writing YML: {e}")

# --- Run the script ---
if __name__ == "__main__":
  convert_tsv_to_yml(tsv_file_path, yml_path)
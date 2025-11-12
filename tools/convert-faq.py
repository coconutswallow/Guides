"""
This script converts a TSV (Tab-Separated Values) file containing FAQs
into a structured YAML file, suitable for use in static site generators
like Jekyll.

It is designed to be run from the project root or from its own directory.
It handles multi-line answers by converting literal '\n' strings from the TSV
into proper YAML block scalars (|).
"""

import csv
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import PreservedScalarString
from pathlib import Path

# --- Configuration ---
# This section defines the file paths dynamically and robustly, so the
# script can be run from any location.

# `Path(__file__)` is a special variable that gets the path to this script file.
# `.resolve()` gets the full, absolute path (e.g., /Users/me/Project/tools/convert.py)
script_file = Path(__file__).resolve()

# `.parent` gets the directory containing the file.
# `script_dir` will be /Users/me/Project/tools
script_dir = script_file.parent

# `project_root` assumes the script is one level deep (in /tools)
# and goes up one level to get the project's root directory.
# `project_root` will be /Users/me/Project
project_root = script_dir.parent

# `pathlib` lets us use the `/` operator to build paths that work
# on any operating system (Windows, macOS, Linux).
# This creates a solid, absolute path to the data files.
tsv_file_path = project_root / '_data' / 'faqs.tsv'
yml_file_path = project_root / '_data' / 'faqs.yml'

# ---------------------

def create_block_scalar(text):
  """
  Converts a string into a YAML block scalar, forcing the '|' style.
  
  This is crucial for multi-line answers. In the TSV, a user can
  type 'First line.\nSecond line.' This function turns that
  literal '\n' string into an actual newline character.
  """
  
  # Replace the user-typed literal string r'\n' with an actual newline
  processed_text = text.replace(r'\n', '\n')
  
  # Clean up any accidental leading/trailing whitespace or newlines
  processed_text = processed_text.strip()
  
  # `PreservedScalarString` is a special class from `ruamel.yaml`
  # that tells the dumper to use the '|' block style, preserving
  # the newlines we just created.
  return PreservedScalarString(processed_text)

def convert_tsv_to_yml(tsv_path, yml_path):
  """
  Reads the TSV file, processes each row, and writes to a YAML file.
  """
  
  # This list will store all the final dictionary objects
  # before they are dumped to YAML.
  faq_list = []
  
  try:
    # Open the source TSV file for reading
    # 'encoding="utf-8"' is important for handling special characters.
    with open(tsv_path, mode='r', encoding='utf-8') as f:
      
      # `csv.DictReader` is perfect for this. It reads the first row
      # as headers (e.g., 'question', 'category', 'answer') and
      # returns each subsequent row as a dictionary.
      # We specify `delimiter='\t'` to tell it to split on tabs, not commas.
      reader = csv.DictReader(f, delimiter='\t')
      
      for row in reader:
        # Safety check: If a row is missing a 'question', skip it.
        # This prevents empty/stray rows in the spreadsheet from
        # creating blank entries in the YAML.
        if not row.get('question'):
          continue
          
        # Create a new dictionary for this FAQ item
        faq_item = {
          # `.strip()` cleans up any accidental whitespace
          'question': row['question'].strip(),
          'category': row['category'].strip(),
          
          # Use our special helper function to process the answer
          # for newlines and YAML block formatting.
          'answer': create_block_scalar(row['answer'])
        }
        
        # Add the processed dictionary to our main list
        faq_list.append(faq_item)

  except FileNotFoundError:
    print(f"❌ Error: Input file not found at {tsv_path}")
    print("Please make sure 'faqs.tsv' exists in the '_data' directory.")
    return
  except Exception as e:
    print(f"❌ Error reading TSV: {e}")
    return

  # --- YAML Writing ---
  
  # We use `ruamel.yaml` instead of the more common `PyYAML`
  # because it gives us fine-grained control over output formatting,
  # especially for block scalars and indentation.
  yaml = YAML()
  
  # Set desired indentation:
  # - `mapping=2`: Indent dictionary key-value pairs by 2 spaces.
  # - `sequence=4`: Indent list items by 4 spaces.
  # - `offset=2`: Start the list item (the '-') at 2 spaces in.
  # This combination creates a clean, readable list format:
  #   -
  #     question: ...
  #     answer: ...
  yaml.indent(mapping=2, sequence=4, offset=2)
  
  # Set a very wide width to prevent `ruamel` from trying
  # to line-wrap our multi-line 'answer' blocks.
  yaml.width = 800 

  try:
    # Open the destination YAML file in 'write' mode ('w')
    # This will overwrite the file if it already exists.
    with open(yml_path, mode='w', encoding='utf-8') as f:
      
      # Dump the *entire* list of dictionaries into the file
      yaml.dump(faq_list, f)
    
    # Give the user a nice success message
    print(f"✅ Successfully converted {len(faq_list)} items.")
    print(f"Input:  {tsv_path}")
    print(f"Output: {yml_file_path}")

  except Exception as e:
    print(f"❌ Error writing YML: {e}")

# --- Run the script ---

# This is a standard Python convention.
# `__name__ == "__main__"` is true ONLY when the script is
# executed directly (e.g., `python faq-tsv-convert.py`).
# It will be FALSE if this script is imported by another Python file.
# This ensures our conversion code only runs when we want it to.
if __name__ == "__main__":
  convert_tsv_to_yml(tsv_file_path, yml_file_path)
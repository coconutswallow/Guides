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
# This section defines the file paths dynamically and robustly.

# `Path(__file__)` gets the path to this script file.
# `.resolve()` gets the full, absolute path.
script_file = Path(__file__).resolve()

# `.parent` gets the directory containing the file.
# `script_dir` will be /.../project/tools
script_dir = script_file.parent

# `project_root` assumes the script is in /tools
# and goes up one level to get the project's root directory.
# `project_root` will be /.../project
project_root = script_dir.parent

# --- PATHING CHANGE ---
# The input TSV is now expected to be IN THE SAME FOLDER as this script.
tsv_file_path = script_dir / 'FAQs.tsv'

# The output YML file still goes to the _data folder in the project root.
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
  
  faq_list = []
  
  try:
    with open(tsv_path, mode='r', encoding='utf-8') as f:
      
      # `csv.DictReader` reads the first row as headers
      # and returns each subsequent row as a dictionary.
      reader = csv.DictReader(f, delimiter='\t')
      
      for row in reader:
        
        # --- THE FIX ---
        # Try to get the capitalized version OR the lowercase version.
        # This makes the script flexible.
        question = row.get('Question') or row.get('question')
        category = row.get('Category') or row.get('category')
        answer = row.get('Answer') or row.get('answer')

        # Check for empty rows using our new variable
        if not question:
          continue
          
        # We *must* use 'question', 'category', 'answer' (lowercase)
        # as the keys in our final YAML, or the website (faq.html)
        # won't be able to find item.question, etc.
        faq_item = {
          'question': question.strip(),
          'category': category.strip(),
          'answer': create_block_scalar(answer)
        }
        
        faq_list.append(faq_item)

  except FileNotFoundError:
    print(f"❌ Error: Input file not found at {tsv_path}")
    print("Please make sure 'FAQs.tsv' is in the 'tools' directory with the script.")
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
    print(f"Input:  {tsv_path}")
    print(f"Output: {yml_file_path}")

  except Exception as e:
    print(f"❌ Error writing YML: {e}")

# --- Run the script ---
if __name__ == "__main__":
  convert_tsv_to_yml(tsv_file_path, yml_file_path)
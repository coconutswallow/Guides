import pandas as pd
import json
import ast

## This takes a TSV file from the google sheet for the Character Lookup and converts it to JSON format to update supabase.  Rename the downloaded TSV file to data.tsv

# 1. Load the TSV file
# Ensure the filename matches your actual file
tsv_df = pd.read_csv('data.tsv', sep='\t')

# 2. Function to convert the ASI string "[4, 8...]" into a real Python list
def parse_asi(asi_str):
    try:
        return ast.literal_eval(str(asi_str))
    except (ValueError, SyntaxError):
        return []

# 3. Build the list of records
# The order of keys here is critical to match your original file's structure
records = []
for _, row in tsv_df.iterrows():
    record = {
        "ASI": parse_asi(row['ASI']),
        "class": str(row['Class']),
        "version": int(row['Version']),
        "subclass": str(row['Subclass'])
    }
    records.append(record)

# 4. Save to JSON 
# separators=(',', ':') removes all whitespace to keep it compact
output_filename = 'lookup-character.json'
with open(output_filename, 'w') as f:
    json.dump(records, f, separators=(',', ':'))

print(f"Successfully created {output_filename}")
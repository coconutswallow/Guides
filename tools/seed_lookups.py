import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# --- Configuration ---
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"Error: Credentials not found in {env_path}")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Data Definitions ---

DATA_SIZES = [
    {"value": "Tiny"},
    {"value": "Small"},
    {"value": "Medium"},
    {"value": "Large"},
    {"value": "Huge"},
    {"value": "Gargantuan"}
]

DATA_ALIGNMENTS = [
    {"value": "Lawful Good"}, {"value": "Neutral Good"}, {"value": "Chaotic Good"},
    {"value": "Lawful Neutral"}, {"value": "True Neutral"}, {"value": "Chaotic Neutral"},
    {"value": "Lawful Evil"}, {"value": "Neutral Evil"}, {"value": "Chaotic Evil"},
    {"value": "Unaligned"}, {"value": "Any Alignment"}
]

DATA_SPECIES = [
    {"value": "Aberration"}, {"value": "Beast"}, {"value": "Celestial"},
    {"value": "Construct"}, {"value": "Dragon"}, {"value": "Elemental"},
    {"value": "Fey"}, {"value": "Fiend"}, {"value": "Giant"},
    {"value": "Humanoid"}, {"value": "Monstrosity"}, {"value": "Ooze"},
    {"value": "Plant"}, {"value": "Undead"}
]

DATA_ENVIRONMENTS = [
    # These map to 'name' in lookup_environment
    "Arctic", "Coastal", "Desert", "Forest", "Grassland",
    "Hill", "Mountain", "Swamp", "Underdark", "Underwater", "Urban"
]

# Standard 5e XP Table
DATA_CR = [
    {"value": "0",   "xp": 10,     "sort_order": 0},
    {"value": "1/8", "xp": 25,     "sort_order": 1},
    {"value": "1/4", "xp": 50,     "sort_order": 2},
    {"value": "1/2", "xp": 100,    "sort_order": 3},
    {"value": "1",   "xp": 200,    "sort_order": 4},
    {"value": "2",   "xp": 450,    "sort_order": 5},
    {"value": "3",   "xp": 700,    "sort_order": 6},
    {"value": "4",   "xp": 1100,   "sort_order": 7},
    {"value": "5",   "xp": 1800,   "sort_order": 8},
    {"value": "6",   "xp": 2300,   "sort_order": 9},
    {"value": "7",   "xp": 2900,   "sort_order": 10},
    {"value": "8",   "xp": 3900,   "sort_order": 11},
    {"value": "9",   "xp": 5000,   "sort_order": 12},
    {"value": "10",  "xp": 5900,   "sort_order": 13},
    {"value": "11",  "xp": 7200,   "sort_order": 14},
    {"value": "12",  "xp": 8400,   "sort_order": 15},
    {"value": "13",  "xp": 10000,  "sort_order": 16},
    {"value": "14",  "xp": 11500,  "sort_order": 17},
    {"value": "15",  "xp": 13000,  "sort_order": 18},
    {"value": "16",  "xp": 15000,  "sort_order": 19},
    {"value": "17",  "xp": 18000,  "sort_order": 20},
    {"value": "18",  "xp": 20000,  "sort_order": 21},
    {"value": "19",  "xp": 22000,  "sort_order": 22},
    {"value": "20",  "xp": 25000,  "sort_order": 23},
    {"value": "21",  "xp": 33000,  "sort_order": 24},
    {"value": "22",  "xp": 41000,  "sort_order": 25},
    {"value": "23",  "xp": 50000,  "sort_order": 26},
    {"value": "24",  "xp": 62000,  "sort_order": 27},
    {"value": "25",  "xp": 75000,  "sort_order": 28},
    {"value": "26",  "xp": 90000,  "sort_order": 29},
    {"value": "27",  "xp": 105000, "sort_order": 30},
    {"value": "28",  "xp": 120000, "sort_order": 31},
    {"value": "29",  "xp": 135000, "sort_order": 32},
    {"value": "30",  "xp": 155000, "sort_order": 33}
]

# --- Seeding Functions ---

def seed_simple_table(table_name, data):
    print(f"Seeding {table_name}...")
    try:
        # upsert is cleaner than insert for lookups (handles re-runs)
        supabase.table(table_name).upsert(data).execute()
        print(f"  -> Success: {len(data)} rows.")
    except Exception as e:
        print(f"  -> Error: {e}")

def seed_environment():
    """
    Environment has an auto-increment ID, so we can't easily upsert 
    without knowing IDs. We will check existence by name first.
    """
    print("Seeding lookup_environment...")
    count = 0
    for env_name in DATA_ENVIRONMENTS:
        try:
            # Check if exists
            res = supabase.table('lookup_environment').select("id").eq("name", env_name).execute()
            if not res.data:
                supabase.table('lookup_environment').insert({"name": env_name}).execute()
                count += 1
        except Exception as e:
            print(f"  -> Error inserting {env_name}: {e}")
    print(f"  -> Added {count} new environments.")

# --- Main Execution ---

if __name__ == "__main__":
    seed_simple_table("lookup_size", DATA_SIZES)
    seed_simple_table("lookup_alignment", DATA_ALIGNMENTS)
    seed_simple_table("lookup_species", DATA_SPECIES)
    seed_simple_table("lookup_cr", DATA_CR)
    seed_environment()
    print("------------------------------------------------")
    print("Lookup tables populated successfully.")
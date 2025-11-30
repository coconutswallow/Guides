import os
import re
import datetime
from supabase import create_client, Client

# ==========================================
# 1. CONFIGURATION
# ==========================================
SUPABASE_URL = "https://iepqxczcyvrxcbyeiscc.supabase.co"
SUPABASE_SERVICE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE"  # <--- PASTE SERVICE KEY HERE
TARGET_USER_ID = "YOUR_USER_UUID_HERE"             # <--- PASTE YOUR USER UUID HERE

# Dynamically find the sibling folder "_monsters" relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MARKDOWN_DIR = os.path.join(SCRIPT_DIR, "../_monsters")

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ==========================================
# 2. HELPER FUNCTIONS
# ==========================================

def get_proficiency_bonus(cr_str):
    if not cr_str: return 2
    cr_num = 0.0
    try:
        clean_cr = str(cr_str).replace(' ', '')
        if '/' in clean_cr:
            parts = clean_cr.split('/')
            cr_num = float(parts[0]) / float(parts[1])
        else:
            cr_num = float(clean_cr)
    except:
        cr_num = 0.0
    if cr_num < 5: return 2
    if cr_num < 9: return 3
    if cr_num < 13: return 4
    if cr_num < 17: return 5
    if cr_num < 21: return 6
    if cr_num < 25: return 7
    if cr_num < 29: return 8
    return 9

def get_ability_mod(score):
    return (score - 10) // 2

def parse_stat(block_content, stat_name):
    pattern = re.compile(rf"\*\*{stat_name}\*\*\s+([\s\S]+?)(?=\s*\*\*|\n|\s*\||$)")
    match = pattern.search(block_content)
    return match.group(1).strip() if match else ""

def parse_frontmatter(content):
    match = re.match(r"^---[\r\n]+([\s\S]*?)[\r\n]+---", content)
    data = {}
    if match:
        lines = match.group(1).splitlines()
        for line in lines:
            if ':' in line:
                key, val = line.split(':', 1)
                data[key.strip()] = val.strip().strip("'").strip('"')
    return data

def parse_lore(content):
    match = re.search(r"## [^\r\n]+[\r\n]+[\r\n]+([\s\S]*?)[\r\n]+___", content)
    return match.group(1).strip() if match else ""

def split_stat_block_and_info(full_body):
    lines = full_body.splitlines()
    stat_block_lines = []
    additional_info_lines = []
    inside_stat_block = False
    past_stat_block = False

    for line in lines:
        trimmed = line.strip()
        if trimmed == '___' and inside_stat_block:
            past_stat_block = True
            continue
        
        if trimmed.startswith('>'):
            if past_stat_block:
                additional_info_lines.append(line)
            else:
                inside_stat_block = True
                stat_block_lines.append(line)
        else:
            if not inside_stat_block and trimmed != '':
                pass 
            if inside_stat_block and trimmed != '':
                past_stat_block = True
            if past_stat_block or (trimmed != '' and not inside_stat_block):
                additional_info_lines.append(line)

    clean_stat_block = "\n".join([l.lstrip('>').strip() for l in stat_block_lines])
    clean_info = "\n".join(additional_info_lines).strip()
    return clean_stat_block, clean_info

def parse_ability_scores(block_content):
    pattern = re.compile(r"\|\s*(\d+)\s*[^|]*\|\s*(\d+)\s*[^|]*\|\s*(\d+)\s*[^|]*\|\s*(\d+)\s*[^|]*\|\s*(\d+)\s*[^|]*\|\s*(\d+)\s*[^|]*\|")
    match = pattern.search(block_content)
    if match:
        return {
            "str": int(match.group(1)), "dex": int(match.group(2)), "con": int(match.group(3)),
            "int": int(match.group(4)), "wis": int(match.group(5)), "cha": int(match.group(6)),
        }
    return {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10}

def parse_saving_throws(block_content):
    saves = {}
    match = re.search(r"\*\*Saving Throws\*\*\s+(.+)", block_content)
    if match:
        text = match.group(1)
        for ability in ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']:
            m = re.search(rf"{ability}\s+([+\-]\d+)", text, re.IGNORECASE)
            if m: saves[f"{ability.lower()}Save"] = m.group(1)
    return saves

def parse_section(block_content, header):
    items = []
    section_pattern = re.search(rf"### {header}\n+([\s\S]*?)(?=\n###|$)", block_content)
    if section_pattern:
        content = section_pattern.group(1)
        item_pattern = re.finditer(r"\*\*\*([^.]+)\.\*\*\*\s*([\s\S]*?)(?=\n\*\*\*|\n###|$)", content)
        for m in item_pattern:
            items.append({"name": m.group(1).strip(), "description": m.group(2).strip()})
    return items

def parse_legendary_actions(block_content):
    result = {"description": "", "actions": []}
    match = re.search(r"### Legendary Actions\n+([\s\S]*?)(?=\n+###|$)", block_content)
    if match:
        content = match.group(1)
        desc_match = re.match(r"^([\s\S]*?)(?=\n+\*\*\*)", content)
        if desc_match: result["description"] = desc_match.group(1).strip()
        action_pattern = re.finditer(r"\*\*\*([^.]+)\.\*\*\*\s*([\s\S]*?)(?=\*\*\*|###|$)", content)
        for m in action_pattern:
            result["actions"].append({"name": m.group(1).strip(), "description": m.group(2).strip()})
    return result

def deduce_initiative_proficiency(init_text, dex, cr):
    if not init_text: return '0'
    match = re.search(r"([+-]\d+)", init_text)
    if not match: return '0'
    total_mod = int(match.group(1))
    dex_mod = get_ability_mod(dex)
    pb = get_proficiency_bonus(cr)
    if total_mod == dex_mod + pb: return '1'
    if total_mod == dex_mod + (pb * 2): return '2'
    return '0'

def parse_monster_file(content):
    state = {
        "layout": "statblock", "title": "", "cr": "", "size": "Medium", 
        "type": "Beast", "alignment": "Unaligned", "category": "2014 Fair Game", 
        "creator": "", "image": "", "image_credit": "", "description": "",
        "ac": "", "hp": "", "speed": "", "initiativeProficiency": "0",
        "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10,
        "strSave": "", "dexSave": "", "conSave": "", "intSave": "", "wisSave": "", "chaSave": "",
        "skills": "", "damageResistances": "", "damageImmunities": "", 
        "conditionImmunities": "", "senses": "", "languages": "",
        "traits": [], "actions": [], "reactions": [], "bonusActions": [], 
        "legendaryActions": [], "legendaryActionDescription": "",
        "lairActions": "", "regionalEffects": "", "additionalInfo": ""
    }

    fm = parse_frontmatter(content)
    state.update(fm)
    state["description"] = parse_lore(content)

    body_match = re.search(r"___[\s\S]*$", content)
    if not body_match: return state

    stat_block, additional_info = split_stat_block_and_info(body_match.group(0))
    state["additionalInfo"] = additional_info

    state.update(parse_ability_scores(stat_block))
    state["ac"] = parse_stat(stat_block, "AC") or parse_stat(stat_block, "Armor Class")
    state["hp"] = parse_stat(stat_block, "HP") or parse_stat(stat_block, "Hit Points")
    state["speed"] = parse_stat(stat_block, "Speed")
    state["initiativeProficiency"] = deduce_initiative_proficiency(parse_stat(stat_block, "Initiative"), state["dex"], state["cr"])
    state.update(parse_saving_throws(stat_block))
    state["skills"] = parse_stat(stat_block, "Skills")
    state["senses"] = parse_stat(stat_block, "Senses")
    state["languages"] = parse_stat(stat_block, "Languages")
    state["conditionImmunities"] = parse_stat(stat_block, "Condition Immunities")
    state["damageResistances"] = parse_stat(stat_block, "Damage Resistances")
    state["damageImmunities"] = parse_stat(stat_block, "Damage Immunities")

    state["traits"] = parse_section(stat_block, "Traits")
    state["actions"] = parse_section(stat_block, "Actions")
    state["bonusActions"] = parse_section(stat_block, "Bonus Actions")
    state["reactions"] = parse_section(stat_block, "Reactions")

    legendary = parse_legendary_actions(stat_block)
    state["legendaryActions"] = legendary["actions"]
    state["legendaryActionDescription"] = legendary["description"]

    def get_text_block(name):
        m = re.search(rf"### {name}\n+([\s\S]*?)(?=\n+###|$)", stat_block)
        return m.group(1).strip() if m else ""

    state["lairActions"] = get_text_block("Lair Actions")
    state["regionalEffects"] = get_text_block("Regional Effects")
    return state

# ==========================================
# 4. EXECUTION
# ==========================================

def main():
    if SUPABASE_SERVICE_KEY == "YOUR_SERVICE_ROLE_KEY_HERE":
        print("❌ ERROR: Please update the SUPABASE_SERVICE_KEY in the script.")
        return

    target_dir = os.path.normpath(MARKDOWN_DIR)
    if not os.path.exists(target_dir):
        print(f"❌ ERROR: Directory {target_dir} not found.")
        return

    files = [f for f in os.listdir(target_dir) if f.endswith(".md")]
    print(f"📂 Found {len(files)} markdown files in {target_dir}...")

    for filename in files:
        filepath = os.path.join(target_dir, filename)
        print(f"Processing {filename}...")
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            monster_state = parse_monster_file(content)
            
            if not monster_state.get("title"):
                print(f"   ⚠️ Skipped {filename}: Could not find title.")
                continue
            
            # ----------------------------------------------------
            # 1. CHECK IF MONSTER EXISTS (Upsert Logic)
            # ----------------------------------------------------
            existing_query = supabase.table("monsters") \
                .select("id") \
                .eq("title", monster_state["title"]) \
                .eq("user_id", TARGET_USER_ID) \
                .execute()
            
            is_update = len(existing_query.data) > 0

            # ----------------------------------------------------
            # 2. PREPARE PAYLOAD
            # ----------------------------------------------------
            # Data common to both Insert and Update
            payload_data = {
                "cr": monster_state.get("cr", ""),
                "type": monster_state.get("type", ""),
                "size": monster_state.get("size", ""),
                "alignment": monster_state.get("alignment", ""),
                "image": monster_state.get("image", ""),
                "status": "approved",
                "version": 1,
                "updated_at": datetime.datetime.now().isoformat(),
                "content": monster_state
            }

            # ----------------------------------------------------
            # 3. EXECUTE DB OPERATION
            # ----------------------------------------------------
            if is_update:
                # UPDATE existing record
                existing_id = existing_query.data[0]['id']
                supabase.table("monsters").update(payload_data).eq("id", existing_id).execute()
                print(f"   🔄 Overwritten: {monster_state['title']}")
            else:
                # INSERT new record (Add missing fields: title, user_id, created_at)
                payload_data["title"] = monster_state["title"]
                payload_data["user_id"] = TARGET_USER_ID
                payload_data["created_at"] = datetime.datetime.now().isoformat()
                
                supabase.table("monsters").insert(payload_data).execute()
                print(f"   ✅ Imported: {monster_state['title']}")

        except Exception as e:
            print(f"   ❌ Failed to import {filename}: {e}")

    print("\n🎉 Import process complete!")

if __name__ == "__main__":
    main()
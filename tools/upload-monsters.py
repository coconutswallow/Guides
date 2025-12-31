import os
import re
import frontmatter
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def extract_actions(text, category_name):
    # OLD PATTERN: pattern = r'###\s+' + re.escape(category_name) + r'\s*\n(.*?)(?=\n###|\Z)'
    
    # NEW PATTERN:
    # 1. Matches ### Category Name
    # 2. Handles optional trailing spaces/chars on that line
    # 3. Captures content (.*?)
    # 4. Lookahead stops at newline followed by optional '>' and spaces, then '###', OR End of String (\Z)
    pattern = r'###\s+' + re.escape(category_name) + r'.*?\n(.*?)(?=\n(?:\s*>)?\s*###|\Z)'
    
    section_match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if not section_match: return []

    content = section_match.group(1)
    actions = []
    
    # Matches ***Name.*** or **Name.** or *Name.* or bullet points - Name.
    entry_pattern = r'(?:^>|^\s*)*[-\*]*\s*(?:\*+)\s*(.*?)\.(?:\*+)\s*(.*)'
    
    current_action = None
    for line in content.split('\n'):
        # Clean the line but keep it for detection
        clean_line = line.strip().lstrip('>').strip()
        if not clean_line: continue
        
        match = re.match(entry_pattern, clean_line)
        # Special case for Regional Effects which are often just bullets
        bullet_match = re.match(r'^[-\*]\s+(.*)', clean_line)
        
        if match:
            if current_action: actions.append(current_action)
            name_raw = match.group(1).strip()
            cost = 1
            cost_match = re.search(r'\(Costs (\d+) Actions\)', name_raw, re.I)
            if cost_match:
                cost = int(cost_match.group(1))
                name_raw = re.sub(r'\s*\(Costs \d+ Actions\)', '', name_raw, re.I)
            current_action = {"name": name_raw, "description": match.group(2).strip(), "cost": cost}
        # Ensure we only treat simple bullets as actions if we are in the right category
        elif bullet_match and category_name in ["Regional Effects", "Lair Actions"]:
            if current_action: actions.append(current_action)
            current_action = {"name": "Effect", "description": bullet_match.group(1).strip(), "cost": 1}
        elif current_action:
            # Append continuation lines
            current_action["description"] += " " + clean_line
            
    if current_action: actions.append(current_action)
    return actions

def upload_monster(filepath):
    filename = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        post = frontmatter.load(f)
    
    content = post.content
    
    # --- IMPROVED STATBLOCK DETECTION ---
    # Find the FIRST occurrence of '> ##' (the statblock start)
    sb_start_match = re.search(r'>\s*##', content)
    if not sb_start_match:
        print(f"❌ Error: No statblock start found in {filename}")
        return

    # Lore is everything before the statblock
    lore = content[:sb_start_match.start()].strip()
    # The rest of the file is statblock + additional info
    statblock_and_beyond = content[sb_start_match.start():]

    # Stat Extraction (within the blockquote area)
    ac = re.search(r'\*\*AC\*\*\s*(\d+)', statblock_and_beyond)
    hp_full = re.search(r'\*\*HP\*\*\s*(.*?)(\*\*|\n)', statblock_and_beyond)
    speed = re.search(r'\*\*Speed\*\*\s*([^\n\r*]+)', statblock_and_beyond)
    init = re.search(r'\*\*Initiative\*\*\s*([+-]?\d+)', statblock_and_beyond)
    ab_v = [int(v) for v in re.findall(r'\|\s*(\d+)\s*\|', statblock_and_beyond)]

    stats_json = {
        "str": ab_v[0] if len(ab_v) > 0 else 10,
        "dex": ab_v[1] if len(ab_v) > 1 else 10,
        "con": ab_v[2] if len(ab_v) > 2 else 10,
        "int": ab_v[3] if len(ab_v) > 3 else 10,
        "wis": ab_v[4] if len(ab_v) > 4 else 10,
        "cha": ab_v[5] if len(ab_v) > 5 else 10,
        "ac": int(ac.group(1)) if ac else 0,
        "hp_str": hp_full.group(1).strip() if hp_full else "0",
        "speed": speed.group(1).strip() if speed else "",
        "initiative": int(init.group(1)) if init else 0
    }

    # Find where the blockquote truly ends (the first line that doesn't start with '>' after the stats)
    # This helps us separate "Statblock" from "Regional Effects/Tactics"
    sb_lines = statblock_and_beyond.split('\n')
    last_q_line = 0
    for i, line in enumerate(sb_lines):
        if line.strip().startswith('>'):
            last_q_line = i
    
    # Everything after the blockquote is additional_info
    additional_info = "\n".join(sb_lines[last_q_line+1:]).strip()
    # Clean up horizontal rules like ___
    additional_info = re.sub(r'^[_*-]{3,}\s*', '', additional_info).strip()

    monster_payload = {
        "slug": post.metadata.get('slug', filename.replace('.md', '').lower()),
        "name": post.metadata.get('title'),
        "cr": str(post.metadata.get('cr')),
        "type": post.metadata.get('type'),
        "size": post.metadata.get('size'),
        "alignment": post.metadata.get('alignment'),
        "category": post.metadata.get('category'),
        "creator": post.metadata.get('creator'),
        "image_url": post.metadata.get('image'),
        "image_creator": post.metadata.get('image_credit') or post.metadata.get('image_creator'),
        "description": lore,
        "additional_info": additional_info,
        "stats": stats_json,
        "status": "Approved"
    }

    try:
        res = supabase.table('monsters').upsert(monster_payload, on_conflict='slug').execute()
        m_id = res.data[0]['id']

        # Sync Actions
        supabase.table('monster_actions').delete().eq('monster_id', m_id).execute()
        
        cats = {
            "Traits": "trait", "Actions": "action", "Bonus Actions": "bonus", 
            "Reactions": "reaction", "Legendary Actions": "legendary", 
            "Lair Actions": "lair", "Regional Effects": "regional"
        }
        
        db_actions = []
        for header, db_cat in cats.items():
            found = extract_actions(statblock_and_beyond, header)
            for act in found:
                db_actions.append({
                    "monster_id": m_id, "category": db_cat,
                    "name": act['name'], "description": act['description'], "cost": act['cost']
                })
        
        if db_actions:
            supabase.table('monster_actions').insert(db_actions).execute()
            print(f"✅ {monster_payload['name']} (+{len(db_actions)} actions)")
        else:
            print(f"⚠️ {monster_payload['name']} (No actions found)")
            
    except Exception as e:
        print(f"❌ Failed {filename}: {e}")

if __name__ == "__main__":
    tools_dir = os.path.dirname(os.path.abspath(__file__))
    monsters_dir = os.path.join(os.path.dirname(tools_dir), "_monsters")
    for f in sorted(os.listdir(monsters_dir)):
        if f.endswith(".md"):
            upload_monster(os.path.join(monsters_dir, f))
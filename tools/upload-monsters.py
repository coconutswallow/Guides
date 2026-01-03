import os
import re
import uuid
import frontmatter 
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Dict, List, Any, Optional

# --- Configuration ---
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") 

MONSTERS_DIR = Path(__file__).parent.parent / "_monsters"

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"Error: Credentials not found in {env_path}")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Helper: User Management ---

def get_or_create_creator(discord_name: str) -> Optional[str]:
    """
    Finds a user by discord_name or creates a placeholder user in the 'users' table.
    """
    if not discord_name:
        discord_name = "Unknown"

    try:
        # 1. Check if exists
        res = supabase.table('users').select("id").eq("discord_name", discord_name).execute()
        if res.data:
            return res.data[0]['id']
        
        # 2. Create new if not found
        # Note: This ID generation assumes your Supabase 'users' table 
        # is NOT strictly bound to auth.users by a foreign key constraint.
        new_id = str(uuid.uuid4())
        
        user_payload = {
            "id": new_id,
            "discord_name": discord_name,
            "is_admin": False
        }
        
        supabase.table('users').insert(user_payload).execute()
        return new_id

    except Exception as e:
        print(f"  ! Warning: Could not link creator '{discord_name}': {e}")
        return None

# --- Helper: Math ---
def get_proficiency_bonus(cr_text: str) -> int:
    try:
        if '/' in str(cr_text):
            num, den = str(cr_text).split('/')
            val = float(num) / float(den)
        else:
            cleaned = re.sub(r'[^\d.]', '', str(cr_text))
            val = float(cleaned) if cleaned else 0
    except:
        val = 0
    
    if val < 5: return 2
    if val < 9: return 3
    if val < 13: return 4
    if val < 17: return 5
    if val < 21: return 6
    return 7

def deduce_initiative_proficiency(init_text: str, dex: int, cr_text: str) -> int:
    if not init_text: return 0
    match = re.search(r'([+-]\d+)', init_text)
    if not match: return 0
    
    total_mod = int(match.group(1))
    dex_mod = (dex - 10) // 2
    pb = get_proficiency_bonus(cr_text)
    
    if total_mod == dex_mod: return 0
    if total_mod == dex_mod + pb: return 1
    if total_mod == dex_mod + (pb * 2): return 2
    return 0

# --- The Parser Class ---
class MonsterParser:
    def parse(self, filepath: Path) -> Optional[Dict[str, Any]]:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            return None

        # 1. Frontmatter
        try:
            post = frontmatter.loads(content)
            fm = post.metadata
            body = post.content
        except Exception as e:
            print(f"Error parsing frontmatter: {e}")
            return None

        # 2. Lore
        lore_match = re.search(r'## [^\r\n]+[\r\n]+[\r\n]+([\s\S]*?)[\r\n]+___', body)
        description = lore_match.group(1).strip() if lore_match else ""

        # 3. Statblock Extraction (Matches JS logic)
        body_match = re.search(r'___[\s\S]*$', body)
        if body_match:
             stat_block, additional_info = self._split_stat_block_and_info(body_match.group(0))
        else:
            stat_block = body
            additional_info = ""

        # 4. Stats
        abilities = self._parse_ability_scores(stat_block)
        
        ac = self._parse_stat(stat_block, 'AC') or self._parse_stat(stat_block, 'Armor Class')
        hp = self._parse_stat(stat_block, 'HP') or self._parse_stat(stat_block, 'Hit Points')
        speed = self._parse_stat(stat_block, 'Speed')
        init_text = self._parse_stat(stat_block, 'Initiative')
        init_prof = deduce_initiative_proficiency(init_text, abilities.get('dex', 10), fm.get('cr', '0'))

        # 5. Features
        # Using more robust spacing regex (###\s*)
        traits = self._parse_ability_section(stat_block, 'Traits')
        
        # Fallback: If no explicit "Traits" section found, look for headerless traits
        # This is common in 5e statblocks (Traits appear between Challenge and Actions)
        if not traits:
            traits = self._parse_headerless_traits(stat_block)

        actions = self._parse_ability_section(stat_block, 'Actions')
        bonus_actions = self._parse_ability_section(stat_block, 'Bonus Actions')
        reactions = self._parse_ability_section(stat_block, 'Reactions')
        
        legendary_data = self._parse_legendary_actions(stat_block)
        
        lair_actions = self._parse_text_block(stat_block, 'Lair Actions')
        regional_effects = self._parse_text_block(stat_block, 'Regional Effects')

        # Slug Generation
        slug = fm.get('slug')
        if not slug:
            name = fm.get('title', 'unknown')
            slug = re.sub(r'[^a-z0-9]+', '-', name.strip().lower())[:60]

        monster = {
            "slug": slug,
            "name": fm.get('title', 'Unknown'),
            "is_live": True, 
            "status": 'Approved',
            "image_url": fm.get('image', None),
            # Retrieve Creator from frontmatter, default to Unknown
            "creator_name": fm.get('creator', 'Unknown'), 
            "cr": str(fm.get('cr', '')),
            "type": fm.get('type', 'Unknown'),
            "size": fm.get('size', 'Medium'),
            "alignment": fm.get('alignment', 'Unaligned'),
            "tags": [x.strip() for x in str(fm.get('tags', '')).split(',')] if fm.get('tags') else [],
            "description": description,
            "additional_info": additional_info,
            "stats_json": {
                "str": abilities['str'], "dex": abilities['dex'], "con": abilities['con'],
                "int": abilities['int'], "wis": abilities['wis'], "cha": abilities['cha'],
                "ac": ac, "hp": hp, "speed": speed,
                "saves": self._parse_saving_throws(stat_block),
                "skills": self._parse_stat(stat_block, 'Skills'),
                "senses": self._parse_stat(stat_block, 'Senses'),
                "languages": self._parse_stat(stat_block, 'Languages'),
                "damage_vulnerabilities": self._parse_stat(stat_block, 'Damage Vulnerabilities'),
                "damage_resistances": self._parse_stat(stat_block, 'Damage Resistances'),
                "damage_immunities": self._parse_stat(stat_block, 'Damage Immunities'),
                "condition_immunities": self._parse_stat(stat_block, 'Condition Immunities'),
                "initiative_text": init_text,
                "initiative_proficiency": init_prof
            },
            "_features_data": {
                "Trait": traits,
                "Action": actions,
                "Bonus": bonus_actions,
                "Reaction": reactions,
                "Legendary": legendary_data['actions'],
                "Lair": [{"name": "Lair Actions", "description": lair_actions}] if lair_actions else [],
                "Regional": [{"name": "Regional Effects", "description": regional_effects}] if regional_effects else []
            }
        }
        
        return monster

    def _split_stat_block_and_info(self, full_body):
        """
        Exact Python port of JS splitStatBlockAndInfo
        """
        lines = full_body.split('\n')
        stat_block_lines = []
        additional_info_lines = []
        divider_count = 0
        is_done_with_block = False

        for line in lines:
            trimmed = line.strip()
            if trimmed == '___':
                divider_count += 1
                if divider_count >= 2:
                    is_done_with_block = True
                continue
            
            # JS Logic: if we are past the first divider, and the line NO LONGER 
            # starts with '>', then the blockquoted statblock has ended.
            if divider_count == 1 and not line.startswith('>') and trimmed != '':
                is_done_with_block = True
            
            if is_done_with_block:
                additional_info_lines.append(line)
            elif divider_count == 1:
                stat_block_lines.append(line)
        
        clean = '\n'.join(stat_block_lines)
        clean = re.sub(r'^>\s*', '', clean, flags=re.MULTILINE) # Remove '>'
        return clean, '\n'.join(additional_info_lines).strip()

    def _parse_ability_scores(self, block):
        scores = {k: 10 for k in ['str','dex','con','int','wis','cha']}
        
        # Extended Match
        p1 = r'\|\s*\*\*Str\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Dex\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Con\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Int\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Wis\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Cha\*\*\s*\|\s*(\d+)\s*\|'
        m1 = re.search(p1, block, re.IGNORECASE)
        if m1: return {k: int(v) for k, v in zip(['str','dex','con','int','wis','cha'], m1.groups())}
        
        # Simple Match
        p2 = r'\|\s*STR\s*\|\s*DEX\s*\|\s*CON\s*\|\s*INT\s*\|\s*WIS\s*\|\s*CHA\s*\|[\s\S]*?\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|'
        m2 = re.search(p2, block, re.IGNORECASE)
        if m2: return {k: int(v) for k, v in zip(['str','dex','con','int','wis','cha'], m2.groups())}
        return scores

    def _parse_stat(self, block, name):
        pattern = rf'\*\*{name}\*\*\s+([\s\S]+?)(?=\s*\*\*|\n|\s*\||$)'
        match = re.search(pattern, block)
        return match.group(1).strip() if match else ""

    def _parse_saving_throws(self, block):
        saves = {}
        match = re.search(r'\*\*Saving Throws\*\*\s+(.+)', block)
        if not match: return saves
        text = match.group(1)
        for ability in ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']:
            sub_match = re.search(rf'{ability}\s+([+\-]\d+)', text, re.IGNORECASE)
            if sub_match: saves[f"{ability.lower()}Save"] = sub_match.group(1)
        return saves

    def _parse_ability_section(self, block, section_name):
        abilities = []
        # Robust Header: matches "### Actions" or "###  Actions"
        section_pattern = rf'###\s*{section_name}\s*\n+([\s\S]*?)(?=\n\s*###|$)'
        match = re.search(section_pattern, block)
        if not match: return abilities
        
        content = match.group(1)
        return self._extract_features_from_text(content)

    def _parse_headerless_traits(self, block):
        """
        Fallback: Extracts traits that appear before the first ### Header.
        Standard 5e format: Challenge ... \n\n ***Trait.***
        """
        # Find start of first explicit section
        first_header = re.search(r'\n\s*###', block)
        if not first_header: return [] # If no headers at all, maybe return nothing or everything?
        
        pre_content = block[:first_header.start()]
        
        # We need to skip the "Top Stats" (AC, HP, Speed, Attributes, Skills, etc)
        # Strategy: Look for the Challenge/Proficiency line, then start parsing features after it.
        # This is heuristics based but covers 95% of standard layouts.
        challenge_match = re.search(r'\*\*Challenge\*\*[\s\S]*?\n', pre_content)
        if challenge_match:
            traits_content = pre_content[challenge_match.end():]
            return self._extract_features_from_text(traits_content)
        
        return []

    def _extract_features_from_text(self, content):
        abilities = []
        # Robust Item Regex:
        # (?:\n|^)      -> Start of line
        # \s* -> Indent
        # \*\*+         -> Matches ** or *** (Bold/Italic)
        # ([^\*]+?)     -> Group 1: Name
        # \.?           -> Optional dot inside bold
        # \*\*+         -> Closing bold
        # \.?           -> Optional dot outside bold
        # \s* -> Spacing
        # ([\s\S]*?)    -> Group 2: Description
        # (?= ... )     -> Lookahead for next item or section end
        item_pattern = r'(?:\n|^)\s*\*\*+([^\*]+?)\.?\*\*+\.?\s*([\s\S]*?)(?=\n\s*\*\*+|\n\s*###|$)'
        
        for item in re.finditer(item_pattern, content):
            abilities.append({
                "name": item.group(1).strip(),
                "description": item.group(2).strip()
            })
        return abilities

    def _parse_legendary_actions(self, block):
        result = {'description': '', 'actions': []}
        match = re.search(r'###\s*Legendary Actions\s*\n+([\s\S]*?)(?=\n\s*###|$)', block)
        if not match: return result
        
        content = match.group(1)
        
        # JS logic: Description is everything before the first bold item
        desc_match = re.search(r'^([\s\S]*?)(?=\n+\s*\*\*)', content)
        if desc_match:
            result['description'] = desc_match.group(1).strip()
            content = content[len(desc_match.group(0)):]
            
        result['actions'] = self._extract_features_from_text(content)
        return result

    def _parse_text_block(self, block, section_name):
        pattern = rf'###\s*{section_name}\s*\n+([\s\S]*?)(?=\n\s*###|$)'
        match = re.search(pattern, block)
        return match.group(1).strip() if match else ""

# --- Upload Logic ---

def upload_monster(data: Dict[str, Any]):
    print(f"Uploading {data['name']}...")
    
    # 1. Handle Creator
    creator_id = get_or_create_creator(data.pop('creator_name', None))
    
    monster_payload = {k: v for k, v in data.items() if k != '_features_data'}
    if creator_id:
        monster_payload['creator_id'] = creator_id
    
    try:
        # Upsert Monster
        existing = supabase.table('monsters').select("row_id").eq("slug", data['slug']).execute()
        
        if existing.data:
            row_id = existing.data[0]['row_id']
            supabase.table('monster_features').delete().eq("parent_row_id", row_id).execute()
            supabase.table('monsters').update(monster_payload).eq("row_id", row_id).execute()
            print(f"  -> Updated Monster (ID: {row_id})")
        else:
            res = supabase.table('monsters').insert(monster_payload).execute()
            row_id = res.data[0]['row_id']
            print(f"  -> Created Monster (ID: {row_id})")

        # 2. Insert Features
        features_data = data['_features_data']
        feature_payloads = []
        total_feats = 0
        
        type_map = {
            "Trait": "Trait", "Action": "Action", "Bonus Actions": "Bonus", 
            "Bonus": "Bonus", "Reaction": "Reaction", "Legendary": "Legendary", 
            "Lair": "Lair", "Regional": "Regional"
        }

        display_order = 0
        for category, items in features_data.items():
            db_type = type_map.get(category, "Trait")
            for item in items:
                total_feats += 1
                feature_payloads.append({
                    "parent_row_id": row_id,
                    "name": item['name'],
                    "description": item['description'],
                    "type": db_type,
                    "display_order": display_order
                })
                display_order += 1
        
        if feature_payloads:
            supabase.table('monster_features').insert(feature_payloads).execute()
            
        print(f"  -> Features synced: {total_feats}")

    except Exception as e:
        print(f"FAILED to upload {data['name']}: {e}")

# --- Main ---

def main():
    if not MONSTERS_DIR.exists():
        print(f"Monsters directory not found: {MONSTERS_DIR}")
        return

    parser = MonsterParser()
    md_files = list(MONSTERS_DIR.glob("*.md"))
    
    print(f"Found {len(md_files)} monster files. Starting processing...")
    
    for filepath in md_files:
        monster_data = parser.parse(filepath)
        if monster_data:
            upload_monster(monster_data)
        else:
            print(f"Skipping {filepath.name} due to parse error.")

if __name__ == "__main__":
    main()
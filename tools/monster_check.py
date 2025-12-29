import os
import re
import frontmatter
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Dict, Any, Optional

class MonsterValidator(BaseModel):
    model_config = ConfigDict(coerce_numbers_to_str=True)

    title: str
    cr: str
    size: str
    alignment: str
    type: str
    category: str
    creator: str
    ac: int
    hp: str
    speed: str
    initiative_bonus: int
    stats: Dict[str, int]
    description: str
    actions: List[str] = Field(..., min_length=1)
    additional_info: Optional[str] = ""

    @field_validator('cr', mode='before')
    @classmethod
    def ensure_string(cls, v):
        return str(v)

def run_validation():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(current_dir)
    monsters_dir = os.path.join(root_dir, "_monsters")
    
    print(f"DEBUG: Scanning {monsters_dir}")
    all_files = [f for f in os.listdir(monsters_dir) if f.lower().endswith(".md")]
    
    passed = 0
    failed = 0

    for filename in all_files:
        path = os.path.join(monsters_dir, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
            
            content = post.content
            
            # 1. SPLIT LORE FROM STATBLOCK (Handle ___, ---, ***)
            parts = re.split(r'\n(?:[_*-]{3,})\n', content, maxsplit=1)
            if len(parts) < 2:
                if "> ##" in content:
                    lore, rest = content.split("> ##", 1)
                    statblock_and_bottom = "> ##" + rest
                else:
                    # If strictly no separator, assume empty description for now to pass validation
                    # (Or set lore = "No description provided")
                    lore = "Description Pending" 
                    statblock_and_bottom = content
            else:
                lore = parts[0].strip()
                statblock_and_bottom = parts[1]

            # 2. ROBUST REGEX (Ignores > characters in lookaheads)
            # Looks for **Label** value... until next **Label** or End of Line
            ac_m = re.search(r'\*\*AC\*\*\s*(\d+)', statblock_and_bottom)
            hp_m = re.search(r'\*\*HP\*\*\s*(\d+\s*\(.*?\))', statblock_and_bottom)
            
            # FIXED: Speed regex now stops at newline OR next bold, ignoring > chars
            sp_m = re.search(r'\*\*Speed\*\*\s*([^\n\r*]+)', statblock_and_bottom)
            
            # FIXED: Initiative regex captures +X or +X (Tier)
            in_m = re.search(r'\*\*Initiative\*\*\s*([+-]?\d+)', statblock_and_bottom)
            
            # Ability Scores
            ab_v = [int(v) for v in re.findall(r'\|\s*(\d+)\s*\|', statblock_and_bottom)]
            ab_map = {k: ab_v[i] for i, k in enumerate(['str','dex','con','int','wis','cha'])} if len(ab_v) >= 6 else {}

            action_list = re.findall(r'###\s+(?:Actions|Traits|Legendary|Regional|Lair)', statblock_and_bottom, re.I)

            data = {
                **post.metadata,
                "ac": int(ac_m.group(1)) if ac_m else None,
                "hp": hp_m.group(1) if hp_m else None,
                "speed": sp_m.group(1).strip() if sp_m else None,
                "initiative_bonus": int(in_m.group(1)) if in_m else None,
                "stats": ab_map,
                "description": lore,
                "actions": action_list,
                "additional_info": "" 
            }

            MonsterValidator(**data)
            print(f"✅ {filename}")
            passed += 1
        except Exception as e:
            # Shorten error for readability
            print(f"❌ {filename}: {str(e).split('[')[0]}")
            failed += 1

    print(f"\nSummary: {passed} passed, {failed} failed.")

if __name__ == "__main__":
    run_validation()
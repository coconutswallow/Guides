#!/usr/bin/env python3
"""
D&D 5e Monster Stat Block Validator

Validates monster markdown files by checking:
- Ability score modifiers
- Proficiency bonus based on CR
- Saving throw calculations
- Consistency between stated and calculated values
"""

import re
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ValidationIssue:
    """Represents a validation issue found in a monster stat block"""
    severity: str  # 'error' or 'warning'
    category: str
    message: str
    expected: Optional[str] = None
    actual: Optional[str] = None


@dataclass
class MonsterData:
    """Parsed monster data from markdown"""
    name: str
    cr: str
    str_score: int = 10
    dex_score: int = 10
    con_score: int = 10
    int_score: int = 10
    wis_score: int = 10
    cha_score: int = 10
    
    # Parsed saving throws from stat block
    str_save: Optional[str] = None
    dex_save: Optional[str] = None
    con_save: Optional[str] = None
    int_save: Optional[str] = None
    wis_save: Optional[str] = None
    cha_save: Optional[str] = None
    
    issues: List[ValidationIssue] = field(default_factory=list)


class MonsterValidator:
    """Validates D&D 5e monster stat blocks"""
    
    @staticmethod
    def calculate_modifier(score: int) -> int:
        """Calculate ability modifier from ability score"""
        return math.floor((score - 10) / 2)
    
    @staticmethod
    def format_modifier(modifier: int) -> str:
        """Format modifier with + or - sign"""
        return f"+{modifier}" if modifier >= 0 else str(modifier)
    
    @staticmethod
    def get_proficiency_bonus(cr: str) -> int:
        """Get proficiency bonus based on Challenge Rating"""
        try:
            cr_clean = cr.strip().replace(' ', '')
            
            # Handle fractions
            if '/' in cr_clean:
                parts = cr_clean.split('/')
                if len(parts) == 2:
                    cr_num = float(parts[0]) / float(parts[1])
                else:
                    cr_num = 0
            else:
                cr_num = float(cr_clean)
        except (ValueError, ZeroDivisionError):
            cr_num = 0
        
        if cr_num < 5:
            return 2
        elif cr_num < 9:
            return 3
        elif cr_num < 13:
            return 4
        elif cr_num < 17:
            return 5
        elif cr_num < 21:
            return 6
        elif cr_num < 25:
            return 7
        elif cr_num < 29:
            return 8
        else:
            return 9
    
    @staticmethod
    def parse_frontmatter(content: str) -> Dict[str, str]:
        """Parse YAML frontmatter"""
        match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
        if not match:
            return {}
        
        frontmatter = {}
        for line in match.group(1).split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                frontmatter[key.strip()] = value.strip().strip('"\'')
        
        return frontmatter
    
    @staticmethod
    def parse_ability_scores(content: str) -> Dict[str, int]:
        """Parse ability scores from stat block"""
        # Try to find the ability score table
        # Pattern: |Str| 16| +3 | +3 |Dex| 10| +0 | +0 |...
        pattern = r'\|Str\|\s*(\d+)\|.*?\|Dex\|\s*(\d+)\|.*?\|Con\|\s*(\d+)\|.*?\|Int\|\s*(\d+)\|.*?\|Wis\|\s*(\d+)\|.*?\|Cha\|\s*(\d+)\|'
        match = re.search(pattern, content, re.IGNORECASE)
        
        if match:
            return {
                'str': int(match.group(1)),
                'dex': int(match.group(2)),
                'con': int(match.group(3)),
                'int': int(match.group(4)),
                'wis': int(match.group(5)),
                'cha': int(match.group(6))
            }
        
        # Default to 10 if not found
        return {'str': 10, 'dex': 10, 'con': 10, 'int': 10, 'wis': 10, 'cha': 10}
    
    @staticmethod
    def parse_modifiers_from_table(content: str) -> Dict[str, str]:
        """Parse the MOD column from the ability table"""
        modifiers = {}
        
        # Find the ability score table and extract MOD values
        # Pattern looks for: |Str| 16| +3 | +3 |
        abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha']
        
        for ability in abilities:
            # Pattern: |Ability| score| modifier | save |
            pattern = rf'\|{ability.capitalize()}\|\s*\d+\|\s*([+\-]\d+)\s*\|'
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                modifiers[ability] = match.group(1)
        
        return modifiers
    
    @staticmethod
    def parse_saves_from_table(content: str) -> Dict[str, str]:
        """Parse the SAVE column from the ability table ONLY (not the Saving Throws line)"""
        saves = {}
        
        # Find the ability score table rows
        # Row 1: | **Str** | 21 | +5 | +9 | **Dex** | 12 | +1 | +5 | **Con** | 20 | +5 | +9 |
        # Row 2: | **Int** | 14 | +2 | +6 | **Wis** | 16 | +3 | +7 | **Cha** | 21 | +5 | +9 |
        
        # Pattern to match the full table structure
        # This captures each ability's score, mod, and save in order
        table_pattern = r'\|\s*\*\*Str\*\*\s*\|\s*(\d+)\s*\|\s*([+\-]\d+)\s*\|\s*([+\-]\d+)\s*\|\s*\*\*Dex\*\*\s*\|\s*(\d+)\s*\|\s*([+\-]\d+)\s*\|\s*([+\-]\d+)\s*\|\s*\*\*Con\*\*\s*\|\s*(\d+)\s*\|\s*([+\-]\d+)\s*\|\s*([+\-]\d+)\s*\|.*?\|\s*\*\*Int\*\*\s*\|\s*(\d+)\s*\|\s*([+\-]\d+)\s*\|\s*([+\-]\d+)\s*\|\s*\*\*Wis\*\*\s*\|\s*(\d+)\s*\|\s*([+\-]\d+)\s*\|\s*([+\-]\d+)\s*\|\s*\*\*Cha\*\*\s*\|\s*(\d+)\s*\|\s*([+\-]\d+)\s*\|\s*([+\-]\d+)\s*\|'
        
        match = re.search(table_pattern, content, re.IGNORECASE | re.DOTALL)
        if match:
            # Group indices: Str(1,2,3), Dex(4,5,6), Con(7,8,9), Int(10,11,12), Wis(13,14,15), Cha(16,17,18)
            # The SAVE is the 3rd value (3, 6, 9, 12, 15, 18)
            saves['str_save'] = match.group(3)
            saves['dex_save'] = match.group(6)
            saves['con_save'] = match.group(9)
            saves['int_save'] = match.group(12)
            saves['wis_save'] = match.group(15)
            saves['cha_save'] = match.group(18)
        
        return saves
    
    @staticmethod
    def parse_saving_throws_line(content: str) -> Dict[str, str]:
        """Parse Saving Throws line (e.g., 'Saving Throws Int +6, Wis +7')"""
        saves = {}
        
        match = re.search(r'\*\*Saving Throws\*\*\s+(.+?)(?=\n|\*\*|$)', content)
        if not match:
            return saves
        
        save_text = match.group(1)
        
        for ability in ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']:
            pattern = rf'{ability}\s+([+\-]\d+)'
            ability_match = re.search(pattern, save_text, re.IGNORECASE)
            if ability_match:
                saves[f'{ability.lower()}_save'] = ability_match.group(1)
        
        return saves
    
    def parse_monster(self, filepath: Path) -> Optional[MonsterData]:
        """Parse a monster markdown file"""
        try:
            content = filepath.read_text(encoding='utf-8')
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            return None
        
        frontmatter = self.parse_frontmatter(content)
        
        monster = MonsterData(
            name=frontmatter.get('title', filepath.stem),
            cr=frontmatter.get('cr', '0')
        )
        
        # Parse ability scores
        scores = self.parse_ability_scores(content)
        monster.str_score = scores['str']
        monster.dex_score = scores['dex']
        monster.con_score = scores['con']
        monster.int_score = scores['int']
        monster.wis_score = scores['wis']
        monster.cha_score = scores['cha']
        
        # Parse saves from both table and Saving Throws line
        table_saves = self.parse_saves_from_table(content)
        line_saves = self.parse_saving_throws_line(content)
        
        # IMPORTANT: Use ONLY table saves, ignore the Saving Throws line completely
        # The table is the source of truth
        all_saves = table_saves
        
        monster.str_save = all_saves.get('str_save')
        monster.dex_save = all_saves.get('dex_save')
        monster.con_save = all_saves.get('con_save')
        monster.int_save = all_saves.get('int_save')
        monster.wis_save = all_saves.get('wis_save')
        monster.cha_save = all_saves.get('cha_save')
        
        return monster
    
    def validate_monster(self, monster: MonsterData) -> List[ValidationIssue]:
        """Validate all calculations for a monster"""
        issues = []
        
        proficiency = self.get_proficiency_bonus(monster.cr)
        
        abilities = {
            'Str': ('str_score', 'str_save'),
            'Dex': ('dex_score', 'dex_save'),
            'Con': ('con_score', 'con_save'),
            'Int': ('int_score', 'int_save'),
            'Wis': ('wis_score', 'wis_save'),
            'Cha': ('cha_score', 'cha_save')
        }
        
        for ability_name, (score_attr, save_attr) in abilities.items():
            score = getattr(monster, score_attr)
            stated_save = getattr(monster, save_attr)
            
            if not stated_save:
                continue
            
            # Calculate expected modifier
            expected_mod = self.calculate_modifier(score)
            
            # Parse the stated save value
            try:
                stated_value = int(stated_save.strip())
            except ValueError:
                issues.append(ValidationIssue(
                    severity='error',
                    category='save_format',
                    message=f"{ability_name} save has invalid format: {stated_save}"
                ))
                continue
            
            # Always calculate as: modifier + proficiency (ignore overrides)
            expected_save = expected_mod + proficiency
            expected_save_str = self.format_modifier(expected_save)
            
            # Check if it matches
            if stated_save.strip() != expected_save_str:
                issues.append(ValidationIssue(
                    severity='error',
                    category='save_calculation',
                    message=f"{ability_name} save incorrect",
                    expected=expected_save_str,
                    actual=stated_save
                ))
        
        return issues
    
    def validate_file(self, filepath: Path) -> Tuple[str, List[ValidationIssue]]:
        """Validate a single monster file"""
        monster = self.parse_monster(filepath)
        
        if not monster:
            return filepath.name, [ValidationIssue(
                severity='error',
                category='parsing',
                message='Failed to parse monster file'
            )]
        
        issues = self.validate_monster(monster)
        return monster.name, issues
    
    def validate_folder(self, folder_path: Path, recursive: bool = False) -> Dict[str, List[ValidationIssue]]:
        """Validate all monster markdown files in a folder"""
        results = {}
        
        pattern = '**/*.md' if recursive else '*.md'
        
        for filepath in sorted(folder_path.glob(pattern)):
            monster_name, issues = self.validate_file(filepath)
            if issues:
                results[monster_name] = issues
        
        return results
    
    def fix_monster_file(self, filepath: Path, debug: bool = False) -> bool:
        """Fix calculation errors in a monster file"""
        try:
            content = filepath.read_text(encoding='utf-8')
            original_content = content
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            return False
        
        monster = self.parse_monster(filepath)
        if not monster:
            return False
        
        issues = self.validate_monster(monster)
        if not issues:
            return False  # Nothing to fix
        
        proficiency = self.get_proficiency_bonus(monster.cr)
        
        # Process each ability
        # Always calculate as: modifier + proficiency (ignore any overrides)
        abilities = {
            'Str': 'str_score',
            'Dex': 'dex_score',
            'Con': 'con_score',
            'Int': 'int_score',
            'Wis': 'wis_score',
            'Cha': 'cha_score'
        }
        
        saves_to_fix = {}
        
        for ability_name, score_attr in abilities.items():
            score = getattr(monster, score_attr)
            expected_mod = self.calculate_modifier(score)
            
            # Always calculate: modifier + proficiency (ignore overrides)
            correct_save = self.format_modifier(expected_mod + proficiency)
            saves_to_fix[ability_name] = correct_save
        
        # Fix the ability table
        # The format has 3 abilities per row:
        # > | **Str** | 21 | +5 | +7 | **Dex** | 12 | +1 | +3 | **Con** | 20 | +5 | +7 |
        # We need to match each ability individually within the row
        
        replacements_made = 0
        for ability_name, correct_save in saves_to_fix.items():
            # Pattern matches: | **Ability** | score | mod | save |
            # With optional spaces and captures the save value
            pattern = rf'(\|\s*\*\*{ability_name}\*\*\s*\|\s*\d+\s*\|\s*[+\-]\d+\s*\|\s*)[+\-]\d+(\s*\|)'
            
            new_content, count = re.subn(pattern, rf'\g<1>{correct_save}\g<2>', content, flags=re.IGNORECASE | re.MULTILINE)
            
            if count > 0:
                replacements_made += count
                content = new_content
                if debug:
                    print(f"  Fixed {ability_name}: {count} replacement(s) -> {correct_save}")
        
        if debug and replacements_made == 0:
            print(f"  Warning: No replacements made for {monster.name}")
        
        # Only write if content changed
        if content != original_content:
            try:
                filepath.write_text(content, encoding='utf-8')
                return True
            except Exception as e:
                print(f"Error writing {filepath}: {e}")
                return False
        
        return False
    
    def fix_folder(self, folder_path: Path, recursive: bool = False) -> Dict[str, bool]:
        """Fix calculation errors in all monster files in a folder"""
        results = {}
        
        pattern = '**/*.md' if recursive else '*.md'
        
        for filepath in sorted(folder_path.glob(pattern)):
            monster = self.parse_monster(filepath)
            if not monster:
                continue
            
            issues = self.validate_monster(monster)
            if issues:
                fixed = self.fix_monster_file(filepath)
                results[monster.name] = fixed
        
        return results


def print_validation_report(results: Dict[str, List[ValidationIssue]]):
    """Print a formatted validation report"""
    total_monsters = len(results)
    total_issues = sum(len(issues) for issues in results.values())
    
    print("=" * 70)
    print("D&D 5e Monster Stat Block Validation Report")
    print("=" * 70)
    print()
    
    if not results:
        print("✓ All monsters validated successfully!")
        return
    
    print(f"Found issues in {total_monsters} monster(s)")
    print(f"Total issues: {total_issues}")
    print()
    
    for monster_name, issues in results.items():
        print(f"\n{monster_name}")
        print("-" * 70)
        
        for issue in issues:
            severity_marker = "❌" if issue.severity == 'error' else "⚠️"
            print(f"{severity_marker} [{issue.category}] {issue.message}")
            
            if issue.expected and issue.actual:
                print(f"   Expected: {issue.expected}")
                print(f"   Actual:   {issue.actual}")
        
        print()


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Validate D&D 5e monster stat blocks'
    )
    parser.add_argument(
        'folder',
        type=Path,
        nargs='?',  # Make folder optional
        help='Folder containing monster markdown files (default: ../_monsters)'
    )
    parser.add_argument(
        '-r', '--recursive',
        action='store_true',
        help='Search recursively in subfolders'
    )
    parser.add_argument(
        '-f', '--fix',
        action='store_true',
        help='Automatically fix calculation errors in monster files'
    )
    
    args = parser.parse_args()
    
    # Determine the monsters folder
    if args.folder:
        monsters_folder = args.folder
    else:
        # Default: assume script is in /tools and monsters are in /_monsters
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        monsters_folder = project_root / '_monsters'
    
    if not monsters_folder.exists():
        print(f"Error: Monsters folder '{monsters_folder}' does not exist")
        print(f"Expected folder at: {monsters_folder.absolute()}")
        return 1
    
    if not monsters_folder.is_dir():
        print(f"Error: '{monsters_folder}' is not a directory")
        return 1
    
    print(f"Validating monsters in: {monsters_folder.absolute()}")
    print()
    
    validator = MonsterValidator()
    
    if args.fix:
        # Fix mode
        print("🔧 FIX MODE: Correcting calculation errors...\n")
        fix_results = validator.fix_folder(monsters_folder, args.recursive)
        
        if not fix_results:
            print("✓ No monsters needed fixing!")
            return 0
        
        fixed_count = sum(1 for fixed in fix_results.values() if fixed)
        print(f"Fixed {fixed_count} monster(s):")
        for monster_name, fixed in fix_results.items():
            status = "✓ Fixed" if fixed else "⚠ Could not fix"
            print(f"  {status}: {monster_name}")
        
        print("\nRe-validating to confirm fixes...")
        results = validator.validate_folder(monsters_folder, args.recursive)
        
        if results:
            print("\n⚠ Some issues remain:")
            print_validation_report(results)
            return 1
        else:
            print("\n✓ All issues resolved!")
            return 0
    else:
        # Validation only mode
        results = validator.validate_folder(monsters_folder, args.recursive)
        print_validation_report(results)
        
        if results:
            print("\nTip: Run with --fix flag to automatically correct these issues")
        
        return 1 if results else 0


if __name__ == '__main__':
    exit(main())
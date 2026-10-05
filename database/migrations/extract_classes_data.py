#!/usr/bin/env python3
"""
ETL Data Extractor v2 for AC Classes and Subclasses
Parses names and embedded sources in brackets from /workspace/git/AC/Allowed_Content_20261004.xlsx,
maps sources against ac_sources keys, attaches external links from AC_SubClass.xlsx,
and preserves Rage Advice / notes.
"""

import sys
import json
import re
import zipfile
import xml.etree.ElementTree as ET
import openpyxl

def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower()) if s else ''

# Source key alias / normalization dictionary
SOURCE_ALIASES = {
    'PHB 2014': 'PHB2014',
    'PHB 2024': 'PHB2024',
    'HWCS 2024': 'HWCS_2024',
    'DMG': 'DMG2014',
    'DMG 2014': 'DMG2014',
    'DMG 2024': 'DMG2024',
    'DDB': 'BH2022',
    'Spiketail.Drake': 'W4ESD',
    'VSS:PP': 'VSS_PP',
    'UA': 'UAMy'
}

def parse_bracket_name_source(raw_text):
    if not raw_text:
        return '', None
    raw = raw_text.strip()
    
    # 1. Standard: Name (SOURCE) or Name [SOURCE]
    m = re.search(r'^(.*?)\s*[\(\[]([^\)\]]+)[\)\]]\s*$', raw)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    
    # 2. Typos like 'Storm Herald XGE)'
    m2 = re.search(r'^(.*?)\s+([A-Za-z0-9_:\-]+)\)\s*$', raw)
    if m2:
        return m2.group(1).strip(), m2.group(2).strip()
    
    return raw, None

def resolve_source(raw_source, valid_source_keys):
    if not raw_source:
        return None
    trimmed = raw_source.strip()
    if trimmed in SOURCE_ALIASES:
        return SOURCE_ALIASES[trimmed]
    if trimmed in valid_source_keys:
        return trimmed

    no_space = trimmed.replace(' ', '')
    if no_space in valid_source_keys:
        return no_space

    underscore = trimmed.replace(' ', '_')
    if underscore in valid_source_keys:
        return underscore

    # Multi-source split (/, &, comma, 'or')
    parts = re.split(r'\s*(?:\/|&|,|\bor\b)\s*', trimmed)
    resolved_parts = []
    for p in parts:
        p_clean = p.strip()
        if p_clean in SOURCE_ALIASES:
            resolved_parts.append(SOURCE_ALIASES[p_clean])
        elif p_clean in valid_source_keys:
            resolved_parts.append(p_clean)
        elif p_clean.replace(' ', '') in valid_source_keys:
            resolved_parts.append(p_clean.replace(' ', ''))
        elif p_clean.replace(' ', '_') in valid_source_keys:
            resolved_parts.append(p_clean.replace(' ', '_'))
        else:
            return None

    return ', '.join(resolved_parts)

def main():
    # 1. Load valid source keys from /tmp/valid_sources.json (passed from node) or fallback
    valid_source_keys = set()
    try:
        with open('/tmp/valid_sources.json') as f:
            valid_source_keys = set(json.load(f))
    except Exception:
        pass

    # 2. Load links and existing notes from AC_SubClass.xlsx
    links_by_name = {}
    wb_sub = openpyxl.load_workbook('.context/current-tasks/AC_SubClass.xlsx', data_only=True)
    for r in list(wb_sub['Data'].iter_rows(values_only=True))[1:]:
        if not any(r): continue
        sid, cid, ver, name, src, link, eng_notes = r[:7]
        if name:
            clean_s = name.strip()
            v_str = str(int(ver)) if ver else '2014'
            if link:
                links_by_name[(norm(clean_s), v_str)] = link.strip()
                links_by_name[norm(clean_s)] = link.strip()

    # 3. Read master spreadsheet Allowed_Content_20261004.xlsx
    master_path = '/workspace/git/AC/Allowed_Content_20261004.xlsx'
    with zipfile.ZipFile(master_path) as z:
        shared_strings = []
        for si in ET.parse(z.open('xl/sharedStrings.xml')).getroot().iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            shared_strings.append(''.join(t.text for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text))

        styles_root = ET.parse(z.open('xl/styles.xml')).getroot()
        fills = []
        for fill in styles_root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}fill'):
            pat = fill.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}patternFill')
            if pat is not None:
                fg = pat.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}fgColor')
                fills.append(fg.attrib.get('rgb', '') if fg is not None else '')
            else:
                fills.append('')

        cell_xfs = [int(xf.attrib.get('fillId', 0)) for xf in styles_root.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}cellXfs').iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}xf')]
        sheet_root = ET.parse(z.open('xl/worksheets/sheet3.xml')).getroot()

        classes = []
        subclasses = []
        current_class = None
        class_order = 10.0
        subclass_order = 10.0

        for row in sheet_root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            r_num = int(row.attrib.get('r', 0))
            if r_num <= 4: continue
            cells = {}
            for c in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                ref = c.attrib['r']
                col = ''.join(ch for ch in ref if ch.isalpha())
                style_idx = int(c.attrib.get('s', 0))
                fill_id = cell_xfs[style_idx] if style_idx < len(cell_xfs) else 0
                color = fills[fill_id] if fill_id < len(fills) else ''
                t = c.attrib.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = shared_strings[int(v.text)] if v is not None and v.text is not None and t == 's' else (v.text if v is not None else None)
                cells[col] = (val, color)

            c_val, c_col = cells.get('A', (None, ''))
            s_val, s_col = cells.get('B', (None, ''))
            hit_die, _ = cells.get('C', (None, ''))
            mc, _ = cells.get('D', (None, ''))
            exp_opt, _ = cells.get('E', (None, ''))
            advice, _ = cells.get('K', (None, ''))
            check_id, _ = cells.get('L', (None, ''))

            # Check if this row is a Base Class
            if c_val and c_val != '(choose one)':
                clean_c_name, raw_c_src = parse_bracket_name_source(c_val)
                # Determine ruleset (EFA is 2024)
                c_ruleset = '2024' if ('2024' in c_val or 'EFA' in c_val) else '2014'
                resolved_c_src = resolve_source(raw_c_src, valid_source_keys) or ('PHB2024' if c_ruleset == '2024' else 'PHB2014')

                current_class = {
                    'class_idx': len(classes),
                    'name': clean_c_name,
                    'raw_name': c_val.strip(),
                    'ruleset': c_ruleset,
                    'category': 'Official',
                    'source': resolved_c_src,
                    'hit_die': hit_die.strip() if hit_die else None,
                    'multiclassing': mc.strip() if mc else None,
                    'expanded_options': exp_opt.strip() if exp_opt else None,
                    'notes_advice': advice.strip() if advice else None,
                    'display_order': class_order
                }
                classes.append(current_class)
                class_order += 10.0
                subclass_order = 10.0

            # Check if this row is a Subclass
            if s_val and s_val != '(choose one)' and current_class:
                clean_s_name, raw_s_src = parse_bracket_name_source(s_val)
                s_ruleset = current_class['ruleset']

                # Special handling for Ranger & Revised Ranger shared subclasses
                target_classes = [current_class]
                is_dual_ranger = ('Revised Ranger' in current_class['name']) and len(classes) >= 2 and ('Ranger' in classes[-2]['name'])

                # Handle unbracketed cases
                if not raw_s_src:
                    if 'Blood Hunter' in current_class['name']:
                        raw_s_src = 'BH2022'
                    elif 'Mystic' in current_class['name']:
                        raw_s_src = 'UAMy'

                resolved_s_src = resolve_source(raw_s_src, valid_source_keys) or current_class['source']

                # Category: check yellow color or HTA / W4ESD
                category = 'Official'
                if s_col in ('FFFFE599', 'FFF1C232', 'FFFFD966') or (resolved_s_src and any(k in resolved_s_src for k in ['HTA', 'W4ESD'])):
                    category = 'Hawthorne Homebrew'

                # Look up external link
                n_s = norm(clean_s_name)
                link = links_by_name.get((n_s, s_ruleset)) or links_by_name.get(n_s)

                # Map Hawthorne Arcana subclasses to specific site section URLs
                ARCANA_SUBCLASS_LINKS = {
                    'battlerager': '/Guides/arcana/battlerager/',
                    'purpledragonknight': '/Guides/arcana/purple-dragon-knight/',
                    'serenity': '/Guides/arcana/serenity-monk/',
                    'artificer': '/Guides/arcana/artificer-wizard/',
                }
                if resolved_s_src and 'HTA' in resolved_s_src and n_s in ARCANA_SUBCLASS_LINKS:
                    link = ARCANA_SUBCLASS_LINKS[n_s]
                elif link and '1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC' in link:
                    link = ARCANA_SUBCLASS_LINKS.get(n_s, '/Guides/arcana/')

                if is_dual_ranger:
                    ranger_parent = classes[-2]
                    # Subclass for Ranger (2014)
                    r_name = clean_s_name
                    r_src = resolved_s_src
                    if '/' in clean_s_name:
                        parts = [p.strip() for p in clean_s_name.split('/')]
                        r_name = parts[0]
                    if 'PHB2014' in resolved_s_src:
                        r_src = 'PHB2014'
                    
                    subclasses.append({
                        'class_idx': ranger_parent['class_idx'],
                        'className': ranger_parent['name'],
                        'name': r_name,
                        'raw_name': s_val.strip(),
                        'ruleset': ranger_parent['ruleset'],
                        'category': category,
                        'source': r_src,
                        'link': link,
                        'notes_advice': advice.strip() if advice else None,
                        'display_order': subclass_order
                    })

                    # Subclass for Revised Ranger (2014)
                    rr_name = clean_s_name
                    rr_src = resolved_s_src
                    if '/' in clean_s_name:
                        parts = [p.strip() for p in clean_s_name.split('/')]
                        rr_name = parts[1] if len(parts) > 1 else parts[0]
                    if 'UATRR' in resolved_s_src:
                        rr_src = 'UATRR'

                    subclasses.append({
                        'class_idx': current_class['class_idx'],
                        'className': current_class['name'],
                        'name': rr_name,
                        'raw_name': s_val.strip(),
                        'ruleset': current_class['ruleset'],
                        'category': category,
                        'source': rr_src,
                        'link': link,
                        'notes_advice': advice.strip() if advice else None,
                        'display_order': subclass_order
                    })
                else:
                    subclasses.append({
                        'class_idx': current_class['class_idx'],
                        'className': current_class['name'],
                        'name': clean_s_name,
                        'raw_name': s_val.strip(),
                        'ruleset': s_ruleset,
                        'category': category,
                        'source': resolved_s_src,
                        'link': link,
                        'notes_advice': advice.strip() if advice else None,
                        'display_order': subclass_order
                    })
                subclass_order += 10.0

    # Ensure rage advice applies to all Battlerager subclasses (SCAG & HTA)
    battlerager_advice = next((s['notes_advice'] for s in subclasses if s['name'] == 'Battlerager' and s.get('notes_advice')), None)
    if battlerager_advice:
        for s in subclasses:
            if s['name'] == 'Battlerager' and not s.get('notes_advice'):
                s['notes_advice'] = battlerager_advice

    print(json.dumps({
        'classes': classes,
        'subclasses': subclasses
    }, indent=2))

if __name__ == '__main__':
    main()

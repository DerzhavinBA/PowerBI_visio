"""Validate this bundle's deliberately narrow two-field YAML format and local links."""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True

def frontmatter_errors(text, dirname):
    # Supported YAML subset: plain name + JSON-quoted description (valid YAML).
    # Deliberately reject extra syntax instead of pretending to be a general YAML parser.
    match = re.match(r'\A---\nname: ([a-z0-9-]+)\ndescription: ("[^\n]*")\n---\n', text)
    if not match:
        return ['Expected name and quoted description frontmatter']
    name, raw = match.groups()
    errors=[]
    if name != dirname or len(name)>64:
        errors.append('Skill name must match its directory and be <=64 characters')
    try:
        description=json.loads(raw)
        if not description.strip() or len(description)>1024:
            errors.append('Description must contain 1..1024 characters')
    except json.JSONDecodeError:
        errors.append('Description is not a valid quoted YAML/JSON scalar')
    return errors

def broken_links(path, text):
    errors=[]
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
        if re.match(r'^[a-z]+://',target) or target.startswith('#'):
            continue
        relative=unquote(target.split('#',1)[0])
        if not (path.parent / relative).exists():
            errors.append(f'{path.name}: missing link {target}')
    return errors

def main():
    errors=[]
    required=['README.md','sources.md','analysis/gantt.md','analysis/report.md',
        'analysis/validation.md','standards/chart-design.md','standards/ux-ui.md',
        'standards/pbiviz-development.md','standards/accessibility.md','standards/quality.md',
        'themes/tmhi-profile.md','themes/tmhi-original.json','themes/contrast-results.json',
        'templates/visual-brief.md','templates/data-contract.md','templates/acceptance.md']
    for name in required:
        if not (ROOT/name).is_file(): errors.append(f'Missing required file: {name}')
    markdown=list(ROOT.rglob('*.md')) + [ROOT.parent/'AGENTS.md']
    for path in markdown:
        if not path.exists():
            errors.append(f'Missing {path}')
            continue
        text=path.read_text(encoding='utf-8')
        errors.extend(broken_links(path,text))
        if '\ufffd' in text: errors.append(f'Replacement character in {path.name}')
    skills=sorted((ROOT/'skills').glob('*/SKILL.md'))
    expected={'powerbi-visual-design','powerbi-pbiviz-development','powerbi-visual-review'}
    if {p.parent.name for p in skills} != expected:
        errors.append('Exactly three named skills are required')
    for path in skills:
        errors.extend(f'{path.parent.name}: {e}' for e in frontmatter_errors(path.read_text(encoding='utf-8'),path.parent.name))
    json_files=list(ROOT.rglob('*.json'))
    for path in json_files:
        try: json.loads(path.read_text(encoding='utf-8'))
        except (ValueError, UnicodeError) as exc: errors.append(f'{path}: {exc}')
    try:
        inventory=json.loads((ROOT/'analysis/evidence/inventory.json').read_text(encoding='utf-8'))
        for item in inventory:
            original=ROOT.parent/item['file']
            if hashlib.sha256(original.read_bytes()).hexdigest()!=item['sha256']:
                errors.append(f'Original changed: {item["file"]}')
        with zipfile.ZipFile(ROOT.parent/'Таблица проектов (ТМХИ).pbix') as z:
            entry=json.loads((ROOT/'analysis/evidence/theme-origin.json').read_text(encoding='utf-8'))['entry']
            actual=json.loads(z.read(entry))
            if actual!=json.loads((ROOT/'themes/tmhi-original.json').read_text(encoding='utf-8')):
                errors.append('Theme differs from original')
        from inspect_artifacts import contrast
        for pair in json.loads((ROOT/'themes/contrast-results.json').read_text(encoding='utf-8')):
            ratio=contrast(pair['foreground'],pair['background'])
            if abs(ratio-pair['ratio'])>.0001 or pair['normalTextAA']!=(ratio>=4.5) or pair['meaningfulGraphicAA']!=(ratio>=3):
                errors.append(f'Invalid contrast result: {pair["name"]}')
    except (OSError,ValueError,KeyError) as exc:
        errors.append(f'Evidence validation failed: {exc}')
    if errors:
        print('\n'.join(errors))
        return 1
    print(f'PASS: {len(markdown)} Markdown files, {len(skills)} skills, {len(json_files)} JSON files; local links, hashes, theme and contrast valid.')
    print('Not tested: Power BI rendering, interactions, accessibility or performance in host.')
    return 0

if __name__=='__main__':
    sys.exit(main())

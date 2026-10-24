"""Read original Power BI ZIP containers; write reproducible local evidence only."""
import collections
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent

def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def luminance(color):
    rgb = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
    return sum(c * w for c, w in zip(linear, (.2126, .7152, .0722)))

def contrast(a, b):
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + .05) / (lo + .05)

def main():
    originals = [WORK / 'Гантт_ТМХИ.pbiviz', WORK / 'Таблица проектов (ТМХИ).pbix']
    inventory = []
    for p in originals:
        with zipfile.ZipFile(p) as z:
            inventory.append({'file': p.name, 'bytes': p.stat().st_size,
                'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                'entries': [{'path': e.filename, 'bytes': e.file_size} for e in z.infolist()]})
    save(ROOT / 'analysis/evidence/inventory.json', inventory)
    with zipfile.ZipFile(originals[0]) as z:
        v = json.loads(z.read('resources/ganttTMHI.pbiviz.json'))
        save(ROOT / 'analysis/evidence/gantt-capabilities.json', v['capabilities'])
        js = v['content']['js']
        normalized = re.sub(r'\n{3,}', '\n\n', js.replace('\r', ''))
        excerpts = {}
        for term in ['const timer = root.setInterval', 'const filtered=view', 'function updateCount()']:
            start = normalized.find(term)
            excerpts[term] = normalized[start:start+1700] if start >= 0 else None
        save(ROOT / 'analysis/evidence/gantt-code-excerpts.json', {
            'source': 'resources/ganttTMHI.pbiviz.json / content.js',
            'normalization': 'CR removed and repeated blank lines collapsed; code not executed',
            'excerpts': excerpts})
        probes = {}
        for term in ['createSelectionManager', 'applyJsonFilter', 'getFormattingModel',
                     'enumerateObjectInstances', 'isHighContrast', 'persistProperties',
                     'fetchMoreData', 'tooltipService', 'keydown', 'tmhiCalendar',
                     'tmhiPanel', 'currentStateOffset', 'hierarchyMarkerOffset']:
            matches = list(re.finditer(re.escape(term), js))
            probes[term] = {'literal_occurrences': len(matches), 'first_offset': matches[0].start() if matches else None,
                'first_context': js[max(0,matches[0].start()-70):matches[0].end()+180] if matches else None}
        save(ROOT / 'analysis/evidence/gantt-summary.json', {
            'visual': v['visual'], 'apiVersion': v['apiVersion'],
            'js_chars': len(js), 'css_chars': len(v['content']['css']),
            'stringResources': v['stringResources'], 'externalJS': v['externalJS'],
            'objects': {k: {'displayName': x.get('displayName'), 'propertyCount': len(x.get('properties',{}))}
                        for k,x in v['capabilities']['objects'].items()}, 'literalProbes': probes,
            'probeLimit': 'Literal matches are static evidence, not runtime behavior or proof of absence.'})
        (ROOT / 'analysis/evidence/THIRD-PARTY-NOTICES.original.txt').write_bytes(z.read('THIRD-PARTY-NOTICES.txt'))
    with zipfile.ZipFile(originals[1]) as z:
        layout = json.loads(z.read('Report/Layout').decode('utf-16-le'))
        config = json.loads(layout.get('config','{}'))
        pages=[]
        for section in layout['sections']:
            visuals=[]
            for container in section['visualContainers']:
                cfg=json.loads(container['config'])
                sv=cfg.get('singleVisual',{})
                visuals.append({'name':cfg.get('name'), 'type':sv.get('visualType','group/other'),
                    'layouts':cfg.get('layouts'), 'objects':sv.get('objects'),
                    'visualContainerObjects':sv.get('vcObjects'), 'projections':sv.get('projections')})
            pages.append({'name':section['name'],'displayName':section['displayName'],
                'width':section['width'],'height':section['height'],
                'containerCount':len(visuals),'types':dict(collections.Counter(v['type'] for v in visuals)),
                'config':json.loads(section.get('config','{}')), 'visuals':visuals})
        save(ROOT / 'analysis/evidence/report-structure.json', {'pages':pages,'bookmarks':config.get('bookmarks',[])})
        theme_path=next(n for n in z.namelist() if 'TMH_ENG_theme' in n)
        theme=json.loads(z.read(theme_path))
        save(ROOT / 'themes/tmhi-original.json',theme)
        save(ROOT / 'analysis/evidence/theme-origin.json',{'container':originals[1].name,'entry':theme_path})
    pairs=[('Primary','#004F9E','#FFFFFF'),('Secondary','#406BB2','#FFFFFF'),
        ('Muted blue','#758CC7','#FFFFFF'),('Accent','#5CC4F2','#FFFFFF'),
        ('Bad original','#D23100','#FFFFFF'),('Neutral original','#E59719','#FFFFFF'),
        ('Good original','#01CD0B','#FFFFFF'),('Warning text proposed','#8A4B00','#FFFFFF'),
        ('Success text proposed','#176B34','#FFFFFF'),('Text proposed','#242424','#FFFFFF'),
        ('Text on accent','#242424','#5CC4F2')]
    save(ROOT / 'themes/contrast-results.json',[
        {'name':n,'foreground':fg,'background':bg,'ratio':round(contrast(fg,bg),4),
         'normalTextAA':contrast(fg,bg)>=4.5,'meaningfulGraphicAA':contrast(fg,bg)>=3}
        for n,fg,bg in pairs])
    print('Evidence generated for 2 originals; 15 report pages expected, found:',len(pages))

if __name__ == '__main__':
    main()

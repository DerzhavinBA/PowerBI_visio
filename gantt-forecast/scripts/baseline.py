"""Reproduce original archive payloads, with deterministic ZIP metadata."""
import hashlib, json, pathlib, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
original = root.parent / 'Гантт_ТМХИ.pbiviz'
expected = (root / 'vendor/original.sha256').read_text().split()[0]
assert hashlib.sha256(original.read_bytes()).hexdigest() == expected, 'Original changed'
entries = {'package.json': (root/'vendor/package.json').read_bytes(),
           'resources/ganttTMHI.pbiviz.json': (root/'vendor/resource.json').read_bytes(),
           'THIRD-PARTY-NOTICES.txt': (root/'THIRD-PARTY-NOTICES.txt').read_bytes()}
resource = json.loads(entries['resources/ganttTMHI.pbiviz.json'])
assert resource['content']['js'].encode() == (root/'vendor/visual.js').read_bytes()
assert resource['content']['css'].encode() == (root/'vendor/visual.css').read_bytes()
out = root/'dist/baseline-1.5.1.0.pbiviz'
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for name, data in sorted(entries.items()):
        info = zipfile.ZipInfo(name, (2026, 10, 30, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, data)
with zipfile.ZipFile(original) as source, zipfile.ZipFile(out) as restored:
    assert set(n for n in source.namelist() if not n.endswith('/')) == set(restored.namelist())
    for name in restored.namelist():
        assert source.read(name) == restored.read(name), name
print('PASS: all original archive payloads reproduced byte-for-byte; source SHA-256 unchanged')
print('ZIP metadata normalized; this is not a Power BI host test.')

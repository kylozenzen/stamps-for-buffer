#!/usr/bin/env python3
"""Create a source-only Netlify test package from an explicit file allowlist.
Never includes .env, Git metadata, node_modules, local output or credentials.
Run from any directory: python3 scripts/package-netlify.py /path/to/artifacts
"""
from pathlib import Path
import hashlib
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/receipts-artifacts').resolve()
output.mkdir(parents=True, exist_ok=True)
files = [root / name for name in [
    'package.json', 'package-lock.json', 'netlify.toml', '.nvmrc', '.gitignore',
    '.env.example', 'readme.md', 'index.html', 'app.html', 'thanks.html', 'robots.txt',
    *['js/' + name + '.js' for name in ['demo-data', 'utils', 'api', 'auth', 'ui', 'app']],
    'styles/app.css', 'styles/landing.css', 'supabase/migrations/001_receipts.sql',
]]
for directory, pattern in [('server', '*.js'), ('netlify/functions', '*.js'),
                           ('scripts', '*.js'), ('scripts', '*.py'), ('test', '*.js')]:
    files.extend((root / directory).glob(pattern))
files.extend(p for p in (root / 'docs').rglob('*') if p.is_file())
files = sorted(set(files), key=lambda p: p.relative_to(root).as_posix())
manifest = []
archive = output / 'receipts-netlify-test-source.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as target:
    for path in files:
        relative = path.relative_to(root).as_posix()
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root):
            raise RuntimeError('Unexpected or unsafe source path: ' + relative)
        if relative == '.env' or relative.startswith('.env.') and relative != '.env.example':
            raise RuntimeError('Environment files must not be packaged')
        data = path.read_bytes()
        target.writestr('receipts-netlify-test/' + relative, data)
        manifest.append(hashlib.sha256(data).hexdigest() + '  ' + relative)
    target.writestr('receipts-netlify-test/MANIFEST.sha256', '\n'.join(manifest) + '\n')
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(checksum + '  ' + archive.name + '\n')
print(str(archive))
print(f'{len(files)} source files, {archive.stat().st_size} bytes; .env, dependencies, Git metadata and build output excluded.')
print('SHA256 ' + checksum)

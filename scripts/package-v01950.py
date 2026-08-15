from pathlib import Path
import shutil, json, hashlib, datetime

base = Path('release/v0.19.49')
out = Path('release/v0.19.50')
if out.exists(): shutil.rmtree(out)
shutil.copytree(base, out)
root = out / 'site'

def repl(rel, old, new, required=True):
    p = root / rel
    s = p.read_text(encoding='utf-8')
    if old not in s:
        if required: raise SystemExit(f'marker missing {rel}: {old}')
        return
    p.write_text(s.replace(old, new), encoding='utf-8')

# Canonical release identity.
repl('index.html', 'KC DP2 V0.19.49', 'KC DP2 V0.19.50')
repl('index.html', "EXPECTED='0.19.49'", "EXPECTED='0.19.50'")
repl('src/core/model.js', "K.VERSION='0.19.49'", "K.VERSION='0.19.50'")
repl('src/core/update-manager.js', "CURRENT_RELEASE='0.19.49'", "CURRENT_RELEASE='0.19.50'")
repl('src/adapters/push.js', 'service-worker.js?v=0.19.49', 'service-worker.js?v=0.19.50')
repl('src/ui/kc-ux-polish.js', '0.19.49', '0.19.50')
repl('src/ui/source-health-ui.js', "K.sourceHealthUi={version:'0.19.49'", "K.sourceHealthUi={version:'0.19.50'")
repl('src/ui/source-health-ui.js', 'kc-ux-polish.css?v=0.19.49', 'kc-ux-polish.css?v=0.19.50')
repl('src/ui/source-health-ui.js', 'kc-ux-polish.js?v=0.19.49', 'kc-ux-polish.js?v=0.19.50')

# New isolated smartphone colleague search. It is read-only and does not change the plan.
(root/'src/ui/mobile-colleague-search.js').write_text(Path('tools/mobile-colleague-search-v01950.js').read_text(encoding='utf-8'), encoding='utf-8')
source = root/'src/ui/source-health-ui.js'
s = source.read_text(encoding='utf-8')
needle = "  function loadUxPolish(){css('kcUxPolishCss','src/ui/kc-ux-polish.css?v=0.19.50');script('kcUxPolishJs','src/ui/kc-ux-polish.js?v=0.19.50',document.body)}\n  function loadExtras(){loadPushCenter();loadDiagnostics();loadUxPolish()}"
replacement = "  function loadUxPolish(){css('kcUxPolishCss','src/ui/kc-ux-polish.css?v=0.19.50');script('kcUxPolishJs','src/ui/kc-ux-polish.js?v=0.19.50',document.body)}\n  function loadMobileColleagueSearch(){script('kcMobileColleagueSearchJs','src/ui/mobile-colleague-search.js?v=0.19.50',document.body)}\n  function loadExtras(){loadPushCenter();loadDiagnostics();loadUxPolish();loadMobileColleagueSearch()}"
if needle not in s: raise SystemExit('source-health mobile loader marker missing')
source.write_text(s.replace(needle,replacement),encoding='utf-8')

# Manifest sealing.
mp = root/'update-manifest.json'
m = json.loads(mp.read_text(encoding='utf-8'))
m['version']='0.19.50'
m['cacheName']='kc-dp-release-0.19.50'
m['releaseNotes']=[
    'Handyfunktion Kollegen suchen repariert und fest verdrahtet',
    'Mobile Kollegensuche nach Name und Qualifikation',
    'Direkter Anruf nur bei hinterlegter Telefonnummer',
    'Kollegensuche bleibt read-only und verändert keine Dienstplandaten'
]
m['generatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
if not any((f.get('installPath') or f.get('path'))=='src/ui/mobile-colleague-search.js' for f in m['files']):
    m['files'].append({'path':'src/ui/mobile-colleague-search.js','installPath':'src/ui/mobile-colleague-search.js','bytes':0,'sha256':'','runtime':True})
total=0; seen=set()
for f in m['files']:
    install=f.get('installPath') or f['path']
    if install in seen: raise SystemExit('duplicate manifest path '+install)
    seen.add(install)
    p=root/install
    if not p.is_file(): raise SystemExit('manifest file missing '+install)
    b=p.read_bytes(); f['bytes']=len(b); f['sha256']=hashlib.sha256(b).hexdigest()
    if f.get('runtime',True): total+=len(b)
m['totalRuntimeBytes']=total
mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

Path('release/current.json').write_text(json.dumps({
    'app':'KC DP2','version':'0.19.50','mode':'verified-direct-site','baseVersion':'0.19.49','previousVersion':'0.19.49','releasePath':'release/v0.19.50/site'
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'RELEASE.txt').write_text('KC DP2 V0.19.50\n================\n\nMobile Fix: Kollegen suchen funktioniert in der persönlichen Handyansicht zuverlässig.\n',encoding='utf-8')
print(f'SEALED V0.19.50: {len(m["files"])} manifest files, {total} runtime bytes')

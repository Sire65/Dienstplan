from pathlib import Path
import shutil, json, hashlib, datetime

base=Path('release/v0.19.50')
out=Path('release/v0.19.51')
if out.exists(): shutil.rmtree(out)
shutil.copytree(base,out)
root=out/'site'

def repl(rel,old,new,required=True):
    p=root/rel
    s=p.read_text(encoding='utf-8')
    if old not in s:
        if required: raise SystemExit(f'marker missing {rel}: {old}')
        return
    p.write_text(s.replace(old,new),encoding='utf-8')

repl('index.html','KC DP2 V0.19.50','KC DP2 V0.19.51')
repl('index.html',"EXPECTED='0.19.50'","EXPECTED='0.19.51'")
repl('src/core/model.js',"K.VERSION='0.19.50'","K.VERSION='0.19.51'")
repl('src/core/update-manager.js',"CURRENT_RELEASE='0.19.50'","CURRENT_RELEASE='0.19.51'")
repl('src/adapters/push.js','service-worker.js?v=0.19.50','service-worker.js?v=0.19.51')
repl('src/adapters/push.js',"K.pushAdapter={version:'0.19.50'","K.pushAdapter={version:'0.19.51'")
repl('src/ui/kc-ux-polish.js','0.19.50','0.19.51')
repl('src/ui/source-health-ui.js',"K.sourceHealthUi={version:'0.19.50'","K.sourceHealthUi={version:'0.19.51'")
repl('src/ui/source-health-ui.js','kc-ux-polish.css?v=0.19.50','kc-ux-polish.css?v=0.19.51')
repl('src/ui/source-health-ui.js','kc-ux-polish.js?v=0.19.50','kc-ux-polish.js?v=0.19.51')
repl('src/ui/source-health-ui.js','mobile-colleague-search.js?v=0.19.50','mobile-colleague-search.js?v=0.19.51')
repl('src/ui/source-health-ui.js','src/adapters/diagnostics.js?v=0.19.44','src/adapters/diagnostics.js?v=0.19.51')
repl('src/ui/source-health-ui.js','src/ui/diagnostics-center.css?v=0.19.44','src/ui/diagnostics-center.css?v=0.19.51')
repl('src/ui/source-health-ui.js','src/ui/diagnostics-center.js?v=0.19.44','src/ui/diagnostics-center.js?v=0.19.51')
repl('index.html','src/ui/wish-sprint.js?v=0.19.37','src/ui/wish-sprint.js?v=0.19.51')

w=(root/'src/ui/wish-sprint.js').read_text(encoding='utf-8')
if "$('kcdpUxRoot')" not in w or "$('roleUxRoot')" in w:
    raise SystemExit('colleague-search root regression')
d=(root/'src/ui/diagnostics-center.js').read_text(encoding='utf-8')
for marker in ['LOAD_TIMEOUT_MS=12000','renderError(err)','Erneut versuchen',"version:'0.19.51'"]:
    if marker not in d: raise SystemExit('diagnostics regression: '+marker)

mp=root/'update-manifest.json'
m=json.loads(mp.read_text(encoding='utf-8'))
m['version']='0.19.51'
m['cacheName']='kc-dp-release-0.19.51'
m['releaseNotes']=[
  'Fehler & Diagnose: kein endloses Laden mehr; Timeout, Retry und verständlicher Fehlerzustand',
  'Fallback-Tabelle falls TableCore verzögert lädt',
  'Kollegen suchen: falscher UI-Root roleUxRoot auf kcdpUxRoot korrigiert',
  'Diagnose und Kollegensuche werden mit V0.19.51 Cache-Bustern sicher neu geladen'
]
m['generatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
total=0;seen=set()
for f in m['files']:
    install=f.get('installPath') or f['path']
    if install in seen: raise SystemExit('duplicate manifest path '+install)
    seen.add(install)
    p=root/install
    if not p.is_file(): raise SystemExit('manifest file missing '+install)
    b=p.read_bytes();f['bytes']=len(b);f['sha256']=hashlib.sha256(b).hexdigest()
    if f.get('runtime',True): total+=len(b)
m['totalRuntimeBytes']=total
mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
Path('release/current.json').write_text(json.dumps({'app':'KC DP2','version':'0.19.51','mode':'verified-direct-site','baseVersion':'0.19.50','previousVersion':'0.19.50','releasePath':'release/v0.19.51/site'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'RELEASE.txt').write_text('KC DP2 V0.19.51\n================\n\nDiagnose- und Kollegensuche-Hotfix.\n',encoding='utf-8')
print(f'SEALED V0.19.51: {len(m["files"])} manifest files, {total} runtime bytes')

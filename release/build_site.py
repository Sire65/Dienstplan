from pathlib import Path
import base64,hashlib,io,json,shutil,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parents[1]
VERSION=sys.argv[1] if len(sys.argv)>1 else '0.19.13'
OUT=ROOT/'build/site'
TMP=ROOT/'build/unpacked'
shutil.rmtree(ROOT/'build',ignore_errors=True);OUT.mkdir(parents=True);TMP.mkdir(parents=True)
parts=[]
parts += [ROOT/f'release/v0.19.0/part{i:02d}.b64' for i in range(8)]
parts += [ROOT/f'release/v0.19.0/fix08/part{i:02d}.b64' for i in range(3)]
parts += [ROOT/f'release/v0.19.0/part{i:02d}.b64' for i in range(9,11)]
parts += [ROOT/f'release/v0.19.0/tail8/part{i:02d}.b64' for i in range(13)]
parts += [ROOT/f'release/v0.19.0/tail1k/part{i:03d}.b64' for i in range(41)]
b64data=b''.join(p.read_bytes() for p in parts)
raw=base64.b64decode(b64data)
if hashlib.sha256(raw).hexdigest()!='246c8ef625280337d4ba309e34862c2fdce2ba8023313f2d9f75426cf1ffc80e': raise SystemExit('base zip sha mismatch')
with zipfile.ZipFile(io.BytesIO(raw)) as z:z.extractall(TMP)
tops=[x for x in TMP.iterdir() if x.is_dir()]
src=tops[0] if len(tops)==1 else TMP
for x in src.iterdir():
    dst=OUT/x.name
    shutil.copytree(x,dst) if x.is_dir() else shutil.copy2(x,dst)
def apply(v):subprocess.run([sys.executable,str(ROOT/f'release/v{v}/apply.py')],cwd=OUT,check=True)
apply('0.19.1')
(OUT/'assets/kc-login-startbild.webp').write_bytes(base64.b64decode(b''.join(p.read_bytes() for p in sorted((ROOT/'release/v0.19.1/assets').glob('startbild-*.b64')))))
(OUT/'assets/kc-login-logo.webp').write_bytes(base64.b64decode(b''.join(p.read_bytes() for p in sorted((ROOT/'release/v0.19.1/assets').glob('logo-*.b64')))))
for v in ['0.19.2','0.19.3','0.19.4','0.19.5','0.19.6','0.19.7']:apply(v)
(OUT/'assets/kc-login-startbild.webp').write_bytes(base64.b64decode(b''.join(p.read_bytes() for p in sorted((ROOT/'release/v0.19.7/assets').glob('bg-*.b64')))))
apply('0.19.8')
(OUT/'assets/kc-login-startbild.webp').write_bytes(base64.b64decode(b''.join(p.read_bytes() for p in sorted((ROOT/'release/v0.19.8/assets').glob('bg-*.b64')))))
if hashlib.sha256((OUT/'assets/kc-login-startbild.webp').read_bytes()).hexdigest()!='c2e250d35eba2a098cd27af353820c56e8da305998321573a1119579e077dee9':raise SystemExit('background sha mismatch')
for v in ['0.19.9','0.19.10','0.19.11','0.19.12','0.19.13']:apply(v)
base_manifest=json.loads((ROOT/'release/v0.19.5/update-manifest.json').read_text())
shutil.rmtree(OUT/'__update',ignore_errors=True);files=[];total=0
for old in base_manifest['files']:
    install=old.get('installPath') or old['path'];p=OUT/install
    if not p.is_file():raise SystemExit(f'missing canonical {install}')
    data=p.read_bytes();runtime=old.get('runtime') is not False
    item={'path':f'__update/{VERSION}/{install}' if runtime else install,'installPath':install,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'runtime':runtime};files.append(item)
    if runtime:
        dst=OUT/item['path'];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);total+=len(data)
manifest={'schema':'KC_DP_UPDATE_MANIFEST_V1','app':'KC-DP2','version':VERSION,'cacheName':f'kc-dp-release-{VERSION}','releaseNotes':['Performance-Core: PBKDF2 einmal pro Sitzung statt pro IndexedDB-Zugriff','Bulk-IndexedDB-Transaktionen für Laden und Speichern','Einmalige sichere Migration bestehender lokaler Daten','Fortschrittsanzeige mit Prozent, Laufzeit und Restzeit für längere Vorgänge'],'generatedAt':'2026-08-12T20:45:00+02:00','totalRuntimeBytes':total,'files':files}
(OUT/'update-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(OUT/'RELEASE.txt').write_text(f'KC-DP2 {VERSION}\n');(OUT/'.nojekyll').touch()
expected=json.loads((ROOT/f'release/v{VERSION}/expected.json').read_text())
for rel,want in expected.items():
    got=hashlib.sha256((OUT/rel).read_bytes()).hexdigest()
    if got!=want:raise SystemExit(f'hash mismatch {rel}: {got} != {want}')
for f in manifest['files']:
    if f.get('runtime') is not False and (OUT/f['path']).read_bytes()!=(OUT/f['installPath']).read_bytes():raise SystemExit(f'recovery mismatch {f["installPath"]}')
print(f'KC-DP2 {VERSION} build OK: {len(files)} files, {total} runtime bytes')

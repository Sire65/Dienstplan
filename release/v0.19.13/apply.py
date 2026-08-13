from pathlib import Path
import base64,zlib,hashlib,subprocess
root=Path('.')
repo=Path(__file__).resolve().parent
old={'service-worker.js': 'b827c9973d8c19b164c50e5a249814359290a465a83f8b4b3f9b5feae188e302', 'src/core/database-diagnostics.js': '150652a36057dbc78e491abd4d551e04ec724b566e7a8fe1e20aac7a7fa2c588', 'src/core/recovery.js': 'fd466e838bd5fd52c35555c202943ccb1aeafb791f9ede5dbbd0f1ac4c393ee9', 'src/core/update-manager.js': 'd26cdd89f784a7950d62aeceb10ee231d49c0f5a6443e6b3067e59241693bf8c', 'src/adapters/sync.js': '25d2c5918a37a877f288fa75883982fbbce9e5ec05c94a7c4fe5921ee69b51a8', 'src/adapters/storage.js': '8f7814791638f878e4ee06bd7bdfef7b584f1b99099b80b1cc1f5e844bacde46', 'src/ui/role-ux.js': '339e1af9cac253b9673a6f27aaf4568891acdb2660f935048b992b3e4e4f0cbd', 'src/ui/app.js': '35e4278ea6d0ed2dfc12912f8f49a38ae2a8421ec2faade18a4646497e7a37b5', 'src/ui/update-ui.js': 'e72de6d9e11cfaca7820ab8e89f59b6eb437b5bb708e158af0ea1be2dd76585e'}
new={'service-worker.js': '64558c98dd7c7c74398314686bb628f5b320fb84051e0cf399f531ba52c22e19', 'src/core/database-diagnostics.js': '4d942e94f60ec9cb04b3b13e02b661ef0d8e58f363902aa39c09241dc072baa5', 'src/core/recovery.js': '3c8bd011adb769cc85440fdfc95308b8fc16d35b0c9257cffb820024c17fd5c5', 'src/core/update-manager.js': '9b2b58b53ad6400b4524f6336cf0917fd9fedfd42b994ff8eb87577d5c6f70a5', 'src/adapters/sync.js': 'cc05917db5c12b5de86fad9b24d4682a9cba5e4a767860538597686ea1f1f303', 'src/adapters/storage.js': 'ef043726c8c97a278f4da89dd621ab2045d7486ca47fed2cc414594f6ee7c148', 'src/ui/role-ux.js': 'bb545e5198d87e112478b4636e32fab2f764bfc41f3772d375efc41b55b33641', 'src/ui/app.js': 'f6750b0b72f83d20328851e644300cf782355573222a793a233ed3b3cd433772', 'src/ui/update-ui.js': '554bc96405490e0154ffb83816502a911889e1833e51c72209c54d6029999213'}
for rel,want in old.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'V0.19.12 base hash mismatch: {rel} {got} != {want}')
index=root/'index.html'; text=index.read_text(encoding='utf-8')
index_before=hashlib.sha256(index.read_bytes()).hexdigest()
if index_before not in {'40a42a5fb3026cd3f40e0586c4371bf1b06852891a0de2b97362243115a34dd2','70627147dcd5ee4859d19519db59c8f2bcb1f7fbf5d9731a9d174e96ddac1aee'}:
    raise SystemExit(f'unknown V0.19.12 index variant: {index_before}')
for name in ('src/core/update-manager.js','src/ui/update-ui.js'):
    import re
    text=re.sub(rf'{re.escape(name)}\?v=0\.19\.\d+',f'{name}?v=0.19.13',text)
index.write_text(text,encoding='utf-8')
payload=''.join((repo/'patch'/f'part{i:02d}.b64').read_text() for i in range(8))
patch=zlib.decompress(base64.b64decode(payload))
subprocess.run(['patch','-p0','--batch','--forward'],cwd=root,input=patch,check=True)
for rel,want in new.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'V0.19.13 result hash mismatch: {rel} {got} != {want}')
if hashlib.sha256(index.read_bytes()).hexdigest()!='a3f479deba99cd82e0591dbae3ea8493e1bce34848d2329c6c98a7440af47f5f': raise SystemExit('V0.19.13 index hash mismatch')
(root/'RELEASE.txt').write_text('KC-DP2 0.19.13\n',encoding='utf-8')

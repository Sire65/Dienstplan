from pathlib import Path
import base64,zlib,hashlib,subprocess
root=Path('.')
repo=Path(__file__).resolve().parent
old={
'service-worker.js':'b827c9973d8c19b164c50e5a249814359290a465a83f8b4b3f9b5feae188e302',
'src/adapters/storage.js':'8f7814791638f878e4ee06bd7bdfef7b584f1b99099b80b1cc1f5e844bacde46',
'src/ui/app.js':'35e4278ea6d0ed2dfc12912f8f49a38ae2a8421ec2faade18a4646497e7a37b5',
'src/ui/role-ux.js':'339e1af9cac253b9673a6f27aaf4568891acdb2660f935048b992b3e4e4f0cbd',
'src/core/update-manager.js':'d26cdd89f784a7950d62aeceb10ee231d49c0f5a6443e6b3067e59241693bf8c',
'src/ui/update-ui.js':'e72de6d9e11cfaca7820ab8e89f59b6eb437b5bb708e158af0ea1be2dd76585e'}
new={
'index.html':'2dad61bc6b95ef2d17fd4924bcb27766eefb36826431eebaa255d4340f932299',
'service-worker.js':'e3b8607c3e4a6c629df1f99aa65f1e19db3e93bd8df7c36f722feabcba3c9bf1',
'src/adapters/storage.js':'084b285e33c0afe87777ac818cf30830798105f6c7ca1e96d2408c42eb8d91c3',
'src/ui/app.js':'4b247c7ed2497c7d637d3c4a9cf3739a7ce4cc41250beb11580ac9d6a588d6ed',
'src/ui/role-ux.js':'41ffac5de3f2767c1075bac1928b1db3355e43aa78fda695964faf7b75dbbacd',
'src/core/update-manager.js':'9b2b58b53ad6400b4524f6336cf0917fd9fedfd42b994ff8eb87577d5c6f70a5',
'src/ui/update-ui.js':'554bc96405490e0154ffb83816502a911889e1833e51c72209c54d6029999213'}
for rel,want in old.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'V0.19.12 base hash mismatch: {rel} {got} != {want}')
index_before=hashlib.sha256((root/'index.html').read_bytes()).hexdigest()
if index_before not in {'40a42a5fb3026cd3f40e0586c4371bf1b06852891a0de2b97362243115a34dd2','70627147dcd5ee4859d19519db59c8f2bcb1f7fbf5d9731a9d174e96ddac1aee'}:
    raise SystemExit(f'unknown V0.19.12 index variant: {index_before}')
payload=''.join((repo/'patch'/f'part{i:02d}.b64').read_text() for i in range(8))
patch=zlib.decompress(base64.b64decode(payload))
subprocess.run(['patch','-p0','--batch','--forward'],cwd=root,input=patch,check=True)
for rel,want in new.items():
    got=hashlib.sha256((root/rel).read_bytes()).hexdigest()
    if got!=want: raise SystemExit(f'V0.19.13 result hash mismatch: {rel} {got} != {want}')
(root/'RELEASE.txt').write_text('KC-DP2 0.19.13\n',encoding='utf-8')

const fs=require('fs'),path=require('path');
const current=require('../release/current.json');
const parts=String(current.version||'').split('.').map(Number);
if(parts.length!==3 || parts.some(Number.isNaN) || parts[0]!==0 || parts[1]!==19 || parts[2]<48) throw new Error('current release predates guided pilot V0.19.48');
const root=path.join(__dirname,'..',current.releasePath);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('pilot/index.html');
const app=read('src/ui/pilot-app.js');
const core=read('src/core/pilot-onboarding.js');
const sw=read('pilot-sw.js');
const ios=JSON.parse(read('pilot/manifest-ios.webmanifest'));
function must(v,m){if(!v)throw new Error(m)}
must(/manifest-ios\.webmanifest/.test(html),'iOS manifest selector missing');
must(!/pilotInstalledBtn/.test(html),'manual installed confirmation must not exist');
must(!Object.prototype.hasOwnProperty.call(ios,'start_url'),'iOS manifest must preserve installing document URL');
must(ios.scope==='./','iOS pilot scope must stay isolated');
must(/WhatsApp\|FBAN\|FBAV\|Instagram/.test(app),'in-app browser guidance missing');
must(/In Safari öffnen/.test(app),'Safari handoff instruction missing');
must(/return P\.installed\(\)/.test(app),'standalone install detection missing');
must(/Einmal neu und richtig verbinden/.test(app),'missing-token recovery flow missing');
must(/kc_dp_pilot_token_v01948/.test(app),'pilot token persistence missing');
must(/version:'0\.19\.48'/.test(core),'guided pilot core baseline mismatch');
must(/Erst wenn die Browserleiste verschwunden ist/.test(app),'visual iPhone standalone cue missing');
if(parts[2]>=49){
  must(/pilotThanksBtn/.test(html),'completion resend button missing');
  must(/call\('finish'\)/.test(app),'completion resend action missing');
  must(/call\('completion_received'\)/.test(app),'completion receipt acknowledgement missing');
  must(/kc-dp2-pilot-v01949/.test(sw),'pilot completion cache bump missing');
  must(/Dankes-Push erneut senden/.test(html),'completion resend guidance missing');
}
console.log(`KC DP2 V${current.version} guided pilot gate: PASS`);

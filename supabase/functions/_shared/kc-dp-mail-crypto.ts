const te=new TextEncoder();
const b64=(u:Uint8Array)=>btoa(String.fromCharCode(...u));
const fromB64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function sha256Hex(bytes:Uint8Array){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));return Array.from(d).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function key(){const raw=Deno.env.get('KC_DP_MAIL_ATTACHMENT_KEY_B64')||'';if(!raw)throw new Error('KC_DP_MAIL_ATTACHMENT_KEY_B64 fehlt');const b=fromB64(raw);if(b.byteLength!==32)throw new Error('KC_DP_MAIL_ATTACHMENT_KEY_B64 muss genau 32 Byte ergeben');return crypto.subtle.importKey('raw',b,{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function encryptMailAttachment(plain:Uint8Array,aadText:string){const iv=crypto.getRandomValues(new Uint8Array(12));const k=await key();const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(aadText),tagLength:128},k,plain));return{cipher,ivB64:b64(iv),algorithm:'AES-256-GCM',plaintextSha256:await sha256Hex(plain),cipherSha256:await sha256Hex(cipher)}}
export async function decryptMailAttachment(cipher:Uint8Array,ivB64:string,aadText:string){const k=await key();const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(ivB64),additionalData:te.encode(aadText),tagLength:128},k,cipher);return new Uint8Array(plain)}
export function decodeBase64(s:string){return fromB64(String(s||'').replace(/^data:[^;]+;base64,/,''))}

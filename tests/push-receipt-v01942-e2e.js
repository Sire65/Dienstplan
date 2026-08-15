'use strict';
const fs=require('fs');
const path=require('path');
const sw=fs.readFileSync(path.join(__dirname,'..','release','v0.19.41','site','service-worker.js'),'utf8');
function ok(v,m){if(!v)throw new Error(m);}
ok(sw.includes("PUSH_RECEIPT_ENDPOINT='https://ptblnpiroqftcvlsrhac.supabase.co/functions/v1/kc-dp-push-receipt'"),'Receipt-Endpunkt fehlt');
ok(sw.includes("pushReceipt(data.data,'displayed')"),'Display-Receipt fehlt');
ok(sw.includes("pushReceipt(data,'opened')"),'Open-Receipt fehlt');
ok(sw.includes("pushReceipt(data,'dismissed')"),'Dismiss-Receipt fehlt');
ok(sw.includes("self.addEventListener('notificationclose'"),'notificationclose-Handler fehlt');
ok(sw.includes("self.registration.pushManager.getSubscription()"),'Receipt wird nicht an aktive Subscription gebunden');
ok(sw.includes("notificationId,endpoint,event:eventName"),'Receipt enthält nicht die erforderlichen Bindungsdaten');
console.log('PUSH RECEIPT V0.19.42: OK – displayed/opened/dismissed werden an die aktive Push-Subscription gebunden rückgemeldet.');

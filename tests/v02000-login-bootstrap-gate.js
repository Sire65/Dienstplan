const fs=require('fs');
const page=fs.readFileSync('release/v0.19.54/site/login-bootstrap.html','utf8');
const handoff=fs.readFileSync('release/v0.19.54/site/src/core/bootstrap-session.js','utf8');
function ok(v,m){if(!v)throw new Error(m);console.log('✓',m)}
ok(page.includes('type="email"')&&page.includes('autocomplete="username"'),'Bootstrap nutzt natives E-Mail-Feld');
ok(page.includes('type="password"')&&page.includes('autocomplete="current-password"'),'Bootstrap nutzt natives Passwortfeld');
ok(page.includes("/auth/v1/token?grant_type=password"),'Bootstrap meldet direkt über Supabase Password Auth an');
ok(page.includes('kc_dp_memberships'),'Bootstrap prüft aktive KC-DP-Mitgliedschaft');
ok(page.includes("sessionStorage.setItem(SESSION_KEY"),'Nur Übergabe-Session wird im sessionStorage abgelegt');
ok(!page.includes("localStorage.setItem")&&!page.includes("password:"+"password"),'Bootstrap persistiert kein Passwort');
ok(page.includes("location.replace('app.html?bootstrap=1')"),'Nach erfolgreicher Anmeldung wird erst die DP2-App geladen');
for(const forbidden of ['service-worker.js','navigator.serviceWorker','update-manager.js','planning.js','notifications.js','communication-bridge.js','mobile-day.js'])ok(!page.includes(forbidden),`Bootstrap lädt ${forbidden} nicht`);
ok(handoff.includes("sessionStorage.removeItem(KEY)"),'Übergabe-Session wird beim Übernehmen gelöscht');
ok(handoff.includes('K.supabaseConnection.restoreSession(x.session)'),'Bestehender Supabase-Provider übernimmt die Sitzung');
ok(handoff.includes("120000"),'Bootstrap-Session ist kurzlebig begrenzt');
console.log('P20 standalone login bootstrap gate OK');

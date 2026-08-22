const { chromium } = require('playwright');

const BASE = process.env.KCDP_BASE_URL || 'http://127.0.0.1:4173/';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log('✓', msg);
}

async function openLogin(browser, routeMode) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/151 Mobile Safari/537.36'
  });
  const page = await context.newPage();
  const requests = [];
  await page.route(/https:\/\/[^/]+\.supabase\.co\/.*/, async route => {
    const url = route.request().url();
    requests.push(url);
    if (url.includes('/auth/v1/token?grant_type=password')) {
      if (routeMode === 'invalid') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
        });
      }
      if (routeMode === 'hang') {
        await new Promise(r => setTimeout(r, 20000));
        try { return await route.abort('timedout'); } catch (_) { return; }
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#uxLoginForm').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    const root = document.getElementById('kcdpUxRoot');
    window.__kcLoginRootMutations = 0;
    window.__kcLoginObserver = new MutationObserver(() => { window.__kcLoginRootMutations++; });
    if (root) window.__kcLoginObserver.observe(root, { childList: true, subtree: true, attributes: true });
  });
  return { context, page, requests };
}

async function loginDomState(page, label) {
  const state = await page.evaluate(() => {
    const p = document.getElementById('uxPassword');
    const f = document.getElementById('uxLoginForm');
    const r = p?.getBoundingClientRect?.();
    const s = p ? getComputedStyle(p) : null;
    return {
      bodyClass: document.body.className,
      formConnected: !!f?.isConnected,
      passwordExists: !!p,
      passwordConnected: !!p?.isConnected,
      passwordDisabled: !!p?.disabled,
      passwordDisplay: s?.display || null,
      passwordVisibility: s?.visibility || null,
      passwordOpacity: s?.opacity || null,
      passwordWidth: r?.width || 0,
      passwordHeight: r?.height || 0,
      rootMutations: window.__kcLoginRootMutations || 0,
      activeId: document.activeElement?.id || null
    };
  });
  console.log(`DOM ${label}: ${JSON.stringify(state)}`);
  return state;
}

async function submit(page) {
  await loginDomState(page, 'before-email');
  await page.locator('#uxEmail').fill('smoke@example.com', { timeout: 10000 });
  await page.waitForTimeout(250);
  const afterEmail = await loginDomState(page, 'after-email');
  if (!afterEmail.passwordExists || !afterEmail.passwordConnected || afterEmail.passwordDisplay === 'none' || afterEmail.passwordVisibility === 'hidden' || afterEmail.passwordWidth === 0 || afterEmail.passwordHeight === 0) {
    throw new Error('Password field became non-interactive after email input: ' + JSON.stringify(afterEmail));
  }
  await page.locator('#uxPassword').fill('wrong-password', { timeout: 10000 });
  await page.locator('#uxLoginForm button[type="submit"]').click({ timeout: 10000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    {
      const { context, page } = await openLogin(browser, 'invalid');
      assert(await page.locator('body').evaluate(el => el.classList.contains('ux-login')), 'Android viewport starts in login mode');
      assert(await page.locator('#uxLoginForm').isVisible(), 'Login form is visible');
      await submit(page);
      await page.locator('#uxLoginForm').waitFor({ state: 'visible', timeout: 5000 });
      const txt = await page.locator('.ux-login-card').innerText();
      assert(/E-Mail-Adresse oder Passwort ist falsch/.test(txt), 'Invalid credentials return a friendly login error');
      assert(!/Anmeldung läuft…/.test(txt), 'Login button is no longer stuck on “Anmeldung läuft…” after auth error');
      await context.close();
    }

    {
      const { context, page, requests } = await openLogin(browser, 'hang');
      const started = Date.now();
      await submit(page);
      await page.waitForFunction(() => {
        const b = document.querySelector('#uxLoginForm button[type="submit"]');
        return !!b && b.textContent.trim() === 'Anmelden' && !b.disabled;
      }, { timeout: 19000 });
      const elapsed = Date.now() - started;
      const card = await page.locator('.ux-login-card').innerText();
      assert(elapsed < 19000, `Hanging login returns control in under 19s (${elapsed} ms)`);
      assert(!/Anmeldung läuft…/.test(card), 'Hanging transport does not leave login UI stuck');
      const tokenCalls = requests.filter(u => u.includes('/auth/v1/token?grant_type=password')).length;
      assert(tokenCalls === 1, `Only one password-auth request is issued (${tokenCalls})`);
      const diagCalls = requests.filter(u => u.includes('/auth/v1/settings?kc_dp_transport=')).length;
      assert(diagCalls === 0, `Network-timeout path does not start a second blocking transport diagnosis (${diagCalls})`);
      await context.close();
    }

    console.log('V0.20 browser login smoke: PASS');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});

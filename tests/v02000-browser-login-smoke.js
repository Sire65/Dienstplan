const { chromium } = require('playwright');

const BASE = process.env.KCDP_BASE_URL || 'http://127.0.0.1:4173/';
const TOTAL_TIMEOUT_MS = 60000;
const testStartedAt = Date.now();
const watchdog = setTimeout(() => {
  const elapsed = Date.now() - testStartedAt;
  console.error(`✕ GLOBAL TIMEOUT: browser login smoke exceeded ${TOTAL_TIMEOUT_MS} ms (elapsed ${elapsed} ms)`);
  process.exit(124);
}, TOTAL_TIMEOUT_MS);

function checkpoint(label) {
  console.log(`[+${Date.now() - testStartedAt}ms] ${label}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log('✓', msg);
}

async function openLogin(browser, routeMode) {
  checkpoint(`openLogin(${routeMode}) start`);
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
      checkpoint(`password token request (${routeMode})`);
      if (routeMode === 'invalid') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
        });
      }
      if (routeMode === 'hang') {
        checkpoint('simulated hanging token request entered');
        await new Promise(r => setTimeout(r, 20000));
        checkpoint('simulated hanging token request aborting after 20s');
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
  checkpoint(`openLogin(${routeMode}) ready`);
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

async function setPasswordViaDom(page, value) {
  checkpoint('set password via DOM events start');
  const actual = await page.locator('#uxPassword').evaluate((el, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, nextValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }, value);
  if (actual !== value) throw new Error(`DOM password input mismatch: ${JSON.stringify(actual)}`);
  checkpoint('set password via DOM events done');
}

async function nativeSubmit(page) {
  checkpoint('native requestSubmit start');
  const ok = await page.locator('#uxLoginForm').evaluate(form => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return false;
    form.requestSubmit(button);
    return true;
  });
  if (!ok) throw new Error('Could not requestSubmit login form');
  checkpoint('native requestSubmit done');
}

async function submit(page) {
  checkpoint('submit start');
  await loginDomState(page, 'before-email');
  checkpoint('fill email start');
  await page.locator('#uxEmail').fill('smoke@example.com', { timeout: 10000 });
  checkpoint('fill email done');
  await page.waitForTimeout(250);
  const afterEmail = await loginDomState(page, 'after-email');
  if (!afterEmail.passwordExists || !afterEmail.passwordConnected || afterEmail.passwordDisplay === 'none' || afterEmail.passwordVisibility === 'hidden' || afterEmail.passwordWidth === 0 || afterEmail.passwordHeight === 0) {
    throw new Error('Password field became non-interactive after email input: ' + JSON.stringify(afterEmail));
  }
  await setPasswordViaDom(page, 'wrong-password');
  await nativeSubmit(page);
}

(async () => {
  checkpoint('launch chromium');
  const browser = await chromium.launch({ headless: true });
  try {
    {
      checkpoint('scenario invalid credentials start');
      const { context, page } = await openLogin(browser, 'invalid');
      assert(await page.locator('body').evaluate(el => el.classList.contains('ux-login')), 'Android viewport starts in login mode');
      assert(await page.locator('#uxLoginForm').isVisible(), 'Login form is visible');
      await submit(page);
      await page.locator('#uxLoginForm').waitFor({ state: 'visible', timeout: 5000 });
      const txt = await page.locator('.ux-login-card').innerText();
      assert(/E-Mail-Adresse oder Passwort ist falsch/.test(txt), 'Invalid credentials return a friendly login error');
      assert(!/Anmeldung läuft…/.test(txt), 'Login button is no longer stuck on “Anmeldung läuft…” after auth error');
      await context.close();
      checkpoint('scenario invalid credentials done');
    }

    {
      checkpoint('scenario hanging transport start');
      const { context, page, requests } = await openLogin(browser, 'hang');
      const started = Date.now();
      await submit(page);
      checkpoint('waiting for login button recovery');
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
      checkpoint('scenario hanging transport done');
    }

    console.log('V0.20 browser login smoke: PASS');
  } finally {
    clearTimeout(watchdog);
    await browser.close();
  }
})().catch(err => {
  clearTimeout(watchdog);
  console.error(err.stack || err);
  process.exit(1);
});

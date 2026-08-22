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
    if (url.includes('/auth/v1/settings')) checkpoint(`transport/settings request (${routeMode})`);
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#uxLoginForm').waitFor({ state: 'visible', timeout: 15000 });
  checkpoint(`openLogin(${routeMode}) ready`);
  return { context, page, requests };
}

async function snapshot(page, label) {
  const state = await page.evaluate(() => {
    const form = document.querySelector('#uxLoginForm');
    const button = form?.querySelector('button[type="submit"]');
    const card = document.querySelector('.ux-login-card');
    return {
      bodyClass: document.body.className,
      formExists: !!form,
      buttonExists: !!button,
      buttonText: button?.textContent?.trim() || null,
      buttonDisabled: !!button?.disabled,
      cardText: card?.innerText || '',
      bodyText: document.body?.innerText || ''
    };
  });
  console.log(`STATE ${label}: ${JSON.stringify(state)}`);
  return state;
}

async function setPasswordViaDom(page, value) {
  checkpoint('set password via direct page DOM start');
  const actual = await page.evaluate(nextValue => {
    const el = document.querySelector('#uxPassword');
    if (!el || !el.isConnected || el.disabled) return null;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, nextValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }, value);
  if (actual !== value) throw new Error(`DOM password input mismatch: ${JSON.stringify(actual)}`);
  checkpoint('set password via direct page DOM done');
}

async function nativeSubmit(page) {
  checkpoint('direct page requestSubmit start');
  const ok = await page.evaluate(() => {
    const form = document.querySelector('#uxLoginForm');
    const button = form?.querySelector('button[type="submit"]');
    if (!form || !button) return false;
    form.requestSubmit(button);
    return true;
  });
  if (!ok) throw new Error('Could not requestSubmit login form');
  checkpoint('direct page requestSubmit done');
}

async function submit(page) {
  checkpoint('submit start');
  await page.locator('#uxEmail').fill('smoke@example.com', { timeout: 10000 });
  await setPasswordViaDom(page, 'wrong-password');
  await nativeSubmit(page);
}

async function waitForFriendly(page, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await snapshot(page, `friendly +${Date.now() - started}ms`);
    const txt = `${state.cardText}\n${state.bodyText}`;
    if (/E-Mail-Adresse oder Passwort ist falsch/.test(txt)) {
      return { state, elapsed: Date.now() - started };
    }
    await page.waitForTimeout(150);
  }
  return { state: await snapshot(page, 'friendly timeout'), elapsed: Date.now() - started };
}

async function waitForRecoveredButton(page, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await snapshot(page, `recovery +${Date.now() - started}ms`);
    if (state.buttonExists && state.buttonText === 'Anmelden' && !state.buttonDisabled) {
      return { state, recovered: true, elapsed: Date.now() - started };
    }
    await page.waitForTimeout(150);
  }
  return { state: await snapshot(page, 'recovery timeout'), recovered: false, elapsed: Date.now() - started };
}

(async () => {
  checkpoint('launch chromium');
  const browser = await chromium.launch({ headless: true });
  try {
    {
      checkpoint('scenario invalid credentials start');
      const { context, page, requests } = await openLogin(browser, 'invalid');
      assert(await page.locator('body').evaluate(el => el.classList.contains('ux-login')), 'Android viewport starts in login mode');
      assert(await page.locator('#uxLoginForm').isVisible(), 'Login form is visible');
      await submit(page);

      const friendly = await waitForFriendly(page, 5000);
      assert(/E-Mail-Adresse oder Passwort ist falsch/.test(`${friendly.state.cardText}\n${friendly.state.bodyText}`), `Invalid credentials return a friendly login error (${friendly.elapsed} ms)`);

      const recovery = await waitForRecoveredButton(page, 3000);
      assert(recovery.recovered, `Login button recovers after auth error (${recovery.elapsed} ms after friendly error)`);
      assert(recovery.state.buttonText !== 'Anmeldung läuft…' && !recovery.state.buttonDisabled, 'Login button is no longer stuck on “Anmeldung läuft…” after auth error');

      const tokenCalls = requests.filter(u => u.includes('/auth/v1/token?grant_type=password')).length;
      assert(tokenCalls === 1, `Invalid-credential path issues one password-auth request (${tokenCalls})`);
      await context.close();
      checkpoint('scenario invalid credentials done');
    }

    {
      checkpoint('scenario hanging transport start');
      const { context, page, requests } = await openLogin(browser, 'hang');
      const started = Date.now();
      await submit(page);
      const recovery = await waitForRecoveredButton(page, 19000);
      const elapsed = Date.now() - started;
      assert(recovery.recovered, `Hanging login returns control in under 19s (${elapsed} ms)`);
      assert(elapsed < 19000, `Hanging login stays below 19s (${elapsed} ms)`);
      assert(recovery.state.buttonText !== 'Anmeldung läuft…' && !recovery.state.buttonDisabled, 'Hanging transport does not leave login UI stuck');
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

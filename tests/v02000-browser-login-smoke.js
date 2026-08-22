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

async function openLogin(browser, mode) {
  checkpoint(`openLogin(${mode}) start`);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/151 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  await page.addInitScript(({ mode }) => {
    const nativeFetch = window.fetch.bind(window);
    window.__kcSmoke = { mode, tokenCalls: 0, settingsCalls: 0, aborts: 0, urls: [] };

    window.fetch = async function kcSmokeFetch(input, init = {}) {
      const url = typeof input === 'string' ? input : input?.url || String(input || '');
      if (!/https:\/\/[^/]+\.supabase\.co\//.test(url)) {
        return nativeFetch(input, init);
      }

      window.__kcSmoke.urls.push(url);

      if (url.includes('/auth/v1/token?grant_type=password')) {
        window.__kcSmoke.tokenCalls++;
        if (mode === 'invalid') {
          return new Response(JSON.stringify({
            error_code: 'invalid_credentials',
            msg: 'Invalid login credentials'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (mode === 'hang') {
          const signal = init?.signal || (typeof input === 'object' ? input?.signal : null);
          return new Promise((resolve, reject) => {
            const failAbort = () => {
              window.__kcSmoke.aborts++;
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            };
            if (signal?.aborted) return failAbort();
            if (signal?.addEventListener) signal.addEventListener('abort', failAbort, { once: true });
          });
        }
      }

      if (url.includes('/auth/v1/settings')) {
        window.__kcSmoke.settingsCalls++;
      }

      return new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
  }, { mode });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#uxLoginForm').waitFor({ state: 'visible', timeout: 15000 });
  checkpoint(`openLogin(${mode}) ready`);
  return { context, page };
}

async function setPasswordViaDom(page, value) {
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
}

async function submit(page) {
  checkpoint('submit start');
  await page.locator('#uxEmail').fill('smoke@example.com', { timeout: 10000 });
  await setPasswordViaDom(page, 'wrong-password');
  const ok = await page.evaluate(() => {
    const form = document.querySelector('#uxLoginForm');
    const button = form?.querySelector('button[type="submit"]');
    if (!form || !button) return false;
    form.requestSubmit(button);
    return true;
  });
  if (!ok) throw new Error('Could not requestSubmit login form');
  checkpoint('submit dispatched');
}

async function waitBrowserCondition(page, kind, timeoutMs) {
  return page.evaluate(({ kind, timeoutMs }) => new Promise(resolve => {
    const started = performance.now();
    let timer = null;
    let observer = null;

    const snapshot = () => {
      const form = document.querySelector('#uxLoginForm');
      const button = form?.querySelector('button[type="submit"]');
      const card = document.querySelector('.ux-login-card');
      const cardText = card?.innerText || '';
      const bodyText = document.body?.innerText || '';
      const text = `${cardText}\n${bodyText}`;
      return {
        formExists: !!form,
        buttonExists: !!button,
        buttonText: button?.textContent?.trim() || null,
        buttonDisabled: !!button?.disabled,
        cardText,
        bodyText,
        friendly: /E-Mail-Adresse oder Passwort ist falsch/.test(text),
        recovered: !!button && button.textContent.trim() === 'Anmelden' && !button.disabled
      };
    };

    const done = state => {
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
      resolve({ ...state, elapsed: Math.round(performance.now() - started), timedOut: false });
    };

    const check = () => {
      const state = snapshot();
      if (kind === 'friendly' && state.friendly) return done(state);
      if (kind === 'recovered' && state.recovered) return done(state);
    };

    observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    timer = setTimeout(() => {
      observer.disconnect();
      resolve({ ...snapshot(), elapsed: Math.round(performance.now() - started), timedOut: true });
    }, timeoutMs);
    check();
  }), { kind, timeoutMs });
}

async function smokeStats(page) {
  return page.evaluate(() => ({ ...(window.__kcSmoke || {}) }));
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

      const friendly = await waitBrowserCondition(page, 'friendly', 5000);
      console.log(`INVALID friendly state: ${JSON.stringify(friendly)}`);
      assert(!friendly.timedOut && friendly.friendly, `Invalid credentials return a friendly login error (${friendly.elapsed} ms)`);

      const recovery = await waitBrowserCondition(page, 'recovered', 3000);
      console.log(`INVALID recovery state: ${JSON.stringify(recovery)}`);
      assert(!recovery.timedOut && recovery.recovered, `Login button recovers after auth error (${recovery.elapsed} ms after friendly error)`);
      assert(recovery.buttonText !== 'Anmeldung läuft…' && !recovery.buttonDisabled, 'Login button is no longer stuck on “Anmeldung läuft…” after auth error');

      const stats = await smokeStats(page);
      assert(stats.tokenCalls === 1, `Invalid-credential path issues one password-auth request (${stats.tokenCalls})`);
      await context.close();
      checkpoint('scenario invalid credentials done');
    }

    {
      checkpoint('scenario hanging transport start');
      const { context, page } = await openLogin(browser, 'hang');
      const started = Date.now();
      await submit(page);
      const recovery = await waitBrowserCondition(page, 'recovered', 19000);
      const elapsed = Date.now() - started;
      console.log(`HANG recovery state: ${JSON.stringify(recovery)}`);
      assert(!recovery.timedOut && recovery.recovered, `Hanging login returns control in under 19s (${elapsed} ms)`);
      assert(elapsed < 19000, `Hanging login stays below 19s (${elapsed} ms)`);
      assert(recovery.buttonText !== 'Anmeldung läuft…' && !recovery.buttonDisabled, 'Hanging transport does not leave login UI stuck');

      const stats = await smokeStats(page);
      console.log(`HANG fetch stats: ${JSON.stringify(stats)}`);
      assert(stats.tokenCalls === 1, `Only one password-auth request is issued (${stats.tokenCalls})`);
      assert(stats.settingsCalls === 0, `Network-timeout path does not start a second blocking transport diagnosis (${stats.settingsCalls})`);
      assert(stats.aborts >= 1, `Supabase password request is actually aborted by the timeout guard (${stats.aborts})`);
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

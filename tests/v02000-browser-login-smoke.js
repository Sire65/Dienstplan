const { chromium } = require('playwright');

const BASE = process.env.KCDP_BASE_URL || 'http://127.0.0.1:4173/';
const TOTAL_TIMEOUT_MS = 45000;
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
      }

      if (url.includes('/auth/v1/settings')) {
        window.__kcSmoke.settingsCalls++;
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

      return new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
  }, { mode });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const form = document.querySelector('#uxLoginForm');
    const email = document.querySelector('#uxEmail');
    const password = document.querySelector('#uxPassword');
    return !!form && !!email && !!password;
  }, { timeout: 15000 });
  checkpoint(`openLogin(${mode}) ready`);
  return { context, page };
}

async function setInputViaDom(page, selector, value) {
  const actual = await page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (!el || !el.isConnected || el.disabled) return null;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }, { selector, value });
  if (actual !== value) throw new Error(`DOM input mismatch for ${selector}: ${JSON.stringify(actual)}`);
}

async function submit(page) {
  checkpoint('submit start');
  await setInputViaDom(page, '#uxEmail', 'smoke@example.com');
  checkpoint('email set via direct page DOM');
  await setInputViaDom(page, '#uxPassword', 'wrong-password');
  checkpoint('password set via direct page DOM');
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
      const surface = await page.evaluate(() => ({
        loginMode: document.body.classList.contains('ux-login'),
        formExists: !!document.querySelector('#uxLoginForm'),
        emailExists: !!document.querySelector('#uxEmail'),
        passwordExists: !!document.querySelector('#uxPassword')
      }));
      assert(surface.loginMode, 'Android viewport starts in login mode');
      assert(surface.formExists && surface.emailExists && surface.passwordExists, 'Login form is visible and complete');
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
      checkpoint('scenario isolated timeout guard start');
      const { context, page } = await openLogin(browser, 'hang');
      const guard = await page.evaluate(() => ({ ...(window.KCDP?.networkTimeoutGuard || {}) }));
      assert(guard.hardDeadline === true, 'Hard network deadline guard is installed');
      assert(guard.defaultTimeoutMs === 15000, `Production Supabase timeout remains 15 seconds (${guard.defaultTimeoutMs} ms)`);

      const result = await page.evaluate(async () => {
        const started = performance.now();
        try {
          await fetch('https://ptblnpiroqftcvlsrhac.supabase.co/auth/v1/settings?kc_dp_smoke=1', {
            method: 'GET',
            cache: 'no-store',
            kcTimeoutMs: 1200
          });
          return { ok: false, elapsed: Math.round(performance.now() - started), error: null };
        } catch (e) {
          return {
            ok: true,
            elapsed: Math.round(performance.now() - started),
            name: e?.name || null,
            code: e?.code || null,
            message: e?.message || String(e)
          };
        }
      });
      console.log(`TIMEOUT guard result: ${JSON.stringify(result)}`);
      assert(result.ok, 'Isolated hanging Supabase request is rejected by the guard');
      assert(result.code === 'KC_DP_NETWORK_TIMEOUT', `Timeout is normalized as KC_DP_NETWORK_TIMEOUT (${result.code})`);
      assert(result.elapsed >= 1000 && result.elapsed < 4000, `Explicit 1.2s smoke deadline fires promptly (${result.elapsed} ms)`);

      const stats = await smokeStats(page);
      console.log(`TIMEOUT fetch stats: ${JSON.stringify(stats)}`);
      assert(stats.settingsCalls === 1, `Exactly one isolated Supabase request is issued (${stats.settingsCalls})`);
      assert(stats.aborts >= 1, `Underlying hanging request receives abort (${stats.aborts})`);
      await context.close();
      checkpoint('scenario isolated timeout guard done');
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

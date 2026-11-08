import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ?? '/tmp/pauseloop-web';
const widths = [320, 375, 430];
const themes = ['dark', 'light'];

mkdirSync(ARTIFACT_DIR, { recursive: true });

async function waitForEnabled(locator, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await locator.isEnabled().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${locator}`);
}

async function checkNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => {
    const offenders = [];
    for (const element of document.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      if (style.position === 'absolute' || style.position === 'fixed') continue;
      if (style.pointerEvents === 'none' || style.display === 'none') continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1)) {
        offenders.push({
          tag: element.tagName,
          text: (element.textContent ?? '').trim().slice(0, 60),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      offenders: offenders.slice(0, 8),
    };
  });

  assert.ok(
    result.scrollWidth <= result.innerWidth + 1,
    `${label}: document scrollWidth ${result.scrollWidth} exceeds ${result.innerWidth}`,
  );
  assert.deepEqual(result.offenders, [], `${label}: elements overflow horizontally`);
}

async function enlargeText(page) {
  await page.evaluate(() => {
    let index = 0;
    for (const element of document.querySelectorAll('*')) {
      if (!element.textContent?.trim()) continue;
      const style = getComputedStyle(element);
      if (style.fontFamily.toLowerCase().includes('ionicons')) continue;
      const size = Number.parseFloat(style.fontSize);
      if (!Number.isFinite(size) || size <= 0) continue;
      const lineHeight = Number.parseFloat(style.lineHeight);
      element.dataset.pauseloopFont = String(size);
      element.dataset.pauseloopLineHeight = String(
        Number.isFinite(lineHeight) ? lineHeight : size * 1.3,
      );
      element.dataset.pauseloopIndex = String(index++);
      element.style.setProperty('font-size', `${size * 2}px`, 'important');
      element.style.setProperty(
        'line-height',
        `${(Number.isFinite(lineHeight) ? lineHeight : size * 1.3) * 2}px`,
        'important',
      );
    }
  });
  await page.waitForTimeout(250);
}

async function restoreText(page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('[data-pauseloop-font]')) {
      element.style.removeProperty('font-size');
      element.style.removeProperty('line-height');
      delete element.dataset.pauseloopFont;
      delete element.dataset.pauseloopLineHeight;
      delete element.dataset.pauseloopIndex;
    }
  });
  await page.waitForTimeout(150);
}

async function completeOnboarding(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Choose your apps' }).waitFor();
  await checkNoHorizontalOverflow(page, 'onboarding welcome');

  await page.getByRole('button', { name: 'Choose your apps' }).click();
  await page.getByText('Choose your loop apps').waitFor();
  const youtube = page.getByRole('checkbox', { name: /YouTube/i }).first();
  await youtube.waitFor();
  await checkNoHorizontalOverflow(page, 'onboarding apps');
  await youtube.click();

  const continueButton = page.getByRole('button', { name: /Continue with 1 app/i });
  await waitForEnabled(continueButton);
  await continueButton.click();

  await page.getByText('Grant the essentials').waitFor();
  await checkNoHorizontalOverflow(page, 'onboarding permissions');
  const finish = page.getByRole('button', { name: 'Finish setup' });
  await waitForEnabled(finish);
  await finish.click();

  await page.getByText('Hold the loop.').waitFor();
  await checkNoHorizontalOverflow(page, 'dashboard');
}

async function runMatrix(browser) {
  for (const theme of themes) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 860 },
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      const label = `${theme} ${width}px`;
      try {
        await completeOnboarding(page);
        await page.screenshot({
          path: `${ARTIFACT_DIR}/dashboard-${theme}-${width}.png`,
          fullPage: true,
        });

        const start = page.getByRole('button', { name: 'Start monitoring' });
        await waitForEnabled(start);
        await start.click();
        await page.getByRole('button', { name: 'Pause monitoring' }).waitFor();

        await page.getByRole('button', { name: 'Open settings' }).first().click();
        await page.getByText('Tune the pause').waitFor();
        await checkNoHorizontalOverflow(page, `${label} settings`);

        await page.getByRole('button', { name: 'Privacy and data controls' }).click();
        await page.getByText('Nothing leaves this phone', { exact: true }).waitFor();
        await checkNoHorizontalOverflow(page, `${label} privacy`);
        await page.getByRole('button', { name: 'Go back' }).click();
        await page.getByText('Tune the pause').waitFor();

        await page.getByRole('button', { name: 'Go back' }).click();
        await page.getByText('Hold the loop.').waitFor();
        await page.getByRole('button', { name: 'Manage loop apps' }).click();
        await page.getByText('Choose what counts').waitFor();
        await checkNoHorizontalOverflow(page, `${label} apps`);

        await enlargeText(page);
        await checkNoHorizontalOverflow(page, `${label} apps at 200% text`);
        await page.screenshot({
          path: `${ARTIFACT_DIR}/apps-200pct-${theme}-${width}.png`,
          fullPage: true,
        });
        await restoreText(page);

        assert.deepEqual(consoleErrors, [], `${label}: console errors`);
        console.log(`PASS ${label}`);
      } finally {
        await context.close();
      }
    }
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE || undefined,
});
try {
  await runMatrix(browser);
} finally {
  await browser.close();
}

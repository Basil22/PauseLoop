import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ?? '/tmp/pauseloop-web';
const widths = [320, 375, 430];
const themes = ['dark', 'light'];
mkdirSync(ARTIFACT_DIR, { recursive: true });

const failures = [];

async function waitForEnabled(locator, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await locator.isEnabled().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${locator}`);
}

async function check(page, label) {
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
      offenders: offenders.slice(0, 5),
    };
  });

  if (result.scrollWidth > result.innerWidth + 1 || result.offenders.length > 0) {
    failures.push({ label, ...result });
  }
}

async function enlargeText(page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('*')) {
      if (!element.textContent?.trim()) continue;
      const style = getComputedStyle(element);
      if (style.fontFamily.toLowerCase().includes('ionicons')) continue;
      const size = Number.parseFloat(style.fontSize);
      if (!Number.isFinite(size) || size <= 0) continue;
      const lineHeight = Number.parseFloat(style.lineHeight);
      element.style.setProperty('font-size', `${size * 2}px`, 'important');
      element.style.setProperty(
        'line-height',
        `${(Number.isFinite(lineHeight) ? lineHeight : size * 1.3) * 2}px`,
        'important',
      );
    }
  });
  await page.waitForTimeout(200);
}

async function restoreText(page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('*')) {
      element.style.removeProperty('font-size');
      element.style.removeProperty('line-height');
    }
  });
  await page.waitForTimeout(150);
}

async function checkScaled(page, label) {
  await enlargeText(page);
  await check(page, `${label} @200%`);
  await page.screenshot({ path: `${ARTIFACT_DIR}/scale-${label.replace(/[^a-z0-9]+/gi, '-')}.png`, fullPage: true });
  await restoreText(page);
}

async function run(browser) {
  for (const theme of themes) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 860 },
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const prefix = `${theme}-${width}`;
      try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.getByText('Break the loop.').waitFor();
        await checkScaled(page, `${prefix}-welcome`);

        await page.getByRole('button', { name: 'Choose your apps' }).click();
        await page.getByText('Choose your loop apps').waitFor();
        await checkScaled(page, `${prefix}-onboarding-apps`);

        const youtube = page.getByRole('checkbox', { name: /YouTube/i }).first();
        await youtube.click();
        const cont = page.getByRole('button', { name: /Continue with 1 app/i });
        await waitForEnabled(cont);
        await cont.click();

        await page.getByText('Grant the essentials').waitFor();
        await checkScaled(page, `${prefix}-permissions`);

        const finish = page.getByRole('button', { name: 'Finish setup' });
        await waitForEnabled(finish);
        await finish.click();

        await page.getByText('Hold the loop.').waitFor();
        await checkScaled(page, `${prefix}-dashboard`);

        await page.getByRole('button', { name: 'Open settings' }).first().click();
        await page.getByText('Tune the pause').waitFor();
        await checkScaled(page, `${prefix}-settings`);

        await page.getByRole('button', { name: 'Privacy and data controls' }).click();
        await page.getByText('Nothing leaves this phone', { exact: true }).waitFor();
        await checkScaled(page, `${prefix}-privacy`);
        await page.getByRole('button', { name: 'Go back' }).click();
        await page.getByText('Tune the pause').waitFor();
        await page.getByRole('button', { name: 'Go back' }).click();
        await page.getByText('Hold the loop.').waitFor();

        await page.getByRole('button', { name: 'Manage loop apps' }).click();
        await page.getByText('Choose what counts').waitFor();
        await checkScaled(page, `${prefix}-apps`);

        await page.getByRole('button', { name: 'Go back' }).click();
        await page.getByText('Hold the loop.').waitFor();
      } catch (error) {
        failures.push({ label: `${prefix}-flow`, error: String(error).slice(0, 400) });
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
  await run(browser);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log('PASS 200% text scale matrix: 6 contexts x 7 screens');

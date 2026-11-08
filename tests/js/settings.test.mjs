import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, '..', '..', 'src', 'lib', 'settings.ts');
const source = readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    verbatimModuleSyntax: true,
  },
  fileName: sourcePath,
}).outputText;

const settings = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

test('clampReminderInterval keeps intervals inside 1..120 and rounds', () => {
  assert.equal(settings.clampReminderInterval(-4), 1);
  assert.equal(settings.clampReminderInterval(0), 1);
  assert.equal(settings.clampReminderInterval(4.6), 5);
  assert.equal(settings.clampReminderInterval(120), 120);
  assert.equal(settings.clampReminderInterval(121), 120);
  assert.equal(settings.clampReminderInterval(Number.NaN), 5);
  assert.equal(settings.clampReminderInterval(Infinity), 5);
});

test('normalizePackages trims, dedupes, sorts, and rejects unsafe entries', () => {
  assert.deepEqual(
    settings.normalizePackages([
      ' com.example.b ',
      'com.example.a',
      'com.example.a',
      '',
      'bad\npackage',
      'x'.repeat(256),
    ]),
    ['com.example.a', 'com.example.b'],
  );
  assert.deepEqual(settings.normalizePackages(new Set(['b.app', 'a.app'])), ['a.app', 'b.app']);
});

test('normalizePackages caps the list at 250 entries', () => {
  const many = Array.from({ length: 300 }, (_, index) => `app.${String(index).padStart(3, '0')}`);
  assert.equal(settings.normalizePackages(many).length, settings.MAX_TARGET_PACKAGES);
});

test('isOnboardingComplete only accepts an explicit true', () => {
  assert.equal(settings.isOnboardingComplete(null), false);
  assert.equal(settings.isOnboardingComplete({}), false);
  assert.equal(settings.isOnboardingComplete({ onboardingComplete: false }), false);
  assert.equal(settings.isOnboardingComplete({ onboardingComplete: true }), true);
});

test('isSuggestedPackage matches known packages and names', () => {
  assert.equal(settings.isSuggestedPackage('com.google.android.youtube', 'YouTube'), true);
  assert.equal(settings.isSuggestedPackage('com.example.unknown', 'Instagram'), true);
  assert.equal(settings.isSuggestedPackage('com.example.unknown', 'Calculator'), false);
});

test('matchesAppQuery searches labels and package names case-insensitively', () => {
  const app = { packageName: 'com.Example.App', label: 'Example' };
  assert.equal(settings.matchesAppQuery(app, ''), true);
  assert.equal(settings.matchesAppQuery(app, '  '), true);
  assert.equal(settings.matchesAppQuery(app, 'exam'), true);
  assert.equal(settings.matchesAppQuery(app, 'PACKAGE'), false);
  assert.equal(settings.matchesAppQuery(app, 'example.app'), true);
  assert.equal(settings.matchesAppQuery(app, 'missing'), false);
});

test('formatInterval uses minutes below an hour and hours above', () => {
  assert.equal(settings.formatInterval(5), '5 min');
  assert.equal(settings.formatInterval(59), '59 min');
  assert.equal(settings.formatInterval(60), '1 hr');
  assert.equal(settings.formatInterval(90), '1 hr 30 min');
  assert.equal(settings.formatInterval(0), '1 min');
});

test('formatDuration and formatLongDuration stay human-readable', () => {
  assert.equal(settings.formatDuration(-1), '0s');
  assert.equal(settings.formatDuration(45_000), '45s');
  assert.equal(settings.formatDuration(90_000), '1m');
  assert.equal(settings.formatDuration(3_600_000), '1h');
  assert.equal(settings.formatDuration(5_400_000), '1h 30m');

  assert.equal(settings.formatLongDuration(20_000), 'Less than a minute');
  assert.equal(settings.formatLongDuration(90_000), '2 min');
  assert.equal(settings.formatLongDuration(3_600_000), '1 hr');
  assert.equal(settings.formatLongDuration(5_400_000), '1 hr 30 min');
});

test('formatCountdown rounds up and supports hour-long waits', () => {
  assert.equal(settings.formatCountdown(0), '00:00');
  assert.equal(settings.formatCountdown(1), '00:01');
  assert.equal(settings.formatCountdown(59_001), '01:00');
  assert.equal(settings.formatCountdown(3_599_000), '59:59');
  assert.equal(settings.formatCountdown(3_600_000), '1:00:00');
  assert.equal(settings.formatCountdown(3_661_000), '1:01:01');
  assert.equal(settings.formatCountdown(-500), '00:00');
});

test('sessionProgress is bounded and rejects invalid thresholds', () => {
  assert.equal(settings.sessionProgress(0, 10_000), 0);
  assert.equal(settings.sessionProgress(5_000, 10_000), 0.5);
  assert.equal(settings.sessionProgress(20_000, 10_000), 1);
  assert.equal(settings.sessionProgress(5_000, 0), 0);
  assert.equal(settings.sessionProgress(Number.NaN, 10_000), 0);
});

test('humanizePackage falls back gracefully', () => {
  assert.equal(settings.humanizePackage(null), 'No app selected');
  assert.equal(settings.humanizePackage('com.google.android.youtube'), 'Youtube');
  assert.equal(settings.humanizePackage('com.example.my_app'), 'My App');
});

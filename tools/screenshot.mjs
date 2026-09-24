/**
 * Headless screenshots of the running game via puppeteer-core + system Chrome.
 *
 *   node tools/screenshot.mjs [outDir]
 *
 * Starts `vite dev`, waits for the loading screen to disappear, then captures:
 *   menu.png, gameplay.png, air.png, first-person.png
 *
 * Uses the locally installed Chrome (no bundled download). This is a dev tool;
 * `puppeteer-core` is a devDependency (see package.json).
 */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const OUT = process.argv[2] ?? 'C:/Users/xingy/AppData/Local/Temp/opencode/game_shots';
const PORT = 5199;
const URL = `http://localhost:${PORT}/`;

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chromePath) throw new Error('no Chrome/Edge found');

fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reachable = () =>
  new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  shell: true,
});

for (let i = 0; i < 40 && !(await reachable()); i += 1) await wait(1000);

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    '--enable-unsafe-swiftshader',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,720',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  // Skip the first-run intro/tutorial and preselect the fox.
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('SnowRush.seenIntro', '1');
    localStorage.setItem('SnowRush.tutorialDone', '1');
    localStorage.setItem('SnowRush.character', 'fox');
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('PAGE_ERROR', msg.text());
  });
  page.on('pageerror', (error) => console.log('PAGE_EXCEPTION', error.message));

  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  // Wait until the loading overlay is removed (models loaded).
  await page.waitForFunction(() => !document.getElementById('loading'), { timeout: 60000 });
  await page.bringToFront();
  await wait(1500);
  await page.screenshot({ path: path.join(OUT, 'menu.png') });
  console.log('SHOT menu.png (title:', await page.title(), ')');

  await page.$eval('[data-action="start"]', (el) => el.click());
  // Software WebGL runs slowly, so the countdown can take a long real time.
  let started = false;
  for (let i = 0; i < 45; i += 1) {
    await wait(2000);
    // Headless loses focus, which trips the game's auto-pause; dismiss it.
    await page.$eval('[data-action="resume"]', (el) => el.click()).catch(() => {});
    const time = await page.evaluate(
      () => document.querySelector('.hud-time-value')?.textContent ?? '',
    );
    console.log('WAIT', i * 2, 'time', time);
    if (time && time !== '00:00') {
      started = true;
      break;
    }
  }
  if (!started) console.log('WARN race never started');

  await page.keyboard.down('KeyW');
  await wait(4000);
  await page.screenshot({ path: path.join(OUT, 'gameplay.png') });

  await page.keyboard.press('Space');
  await wait(420);
  await page.screenshot({ path: path.join(OUT, 'air.png') });
  await page.keyboard.up('KeyW');
  await wait(500);

  await page.keyboard.press('KeyV');
  await wait(700);
  await page.screenshot({ path: path.join(OUT, 'first-person.png') });
  console.log('SHOT gameplay / air / first-person');
} finally {
  await browser.close();
  try {
    execSync(`taskkill /F /T /PID ${vite.pid}`);
  } catch {
    vite.kill();
  }
}

import { test, expect, Browser, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { captureLayout, DEFAULT_SELECTORS } from '../utils/layoutAnalyzer.js';
import { compareLayoutFiles, compareImages, calculateDiffPercentage, createHybridSummary } from '../scripts/reportMethods.js';
import { pixelDiffThreshold } from '../utils/envFile.js';

const LOCK_FILE = 'reports/.results-lock';
const MAX_LOCK_WAIT = 5000;

function acquireLock(): boolean {
  const startTime = Date.now();
  while (fs.existsSync(LOCK_FILE)) {
    if (Date.now() - startTime > MAX_LOCK_WAIT) {
      fs.unlinkSync(LOCK_FILE);
      break;
    }
    const wait = new Date(Date.now() + 50);
    while (Date.now() < wait.getTime()) {}
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  return true;
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (err) {
  }
}

const urlsByProduct = JSON.parse(fs.readFileSync('urls.json', 'utf-8'));

const DAILY_DIR = 'screenshots/daily';
const DIFF_DIR = 'screenshots/diffs';
const REPORT_DIR = 'reports';
const TODAY = new Date().toISOString().split('T')[0];
const RESULTS_JSON = path.join(REPORT_DIR, `results-${TODAY}.json`);

fs.mkdirSync(DIFF_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

function safeName(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function findPreviousDayDir(productName: string): { dir: string | null; date: string | null } {
  if (!fs.existsSync(DAILY_DIR)) return { dir: null, date: null };
  
  const dates = fs.readdirSync(DAILY_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f) && f < TODAY)
    .sort()
    .reverse();
  
  if (dates.length > 0) {
    const previousProductDir = path.join(DAILY_DIR, dates[0], productName);
    if (fs.existsSync(previousProductDir)) {
      return { dir: previousProductDir, date: dates[0] };
    }
  }
  return { dir: null, date: null };
}

test.describe('Daily UI Visual Check', () => {
  for (const [productName, urls] of Object.entries(urlsByProduct)) {
    test.describe(`${productName} Product`, () => {
      const TODAY_DIR = path.join(DAILY_DIR, TODAY, productName);
      const PREVIOUS_DAY = findPreviousDayDir(productName);
      
      fs.mkdirSync(TODAY_DIR, { recursive: true });

      for (const url of urls as string[]) {
        const viewName = safeName(url);
        const todayPath = path.join(TODAY_DIR, `${viewName}.png`);
        const previousPath = PREVIOUS_DAY.dir 
          ? path.join(PREVIOUS_DAY.dir, `${viewName}.png`)
          : null;

        test(`[${productName}] Check UI for ${url}`, async ({ browser }) => {
          const authFile = path.join('auth', `auth-${productName.toLowerCase()}.json`);
          
          if (!fs.existsSync(authFile)) {
            throw new Error(`Auth file not found: ${authFile}. Please run setup first.`);
          }

          const context = await browser.newContext({
            storageState: authFile
          });
          const page = await context.newPage();

          const errors: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') errors.push(`Console error: ${msg.text()}`);
          });
          page.on('pageerror', err => errors.push(`Page error: ${err.message}`));

          await page.goto(url, { waitUntil: 'networkidle' });
          await page.waitForTimeout(1000);

          await page.screenshot({ 
            path: todayPath, 
            fullPage: true, 
            animations: 'disabled' 
          });

          const todayLayoutPath = path.join(TODAY_DIR, `${viewName}-layout.json`);
          const previousLayoutPath = PREVIOUS_DAY.dir 
            ? path.join(PREVIOUS_DAY.dir, `${viewName}-layout.json`)
            : null;

          try {
            const layoutData = await captureLayout(page, url, DEFAULT_SELECTORS);
            fs.writeFileSync(todayLayoutPath, JSON.stringify(layoutData, null, 2));
            console.log(`📐 Layout data captured for ${url}`);
          } catch (err) {
            const error = err as Error;
            console.warn(`⚠️ Failed to capture layout for ${url}: ${error.message}`);
          }

          if (previousPath && fs.existsSync(previousPath)) {
            console.log(`📸 Screenshot captured for ${url} - will compare with previous day`);
          } else {
            console.log(`🆕 First screenshot for ${url} - no previous day to compare`);
          }

          const status = errors.length > 0 ? '❌ Error' : 'PENDING';

          const result = {
            url,
            viewName,
            product: productName,
            date: TODAY,
            previousDate: PREVIOUS_DAY.date || null,
            status,
            errors,
            previousPath: (previousPath && fs.existsSync(previousPath)) ? previousPath : null,
            todayPath,
            todayLayoutPath,
            previousLayoutPath: (previousLayoutPath && fs.existsSync(previousLayoutPath)) ? previousLayoutPath : null,
            diffPath: null,
            diffPixels: 0,
            layoutChanges: null
          };

          acquireLock();
          try {
            let currentResults: any[] = [];
            if (fs.existsSync(RESULTS_JSON)) {
              try {
                const fileContent = fs.readFileSync(RESULTS_JSON, 'utf-8');
                currentResults = JSON.parse(fileContent);
              } catch (err) {
                currentResults = [];
              }
            }

            const existingIndex = currentResults.findIndex(r => r.url === url && r.product === productName);
            if (existingIndex >= 0) {
              currentResults[existingIndex] = result;
            } else {
              currentResults.push(result);
            }

            fs.writeFileSync(RESULTS_JSON, JSON.stringify(currentResults, null, 2));
          } finally {
            releaseLock();
          }

          // await context.close();

          let failureReasons: string[] = [...errors];
          
          if (previousPath && fs.existsSync(previousPath) && previousLayoutPath && fs.existsSync(previousLayoutPath)) {
            try {
              const layoutComparison = compareLayoutFiles(previousLayoutPath, todayLayoutPath);
              const visualComparison = compareImages(previousPath, todayPath, null);
              // const diffPercent = parseFloat(calculateDiffPercentage(visualComparison.diffPixels, visualComparison.totalPixels));
              const hybridStatus = createHybridSummary(layoutComparison, visualComparison.diffPixels, visualComparison.totalPixels);
              
              if (hybridStatus.status === 'error') {
                if (layoutComparison && layoutComparison.totalChanges > 0) {
                  failureReasons.push(`Layout changes: ${layoutComparison.totalChanges} changes (Score: ${layoutComparison.layoutScore}/100)`);
                }
                // if (diffPercent > pixelDiffThreshold) {
                //   failureReasons.push(`Visual changes: ${diffPercent}% exceeds threshold of ${pixelDiffThreshold}%`);
                // }
              }
            } catch (err) {
              console.warn(`⚠️ Could not compare for failure check: ${(err as Error).message}`);
            }
          }

          if (failureReasons.length > 0) {
            throw new Error(`Test failed:\n${failureReasons.map(r => `  - ${r}`).join('\n')}`);
          }
        });
      }
    });
  }
});

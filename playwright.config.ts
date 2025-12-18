// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import { env_url } from './utils/envFile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

export default defineConfig({
  timeout: 50000,
  retries: 0,
  workers: parseInt(process.env.TEST_WORKERS || '5'),
  fullyParallel: true,
  expect: {
    timeout: 15000
  },
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: env_url || 'https://platform.draup.com',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10000,
  },
  testDir: './',
  globalTeardown: './utils/globalTeardown.ts',
  projects: [
    { 
      name: 'setup', 
      testMatch: /auth\.setup\.ts/ 
    },
    {
      name: 'chromium',
      testMatch: /ui-check\.spec\.ts/,
      dependencies: ['setup'],
    }
  ]
});
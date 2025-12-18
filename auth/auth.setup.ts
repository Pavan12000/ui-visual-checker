import { test as setup, expect } from '@playwright/test';
import AuthNavigator from './authNavigator';
import { fileURLToPath } from 'url';
import path from 'path';
import { env_username_talent, env_otp, env_username_sales } from '../utils/envFile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

let authNavigator: AuthNavigator;
authNavigator = new AuthNavigator();

setup('Authenticate To Draup Talent', async ({ page }) => {
    await authNavigator.login(page, env_username_talent, env_otp);
    await authNavigator.closeModal(page);
    await authNavigator.switchToProduct(page, 'Talent');
    await page.context().storageState({ path: path.join(__dirname, './auth-talent.json') });
});

setup('Authenticate To Draup Sales', async ({ page }) => {
    await authNavigator.login(page, env_username_sales, env_otp);
    await authNavigator.closeModal(page);
    await authNavigator.switchToProduct(page, 'Sales');
    await page.context().storageState({ path: path.join(__dirname, './auth-sales.json') });
});
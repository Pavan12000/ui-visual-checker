import dotenv from 'dotenv';
dotenv.config();

// Authentication variables
export const env_url = process.env.URL as string;
export const env_username_talent = process.env.USERNAME_TALENT as string; // playwright2
export const env_username_sales = process.env.USERNAME_SALES as string; // playwright1
export const env_otp = process.env.OTP as string;

// Visual regression settings with defaults
export const keepRunsCount = parseInt(process.env.KEEP_RUNS_COUNT || '5');
export const pixelDiffThreshold = parseFloat(process.env.PIXEL_DIFF_THRESHOLD || '10.0');
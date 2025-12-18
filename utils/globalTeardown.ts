import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

async function globalTeardown() {
  const filePath1 = path.join(__dirname, 'e2e/testdata/auth/auth-sales.json');
  const filePath2 = path.join(__dirname, 'e2e/testdata/auth/auth-talent.json');
  if (fs.existsSync(filePath1)) {
    fs.unlinkSync(filePath1);
    console.log('Deleted auth-sales.json file after tests');
  }
  if (fs.existsSync(filePath2)) {
    fs.unlinkSync(filePath2);
    console.log('Deleted auth-talent.json file after tests');
  }

  const TODAY = new Date().toISOString().split('T')[0];
  const REPORT_DIR = 'reports';
  const RESULTS_JSON = path.join(REPORT_DIR, `results-${TODAY}.json`);
  
  // Check if results file exists before generating report
  if (!fs.existsSync(RESULTS_JSON)) {
    console.log('\nℹ️ No test results to generate report from (tests may have failed or not run)\n');
    return;
  }
  
  console.log('\n🎨 Generating visual diff report...');
  
  try {
    // Run report generation (includes cleanup)
    await execAsync('tsx scripts/reports.ts');
    
    console.log('✅ Report generation and cleanup completed');
    
    // Open the report in browser
    const SUMMARY_HTML = path.join(REPORT_DIR, `summary-${TODAY}.html`);
    if (fs.existsSync(SUMMARY_HTML)) {
      console.log('🌐 Opening report in browser...\n');
      console.log(`open ${SUMMARY_HTML}`);
    }
  } catch (error) {
    console.error('⚠️ Error during report generation:', error);
  }
}

export default globalTeardown;


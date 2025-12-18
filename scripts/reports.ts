import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import {
  compareImages,
  createImageTag,
  calculateDiffPercentage,
  createSummaryCards,
  generateHTMLPage,
  listAvailableDates,
  cleanupOldFiles,
  compareLayoutFiles,
  createLayoutChangesHTML,
  createHybridSummary,
  generateLayoutOverlay
} from './reportMethods.js';
import { reportStyles } from './reportStyles.js';
import { keepRunsCount, pixelDiffThreshold } from '../utils/envFile.js';

// ===== INTERFACES =====
interface TestResult {
  url: string;
  viewName: string;
  date: string;
  previousDate: string | null;
  status: string;
  errors: string[];
  previousPath: string | null;
  todayPath: string;
  todayLayoutPath?: string;
  previousLayoutPath?: string | null;
  diffPath: string | null;
  diffPixels: number;
  layoutChanges?: any;
}

interface ComparisonResult {
  viewName: string;
  date1: string;
  date2: string;
  path1: string;
  path2: string;
  diffPath: string | null;
  diffPixels: number;
  status: string;
}

// ===== CONFIGURATION =====
const TODAY = new Date().toISOString().split('T')[0];
const DAILY_DIR = 'screenshots/daily';
const DIFF_DIR = 'screenshots/diffs';
const REPORT_DIR = 'reports';

// Threshold configuration (from .env, default: 2.0%)
const PIXEL_DIFF_THRESHOLD = pixelDiffThreshold;

// ===== MAIN FUNCTIONS =====

/**
 * Generate daily visual regression report
 */
export function generateDailyReport(): void {
  const RESULTS_JSON = path.join(REPORT_DIR, `results-${TODAY}.json`);
  const SUMMARY_HTML = path.join(REPORT_DIR, `summary-${TODAY}.html`);

  if (!fs.existsSync(RESULTS_JSON)) {
    console.error('❌ No results found for today.');
    process.exit(1);
  }

  let results: TestResult[] = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
  fs.mkdirSync(DIFF_DIR, { recursive: true });

  // Clean up ALL old diff files before generating new ones
  console.log('🧹 Cleaning up all old diff files...');
  if (fs.existsSync(DIFF_DIR)) {
    const oldDiffs = fs.readdirSync(DIFF_DIR).filter(f => f.endsWith('.png'));
    let removedCount = 0;
    oldDiffs.forEach(diffFile => {
      try {
        const diffPath = path.join(DIFF_DIR, diffFile);
        fs.unlinkSync(diffPath);
        removedCount++;
      } catch (err) {
        console.warn(`⚠️ Could not remove ${diffFile}`);
      }
    });
    console.log(`🗑️ Removed ${removedCount} old diff file(s)`);
  }

  // Process comparisons
  results = results.map(r => {
    const previous = r.previousPath;
    const today = r.todayPath;
    let diffCount = 0;
    let totalPixels = 0;
    let imageWidth = 0;
    let imageHeight = 0;
    let diffPath: string | null = null;

    // Visual comparison (pixel-based)
    if (previous && fs.existsSync(previous) && fs.existsSync(today)) {
      try {
        diffPath = path.join(DIFF_DIR, `${r.viewName}-diff.png`);
        const comparisonResult = compareImages(previous, today, diffPath);
        diffCount = comparisonResult.diffPixels;
        totalPixels = comparisonResult.totalPixels;
        imageWidth = comparisonResult.width;
        imageHeight = comparisonResult.height;
        
        if (diffCount > 0) {
          const diffPercent = calculateDiffPercentage(diffCount, totalPixels);
          console.log(`🛠️ Visual diff for ${r.url}: ${diffCount} pixels (${diffPercent}%) [Image: ${imageWidth}x${imageHeight}]`);
        }
      } catch (err) {
        const error = err as Error;
        console.warn(`⚠️ Failed to compare images for ${r.url}: ${error.message}`);
        diffPath = null;
      }
    } else if (!previous) {
      console.log(`ℹ️ First run for ${r.url} - no previous screenshot`);
    } else {
      console.warn(`⚠️ Previous or today image missing for ${r.url}`);
    }

    // Layout comparison (hybrid approach)
    let layoutComparisonResult: any = null;
    let layoutOverlayPath: string | null = null;
    
    if (r.todayLayoutPath && r.previousLayoutPath) {
      layoutComparisonResult = compareLayoutFiles(r.previousLayoutPath, r.todayLayoutPath);
      if (layoutComparisonResult && layoutComparisonResult.totalChanges > 0) {
        console.log(`📐 Layout changes for ${r.url}: ${layoutComparisonResult.totalChanges} changes (Score: ${layoutComparisonResult.layoutScore}/100)`);
        
        layoutOverlayPath = path.join(DIFF_DIR, `${r.viewName}-layout-overlay.png`);
        generateLayoutOverlay(
          r.todayPath,
          layoutComparisonResult,
          r.previousLayoutPath,
          r.todayLayoutPath,
          layoutOverlayPath
        );
        console.log(`🎨 Layout overlay created for ${r.url}`);
      }
    }

    // Calculate diff percentage using actual image dimensions
    const diffPercent = totalPixels > 0 ? parseFloat(calculateDiffPercentage(diffCount, totalPixels)) : 0;
    
    // Determine status using hybrid approach (layout + visual)
    // - Error: If has errors OR major layout/visual changes
    // - Diff: If moderate changes in layout or visual
    // - OK: No errors and minimal/no changes
    let status: string;
    const hybridSummary = createHybridSummary(layoutComparisonResult, diffCount, totalPixels);
    
    if (r.errors && r.errors.length > 0) {
      status = '❌ Error';
    } else if (hybridSummary.status === 'error') {
      status = '❌ Error';
      console.log(`❌ ${r.url} failed: ${hybridSummary.description}`);
    } else if (hybridSummary.status === 'warning') {
      status = '⚠️ Diff';
    } else {
      status = '✅ OK';
    }

    return { 
      ...r, 
      diffPixels: diffCount, 
      diffPath,
      layoutOverlayPath,
      status,
      totalPixels: totalPixels || 1920 * 1080,
      imageWidth,
      imageHeight,
      layoutChanges: layoutComparisonResult
    };
  });

  fs.writeFileSync(RESULTS_JSON, JSON.stringify(results, null, 2));

  // Generate table rows
  const rows = results.map(r => {
    const totalPixels = (r as any).totalPixels || 1920 * 1080;
    const diffPercent = calculateDiffPercentage(r.diffPixels, totalPixels);
    const parsedDiffPercent = parseFloat(diffPercent);
    const isFirstRun = !r.previousPath;
    const isError = r.status.includes('❌');
    const layoutChanges = (r as any).layoutChanges;
    const hasLayoutChanges = layoutChanges && layoutChanges.totalChanges > 0;
    const hasVisualChanges = parsedDiffPercent > pixelDiffThreshold / 4;
    const hasConsoleErrors = r.errors && r.errors.length > 0;
    const product = (r as any).product || '';
    const productBadge = product ? `<span style="background: #2196f3; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 5px;">${product}</span>` : '';
    
    const rowClasses = [
      isError ? 'has-error' : (r.diffPixels > 0 || hasLayoutChanges) ? 'has-diff' : '',
      hasVisualChanges ? 'has-visual-changes' : '',
      hasLayoutChanges ? 'has-layout-changes' : '',
      hasConsoleErrors ? 'has-console-errors' : ''
    ].filter(c => c).join(' ');
    
    return `
<tr class="${rowClasses}">
  <td style="max-width:300px; word-break:break-word;">
    ${isError ? '<span style="background: #f44336; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 5px;">ERROR</span>' : ''}
    ${productBadge}
    <strong>${r.url}</strong>
    ${r.diffPixels > 0 ? `<br><span class="diff-info">📸 Visual: ${r.diffPixels.toLocaleString()} pixels (${diffPercent}%)</span>` : ''}
    ${hasLayoutChanges ? `<br><span class="diff-info">📐 Layout: ${layoutChanges.totalChanges} changes (Score: ${layoutChanges.layoutScore}/100)</span>` : ''}
    ${isFirstRun ? '<br><span style="color: #999; font-size: 12px;">First run - no comparison</span>' : ''}
  </td>
  <td class="status-cell">${r.status}</td>
  <td>
    ${(r.errors && r.errors.length) ? r.errors.join('<br>') : ''}
    ${!isFirstRun ? createLayoutChangesHTML(layoutChanges) : ''}
    ${r.errors.length === 0 && !hasLayoutChanges && !isFirstRun ? '-' : ''}
  </td>
  <td>
    <div class="comparison-grid${hasLayoutChanges ? ' four-col' : ''}">
      ${r.previousPath ? createImageTag(r.previousPath, `📅 ${r.previousDate}`) : `<div class="img-placeholder">📅 ${r.previousDate || 'Previous'}<br>Not available</div>`}
      ${createImageTag(r.todayPath, `🆕 ${r.date}`)}
      ${r.diffPixels > 0 ? createImageTag(r.diffPath, '⚠️ Visual Differences') : `<div class="img-placeholder">⚠️ Visual Differences<br>${isFirstRun ? 'First run' : 'No changes'}</div>`}
      ${hasLayoutChanges && (r as any).layoutOverlayPath ? createImageTag((r as any).layoutOverlayPath, '📐 Layout Changes') : ''}
    </div>
  </td>
</tr>`;
  }).join('\n');

  const okCount = results.filter(r => r.status.includes('✅')).length;
  const diffCount = results.filter(r => r.status.includes('⚠️')).length;
  const errorCount = results.filter(r => r.status.includes('❌')).length;
  const totalCount = results.length;
  
  const visualIssuesCount = results.filter(r => {
    const totalPixels = (r as any).totalPixels || 1920 * 1080;
    const diffPercent = r.diffPixels > 0 ? parseFloat(calculateDiffPercentage(r.diffPixels, totalPixels)) : 0;
    return diffPercent > pixelDiffThreshold / 4;
  }).length;
  
  const layoutIssuesCount = results.filter(r => {
    const layoutChanges = (r as any).layoutChanges;
    return layoutChanges && layoutChanges.totalChanges > 0;
  }).length;
  
  const consoleErrorsCount = results.filter(r => r.errors && r.errors.length > 0).length;

  const headerContent = `
  <h1>🎨 UI Hybrid Regression Report</h1>
  <p style="color: #666; margin: 5px 0;">Layout + Visual Comparison • Generated on ${TODAY}</p>
  
  <div style="margin: 20px 0; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px; text-align: center;">
      📊 Test Statistics
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
      <div style="background: #f5f5f5; padding: 15px; border-radius: 6px;">
        <div style="font-size: 14px; font-weight: 600; color: #666; margin-bottom: 10px;">Test Results</div>
        <div style="display: flex; justify-content: space-around;">
          <div class="filter-btn" data-filter="all" onclick="filterTests('all')" style="text-align: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
            <div style="font-size: 28px; font-weight: bold; color: #2196f3;">${totalCount}</div>
            <div style="font-size: 12px; color: #666;">Total</div>
          </div>
          <div class="filter-btn" data-filter="passed" onclick="filterTests('passed')" style="text-align: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
            <div style="font-size: 28px; font-weight: bold; color: #4caf50;">${okCount}</div>
            <div style="font-size: 12px; color: #666;">✅ Passed</div>
          </div>
          <div class="filter-btn" data-filter="changes" onclick="filterTests('changes')" style="text-align: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
            <div style="font-size: 28px; font-weight: bold; color: #ff9800;">${diffCount}</div>
            <div style="font-size: 12px; color: #666;">⚠️ Changes</div>
          </div>
          <div class="filter-btn" data-filter="errors" onclick="filterTests('errors')" style="text-align: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
            <div style="font-size: 28px; font-weight: bold; color: #f44336;">${errorCount}</div>
            <div style="font-size: 12px; color: #666;">❌ Errors</div>
          </div>
        </div>
      </div>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 6px;">
        <div style="font-size: 14px; font-weight: 600; color: #666; margin-bottom: 10px;">Issue Breakdown</div>
        <div style="display: flex; justify-content: space-around;">
          <div class="filter-btn" data-filter="visual" onclick="filterTests('visual')" style="text-align: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
            <div style="font-size: 28px; font-weight: bold; color: #ff9800;">${visualIssuesCount}</div>
            <div style="font-size: 12px; color: #666;">📸 Visual</div>
          </div>
          <div class="filter-btn" data-filter="layout" onclick="filterTests('layout')" style="text-align: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
            <div style="font-size: 28px; font-weight: bold; color: #9c27b0;">${layoutIssuesCount}</div>
            <div style="font-size: 12px; color: #666;">📐 Layout</div>
          </div>
          <div class="filter-btn" data-filter="console" onclick="filterTests('console')" style="text-align: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;">
            <div style="font-size: 28px; font-weight: bold; color: #f44336;">${consoleErrorsCount}</div>
            <div style="font-size: 12px; color: #666;">🐛 Console</div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

  const html = generateHTMLPage(
    `UI Hybrid Regression Report - ${TODAY}`,
    headerContent,
    rows,
    ['URL|width="20%"', 'Status|width="10%"', 'Layout & Errors|width="20%"', 'Visual Comparison|width="50%"'],
    reportStyles
  );

  fs.writeFileSync(SUMMARY_HTML, html);
  console.log(`✅ HTML report created at: ${SUMMARY_HTML}`);
  
  // Automatically open the report in the default browser
  console.log(`🌐 Opening report in browser...`);
  exec(`open ${SUMMARY_HTML}`, (error) => {
    if (error) {
      console.log(`⚠️ Could not auto-open report. Please open manually: ${SUMMARY_HTML}`);
    }
  });
}

/**
 * Compare screenshots between two specific dates
 */
export function compareDates(date1: string, date2: string): void {
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date1) || !dateRegex.test(date2)) {
    console.error('❌ Invalid date format. Use YYYY-MM-DD format.');
    process.exit(1);
  }

  const DATE1_DIR = path.join(DAILY_DIR, date1);
  const DATE2_DIR = path.join(DAILY_DIR, date2);
  const RESULTS_JSON = path.join(REPORT_DIR, `comparison-${date1}-vs-${date2}.json`);
  const SUMMARY_HTML = path.join(REPORT_DIR, `comparison-${date1}-vs-${date2}.html`);

  if (!fs.existsSync(DATE1_DIR)) {
    console.error(`❌ Directory not found: ${DATE1_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(DATE2_DIR)) {
    console.error(`❌ Directory not found: ${DATE2_DIR}`);
    process.exit(1);
  }

  console.log(`📊 Comparing screenshots: ${date1} vs ${date2}\n`);

  // Scan for screenshots in product subdirectories
  const screenshots1Map = new Map<string, string>(); // filename -> full path
  const screenshots2Map = new Map<string, string>();

  // Helper function to scan directory (flat or with product subdirs)
  function scanDirectory(dir: string, map: Map<string, string>) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Product subdirectory - scan it
        const subItems = fs.readdirSync(itemPath).filter(f => f.endsWith('.png'));
        subItems.forEach(file => {
          map.set(file, path.join(itemPath, file));
        });
      } else if (item.endsWith('.png')) {
        // Direct screenshot file (old structure)
        map.set(item, itemPath);
      }
    }
  }

  scanDirectory(DATE1_DIR, screenshots1Map);
  scanDirectory(DATE2_DIR, screenshots2Map);

  // Find common screenshots
  const commonScreenshots = Array.from(screenshots1Map.keys())
    .filter(s => screenshots2Map.has(s));

  if (commonScreenshots.length === 0) {
    console.error('❌ No common screenshots found between the two dates.');
    process.exit(1);
  }

  console.log(`Found ${commonScreenshots.length} screenshots to compare\n`);

  fs.mkdirSync(DIFF_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  // Clean up old comparison diff files for this date pair
  console.log('🧹 Cleaning up old comparison diff files...');
  if (fs.existsSync(DIFF_DIR)) {
    const oldComparisonDiffs = fs.readdirSync(DIFF_DIR)
      .filter(f => f.includes(`${date1}-vs-${date2}`) && f.endsWith('.png'));
    oldComparisonDiffs.forEach(diffFile => {
      const diffPath = path.join(DIFF_DIR, diffFile);
      fs.unlinkSync(diffPath);
    });
    console.log(`🗑️ Removed ${oldComparisonDiffs.length} old comparison diff file(s)\n`);
  }

  const results: ComparisonResult[] = [];

  for (const screenshot of commonScreenshots) {
    const path1 = screenshots1Map.get(screenshot)!;
    const path2 = screenshots2Map.get(screenshot)!;
    const viewName = screenshot.replace('.png', '');
    
    let diffCount = 0;
    let totalPixels = 0;
    let diffPath: string | null = null;

    try {
      diffPath = path.join(DIFF_DIR, `${viewName}-${date1}-vs-${date2}-diff.png`);
      const comparisonResult = compareImages(path1, path2, diffPath);
      diffCount = comparisonResult.diffPixels;
      totalPixels = comparisonResult.totalPixels;

      if (diffCount > 0) {
        const diffPercent = calculateDiffPercentage(diffCount, totalPixels);
        console.log(`🛠️ Diff generated for ${viewName}: ${diffCount} pixels (${diffPercent}%) [${comparisonResult.width}x${comparisonResult.height}]`);
      } else {
        console.log(`✅ No differences for ${viewName}`);
      }
    } catch (err) {
      const error = err as Error;
      console.warn(`⚠️ Failed to compare ${viewName}: ${error.message}`);
      diffPath = null;
    }

    results.push({
      viewName,
      date1,
      date2,
      path1,
      path2,
      diffPath,
      diffPixels: diffCount,
      status: diffCount > 0 ? '⚠️ Diff' : '✅ OK',
      totalPixels: totalPixels || 1920 * 1080
    } as any);
  }

  fs.writeFileSync(RESULTS_JSON, JSON.stringify(results, null, 2));

  const rows = results.map(r => {
    const totalPixels = (r as any).totalPixels || 1920 * 1080;
    const diffPercent = calculateDiffPercentage(r.diffPixels, totalPixels);
    
    return `
<tr class="${r.diffPixels > 0 ? 'has-diff' : ''}">
  <td style="max-width:300px; word-break:break-word;">
    <strong>${r.viewName}</strong>
    ${r.diffPixels > 0 ? `<br><span class="diff-info">${r.diffPixels.toLocaleString()} pixels changed (${diffPercent}%)</span>` : ''}
  </td>
  <td class="status-cell">${r.status}</td>
  <td>
    <div class="comparison-grid">
      ${createImageTag(r.path1, `📅 ${r.date1}`)}
      ${createImageTag(r.path2, `📅 ${r.date2}`)}
      ${r.diffPixels > 0 ? createImageTag(r.diffPath, '⚠️ Differences') : '<div class="img-placeholder">⚠️ Differences<br>No changes</div>'}
    </div>
  </td>
</tr>`;
  }).join('\n');

  const okCount = results.filter(r => r.status.includes('✅')).length;
  const diffCount = results.filter(r => r.status.includes('⚠️')).length;

  const headerContent = `
  <h1>📊 Date Comparison Report</h1>
  <div class="comparison-dates">
    <span class="date-badge">📅 ${date1}</span>
    <span style="font-size: 24px;">⟷</span>
    <span class="date-badge">📅 ${date2}</span>
  </div>
  ${createSummaryCards(okCount, diffCount)}
`;

  const html = generateHTMLPage(
    `Date Comparison: ${date1} vs ${date2}`,
    headerContent,
    rows,
    ['Page|width="25%"', 'Status|width="10%"', 'Visual Comparison|width="65%"'],
    reportStyles
  );

  fs.writeFileSync(SUMMARY_HTML, html);
  console.log(`\n✅ Comparison report created at: ${SUMMARY_HTML}`);
  console.log(`\nClick to open report: open ${SUMMARY_HTML}`);
  exec(`open ${SUMMARY_HTML}`);
}

/**
 * List all available screenshot dates
 */
export function showAvailableDates(): void {
  const dates = listAvailableDates(DAILY_DIR);

  if (dates.length === 0) {
    console.log('📁 No screenshot history found yet. Run tests first!');
    process.exit(0);
  }

  console.log('\n📅 Available screenshot dates:\n');
  console.log('┌─────────────┬────────────┐');
  console.log('│    Date     │ Screenshots│');
  console.log('├─────────────┼────────────┤');

  dates.forEach((date, index) => {
    const dateDir = path.join(DAILY_DIR, date);
    const screenshots = fs.readdirSync(dateDir).filter(f => f.endsWith('.png'));
    const label = index === 0 ? ' (latest)' : '';
    console.log(`│ ${date}${label.padEnd(9)} │ ${screenshots.length.toString().padStart(10)} │`);
  });

  console.log('└─────────────┴────────────┘\n');
  console.log('💡 To compare two dates, run:');
  console.log(`   npx tsx scripts/reports.ts compare ${dates[1] || dates[0]} ${dates[0]}\n`);
}

/**
 * Cleanup old screenshot directories and reports
 */
export function cleanupOldRuns(keepCount: number = keepRunsCount): void {
  console.log(`🧹 Cleaning up old runs (keeping last ${keepCount})...\n`);
  
  // Cleanup old daily screenshots
  cleanupOldFiles(DAILY_DIR, /^\d{4}-\d{2}-\d{2}$/, keepCount);
  
  // Cleanup old summary reports
  cleanupOldFiles(REPORT_DIR, /summary-\d{4}-\d{2}-\d{2}\.html$/, keepCount);
  
  // Cleanup old result files
  cleanupOldFiles(REPORT_DIR, /results-\d{4}-\d{2}-\d{2}\.json$/, keepCount);
  
  console.log('\n✅ Cleanup completed');
}

// ===== CLI EXECUTION =====
const command = process.argv[2];

if (command === 'compare') {
  const date1 = process.argv[3];
  const date2 = process.argv[4];
  
  if (!date1 || !date2) {
    console.error('❌ Usage: npx tsx scripts/reports.ts compare <date1> <date2>');
    console.error('   Example: npx tsx scripts/reports.ts compare 2025-10-08 2025-10-13');
    process.exit(1);
  }
  
  compareDates(date1, date2);
} else if (command === 'list') {
  showAvailableDates();
} else if (command === 'cleanup') {
  const keep = parseInt(process.argv[3] || String(keepRunsCount));
  cleanupOldRuns(keep);
} else {
  // Default: generate daily report
  generateDailyReport();
  cleanupOldRuns(keepRunsCount);
}


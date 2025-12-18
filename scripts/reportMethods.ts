import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import {
  PageLayout,
  LayoutComparisonResult,
  compareLayouts,
  getLayoutChangeSummary,
  getLayoutStatus,
  LayoutChange
} from '../utils/layoutAnalyzer.js';
import { pixelDiffThreshold } from '../utils/envFile.js';

// ===== IMAGE UTILITIES =====

/**
 * Convert image to base64 encoded data URL for embedding in HTML
 */
export function imageToBase64(imagePath: string): string {
  const base64 = fs.readFileSync(imagePath).toString('base64');
  const ext = path.extname(imagePath).substring(1) || 'png';
  return `data:image/${ext};base64,${base64}`;
}

/**
 * Generate HTML tag for an image with label
 */
export function createImageTag(imagePath: string | null, label: string): string {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return `<div class="img-placeholder">${label}<br>Not available</div>`;
  }
  
  const base64 = imageToBase64(imagePath);
  return `
    <div class="img-container">
      <div class="img-label">${label}</div>
      <img src="${base64}" class="screenshot" onclick="this.classList.toggle('zoomed')">
    </div>`;
}

/**
 * Compare two images and return diff pixel count and total pixels
 * Returns: { diffPixels: number, totalPixels: number, width: number, height: number }
 */
export function compareImages(
  path1: string,
  path2: string,
  outputDiffPath: string | null = null,
  threshold: number = 0.01  // More sensitive: 1% color difference (was 0.1 = 10%)
): { diffPixels: number; totalPixels: number; width: number; height: number } {
  try {
    const img1 = PNG.sync.read(fs.readFileSync(path1));
    const img2 = PNG.sync.read(fs.readFileSync(path2));

    if (img1.width === img2.width && img1.height === img2.height) {
      // Same dimensions - direct comparison
      const diff = new PNG({ width: img1.width, height: img1.height });
      const diffCount = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold });

      if (diffCount > 0 && outputDiffPath) {
        fs.writeFileSync(outputDiffPath, PNG.sync.write(diff));
      }
      
      return {
        diffPixels: diffCount,
        totalPixels: img1.width * img1.height,
        width: img1.width,
        height: img1.height
      };
    } else {
      // Different dimensions - resize to max dimensions
      const width = Math.max(img1.width, img2.width);
      const height = Math.max(img1.height, img2.height);
      
      const img1Canvas = new PNG({ width, height });
      const img2Canvas = new PNG({ width, height });
      const diff = new PNG({ width, height });

      // Copy img1 data
      for (let y = 0; y < img1.height; y++) {
        for (let x = 0; x < img1.width; x++) {
          const idx = (width * y + x) << 2;
          const srcIdx = (img1.width * y + x) << 2;
          img1Canvas.data[idx] = img1.data[srcIdx];
          img1Canvas.data[idx + 1] = img1.data[srcIdx + 1];
          img1Canvas.data[idx + 2] = img1.data[srcIdx + 2];
          img1Canvas.data[idx + 3] = img1.data[srcIdx + 3];
        }
      }

      // Copy img2 data
      for (let y = 0; y < img2.height; y++) {
        for (let x = 0; x < img2.width; x++) {
          const idx = (width * y + x) << 2;
          const srcIdx = (img2.width * y + x) << 2;
          img2Canvas.data[idx] = img2.data[srcIdx];
          img2Canvas.data[idx + 1] = img2.data[srcIdx + 1];
          img2Canvas.data[idx + 2] = img2.data[srcIdx + 2];
          img2Canvas.data[idx + 3] = img2.data[srcIdx + 3];
        }
      }

      const diffCount = pixelmatch(img1Canvas.data, img2Canvas.data, diff.data, width, height, { threshold });

      if (diffCount > 0 && outputDiffPath) {
        fs.writeFileSync(outputDiffPath, PNG.sync.write(diff));
      }
      
      return {
        diffPixels: diffCount,
        totalPixels: width * height,
        width: width,
        height: height
      };
    }
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to compare images: ${error.message}`);
  }
}

// ===== CALCULATION UTILITIES =====

/**
 * Calculate percentage of pixels changed
 */
export function calculateDiffPercentage(diffPixels: number, totalPixels: number): string {
  if (totalPixels === 0) return '0.00';
  return diffPixels > 0 ? ((diffPixels / totalPixels) * 100).toFixed(2) : '0.00';
}

// ===== HTML GENERATION UTILITIES =====

/**
 * Generate summary cards HTML
 */
export function createSummaryCards(okCount: number, diffCount: number, errorCount: number = 0): string {
  return `
    <div class="summary">
      <div class="summary-card ok">
        <div class="count">${okCount}</div>
        <div class="label">✅ Passed</div>
      </div>
      <div class="summary-card diff">
        <div class="count">${diffCount}</div>
        <div class="label">⚠️ Visual Changes</div>
      </div>
      ${errorCount > 0 ? `
      <div class="summary-card error">
        <div class="count">${errorCount}</div>
        <div class="label">❌ Errors</div>
      </div>` : ''}
    </div>`;
}

/**
 * Generate complete HTML page
 */
export function generateHTMLPage(
  title: string,
  headerContent: string,
  tableRows: string,
  tableHeaders: string[],
  styles: string
): string {
  const headers = tableHeaders.map(h => {
    const [text, width] = h.split('|');
    return `<th ${width || ''}>${text}</th>`;
  }).join('\n      ');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
${styles}
</style>
</head>
<body>
<div class="header">
  ${headerContent}
</div>

<table>
  <thead>
    <tr>
      ${headers}
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>

<div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
  💡 Click on any screenshot to zoom in/out • Click on statistics to filter results
</div>

<script>
function filterTests(filterType) {
  const rows = document.querySelectorAll('tbody tr');
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  filterBtns.forEach(btn => btn.classList.remove('active'));
  
  if (filterType === 'all') {
    rows.forEach(row => row.style.display = '');
    return;
  }
  
  document.querySelector(\`.filter-btn[data-filter="\${filterType}"]\`)?.classList.add('active');
  
  rows.forEach(row => {
    const status = row.querySelector('.status-cell')?.textContent?.trim() || '';
    const hasErrors = row.querySelector('td:nth-child(3)')?.textContent?.includes('Console error') || false;
    const hasLayoutChanges = row.classList.contains('has-layout-changes');
    const hasVisualChanges = row.classList.contains('has-visual-changes');
    
    let shouldShow = false;
    
    switch(filterType) {
      case 'passed':
        shouldShow = status.includes('✅');
        break;
      case 'changes':
        shouldShow = status.includes('⚠️');
        break;
      case 'errors':
        shouldShow = status.includes('❌');
        break;
      case 'visual':
        shouldShow = hasVisualChanges;
        break;
      case 'layout':
        shouldShow = hasLayoutChanges;
        break;
      case 'console':
        shouldShow = hasErrors;
        break;
    }
    
    row.style.display = shouldShow ? '' : 'none';
  });
}
</script>
</body>
</html>`;
}

// ===== FILE SYSTEM UTILITIES =====

/**
 * List all available screenshot dates
 */
export function listAvailableDates(dailyDir: string): string[] {
  if (!fs.existsSync(dailyDir)) return [];
  return fs.readdirSync(dailyDir)
    .filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))
    .sort()
    .reverse();
}

/**
 * Cleanup old directories/files, keep only last N
 */
export function cleanupOldFiles(directory: string, pattern: RegExp, keepCount: number): void {
  if (!fs.existsSync(directory)) return;
  
  const files = fs.readdirSync(directory)
    .filter(f => pattern.test(f))
    .sort();
  
  if (files.length > keepCount) {
    const remove = files.slice(0, files.length - keepCount);
    remove.forEach(f => {
      const filePath = path.join(directory, f);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`🧹 Removed old directory: ${filePath}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`🧹 Removed old file: ${filePath}`);
      }
    });
  }
}

// ===== LAYOUT COMPARISON UTILITIES =====

/**
 * Compare layout files if they exist
 */
export function compareLayoutFiles(
  previousLayoutPath: string | null,
  todayLayoutPath: string
): LayoutComparisonResult | null {
  if (!previousLayoutPath || !fs.existsSync(previousLayoutPath)) {
    return null;
  }
  
  if (!fs.existsSync(todayLayoutPath)) {
    return null;
  }

  try {
    const previousLayout: PageLayout = JSON.parse(fs.readFileSync(previousLayoutPath, 'utf-8'));
    const todayLayout: PageLayout = JSON.parse(fs.readFileSync(todayLayoutPath, 'utf-8'));
    
    return compareLayouts(previousLayout, todayLayout);
  } catch (err) {
    const error = err as Error;
    console.warn(`⚠️ Failed to compare layouts: ${error.message}`);
    return null;
  }
}

/**
 * Generate visual overlay showing layout changes on screenshot
 */
export function generateLayoutOverlay(
  screenshotPath: string,
  layoutChanges: LayoutComparisonResult,
  previousLayoutPath: string,
  todayLayoutPath: string,
  outputPath: string
): void {
  try {
    const image = PNG.sync.read(fs.readFileSync(screenshotPath));
    const previousLayout: PageLayout = JSON.parse(fs.readFileSync(previousLayoutPath, 'utf-8'));
    const todayLayout: PageLayout = JSON.parse(fs.readFileSync(todayLayoutPath, 'utf-8'));
    
    layoutChanges.changes.forEach((change) => {
      const todayElement = todayLayout.elements.find(e => e.selector === change.selector && e.label === change.label);
      const previousElement = previousLayout.elements.find(e => e.selector === change.selector && e.label === change.label);
      
      let color = { r: 255, g: 152, b: 0, a: 180 };
      
      if (change.type === 'missing') {
        color = { r: 244, g: 67, b: 54, a: 180 };
      } else if (change.type === 'new') {
        color = { r: 76, g: 175, b: 80, a: 180 };
      } else if (change.severity === 'major') {
        color = { r: 244, g: 67, b: 54, a: 180 };
      } else if (change.severity === 'moderate') {
        color = { r: 255, g: 152, b: 0, a: 180 };
      } else {
        color = { r: 255, g: 167, b: 38, a: 150 };
      }
      
      const element = (change.type === 'missing' ? previousElement : todayElement);
      if (!element) return;
      
      drawBox(image, element.x, element.y, element.width, element.height, color, change.type === 'missing');
    });
    
    fs.writeFileSync(outputPath, PNG.sync.write(image));
  } catch (err) {
    const error = err as Error;
    console.warn(`⚠️ Failed to generate layout overlay: ${error.message}`);
  }
}

function drawBox(
  image: PNG,
  x: number,
  y: number,
  width: number,
  height: number,
  color: { r: number; g: number; b: number; a: number },
  dashed: boolean = false
): void {
  const thickness = 3;
  
  for (let i = 0; i < thickness; i++) {
    for (let px = x; px < x + width; px++) {
      if (dashed && Math.floor(px / 10) % 2 === 0) continue;
      setPixel(image, px, y + i, color);
      setPixel(image, px, y + height - 1 - i, color);
    }
    
    for (let py = y; py < y + height; py++) {
      if (dashed && Math.floor(py / 10) % 2 === 0) continue;
      setPixel(image, x + i, py, color);
      setPixel(image, x + width - 1 - i, py, color);
    }
  }
  
  const overlayAlpha = 50;
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      if (py < y + thickness || py >= y + height - thickness || 
          px < x + thickness || px >= x + width - thickness) continue;
      
      const idx = (image.width * py + px) << 2;
      if (idx >= 0 && idx < image.data.length) {
        image.data[idx] = Math.min(255, (image.data[idx] * (255 - overlayAlpha) + color.r * overlayAlpha) / 255);
        image.data[idx + 1] = Math.min(255, (image.data[idx + 1] * (255 - overlayAlpha) + color.g * overlayAlpha) / 255);
        image.data[idx + 2] = Math.min(255, (image.data[idx + 2] * (255 - overlayAlpha) + color.b * overlayAlpha) / 255);
      }
    }
  }
}

function setPixel(image: PNG, x: number, y: number, color: { r: number; g: number; b: number; a: number }): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  
  const idx = (image.width * y + x) << 2;
  if (idx >= 0 && idx < image.data.length) {
    image.data[idx] = color.r;
    image.data[idx + 1] = color.g;
    image.data[idx + 2] = color.b;
    image.data[idx + 3] = color.a;
  }
}

/**
 * Generate HTML for layout changes details
 */
export function createLayoutChangesHTML(layoutResult: LayoutComparisonResult | null): string {
  if (!layoutResult || layoutResult.totalChanges === 0) {
    return '<div class="layout-summary ok">✅ No layout changes detected</div>';
  }

  const summary = getLayoutChangeSummary(layoutResult);
  const statusInfo = getLayoutStatus(layoutResult);
  
  const statusClass = statusInfo.status === 'error' ? 'error' : 
                      statusInfo.status === 'warning' ? 'warning' : 'ok';

  // Create collapsible details for each change
  const changeDetails = layoutResult.changes
    .sort((a, b) => {
      const severityOrder = { major: 0, moderate: 1, minor: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .map(change => {
      const severityIcon = change.severity === 'major' ? '🔴' : 
                          change.severity === 'moderate' ? '🟡' : '🟢';
      const severityClass = `severity-${change.severity}`;
      
      return `
        <div class="layout-change-item ${severityClass}">
          <span class="severity-icon">${severityIcon}</span>
          <span class="change-type">${change.type.toUpperCase()}</span>
          <span class="change-details">${change.details}</span>
        </div>`;
    }).join('');

  return `
    <div class="layout-summary ${statusClass}">
      <div class="layout-score" style="display:none;">
        <span class="score-label">Layout Score:</span>
        <span class="score-value">${layoutResult.layoutScore}/100</span>
      </div>
      <div class="layout-score">
        <span class="score-label">Layout Changes:</span>
      </div>
      <div class="layout-changes-summary">
        ${statusInfo.icon} ${summary}
      </div>
      <details class="layout-details">
        <summary>View ${layoutResult.totalChanges} Change(s)</summary>
        <div class="layout-changes-list">
          ${changeDetails}
        </div>
      </details>
    </div>`;
}

/**
 * Generate hybrid comparison summary (combines layout + visual)
 */
export function createHybridSummary(
  layoutResult: LayoutComparisonResult | null,
  diffPixels: number,
  totalPixels: number
): { status: string; icon: string; description: string } {
  const layoutStatus = layoutResult ? getLayoutStatus(layoutResult) : { status: 'ok', icon: '✅' };
  const diffPercent = parseFloat(calculateDiffPercentage(diffPixels, totalPixels));
  
  const errorThreshold = pixelDiffThreshold;
  const warningThreshold = pixelDiffThreshold / 4;
  
  let overallStatus = 'ok';
  let overallIcon = '✅';
  let description = 'No changes';

  if (layoutStatus.status === 'error' || diffPercent > errorThreshold) {
    overallStatus = 'error';
    overallIcon = '❌';
    description = 'Major changes detected';
  } else if (layoutStatus.status === 'warning' || (diffPixels > 0 && diffPercent > warningThreshold)) {
    overallStatus = 'warning';
    overallIcon = '⚠️';
    description = 'Minor changes detected';
  } else if (layoutResult && layoutResult.totalChanges > 0) {
    overallStatus = 'warning';
    overallIcon = '⚠️';
    description = 'Layout adjustments';
  } else if (diffPixels > 0) {
    overallStatus = 'ok';
    overallIcon = '✅';
    description = 'Minimal visual differences';
  }

  return { status: overallStatus, icon: overallIcon, description };
}


import { Page, Locator } from '@playwright/test';

// ===== INTERFACES =====

export interface ElementLayout {
  selector: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  zIndex?: string;
}

export interface PageLayout {
  url: string;
  timestamp: string;
  viewport: {
    width: number;
    height: number;
  };
  elements: ElementLayout[];
}

export interface LayoutChange {
  type: 'position' | 'size' | 'style' | 'missing' | 'new' | 'visibility';
  severity: 'minor' | 'moderate' | 'major';
  selector: string;
  label: string;
  details: string;
  oldValue?: any;
  newValue?: any;
}

export interface LayoutComparisonResult {
  totalChanges: number;
  changes: LayoutChange[];
  changesByType: {
    position: number;
    size: number;
    style: number;
    missing: number;
    new: number;
    visibility: number;
  };
  layoutScore: number; // 0-100, 100 = identical
}

// ===== CONFIGURATION =====

/**
 * Default selectors to track for layout comparison
 * These cover major page sections that typically indicate significant layout changes
 */
export const DEFAULT_SELECTORS = [
  { selector: 'header', label: 'Header' },
  { selector: 'nav', label: 'Navigation' },
  { selector: 'main', label: 'Main Content' },
  { selector: 'footer', label: 'Footer' },
  { selector: '[role="banner"]', label: 'Banner' },
  { selector: '[role="navigation"]', label: 'Nav Bar' },
  { selector: '[role="main"]', label: 'Main Area' },
  { selector: '[role="complementary"]', label: 'Sidebar' },
  { selector: '.container', label: 'Container' },
  { selector: '.content', label: 'Content Area' },
  { selector: 'h1', label: 'Main Heading' },
  { selector: 'h2', label: 'Subheadings' },
  { selector: 'button:visible', label: 'Buttons' },
  { selector: 'a:visible', label: 'Links' },
  { selector: 'form', label: 'Forms' },
  { selector: 'img:visible', label: 'Images' },
  { selector: '[data-testid]', label: 'Test Elements' },
];

/**
 * Thresholds for determining change severity
 */
export const LAYOUT_THRESHOLDS = {
  position: {
    minor: 5,      // pixels
    moderate: 20,  // pixels
    major: 50,     // pixels
  },
  size: {
    minor: 0.02,   // 2% change
    moderate: 0.1, // 10% change
    major: 0.25,   // 25% change
  },
};

// ===== LAYOUT CAPTURE =====

/**
 * Capture layout data for a page
 */
export async function captureLayout(
  page: Page,
  url: string,
  selectors: Array<{ selector: string; label: string }> = DEFAULT_SELECTORS
): Promise<PageLayout> {
  const viewport = page.viewportSize() || { width: 1920, height: 1080 };
  const elements: ElementLayout[] = [];

  for (const { selector, label } of selectors) {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();

      // Handle multiple elements with the same selector
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = locator.nth(i);
        
        // Check if element exists and is attached
        try {
          const isVisible = await element.isVisible();
          
          if (!isVisible) {
            // Still track invisible elements
            elements.push({
              selector: count > 1 ? `${selector}:nth(${i})` : selector,
              label: count > 1 ? `${label} #${i + 1}` : label,
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              visible: false,
            });
            continue;
          }

          const box = await element.boundingBox();
          
          if (box) {
            // Get computed styles for visible elements
            const computedStyle = await element.evaluate((el) => {
              const style = window.getComputedStyle(el);
              return {
                fontSize: style.fontSize,
                color: style.color,
                backgroundColor: style.backgroundColor,
                zIndex: style.zIndex,
              };
            });

            elements.push({
              selector: count > 1 ? `${selector}:nth(${i})` : selector,
              label: count > 1 ? `${label} #${i + 1}` : label,
              x: Math.round(box.x),
              y: Math.round(box.y),
              width: Math.round(box.width),
              height: Math.round(box.height),
              visible: true,
              ...computedStyle,
            });
          }
        } catch (err) {
          // Element might have been detached or not found
          continue;
        }
      }
    } catch (err) {
      // Selector not found on page, skip it
      continue;
    }
  }

  return {
    url,
    timestamp: new Date().toISOString(),
    viewport,
    elements,
  };
}

// ===== LAYOUT COMPARISON =====

/**
 * Find matching element in new layout based on selector and label
 */
function findMatchingElement(
  element: ElementLayout,
  newElements: ElementLayout[]
): ElementLayout | null {
  return newElements.find(
    (e) => e.selector === element.selector && e.label === element.label
  ) || null;
}

/**
 * Calculate distance between two positions
 */
function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Determine severity of position change
 */
function getPositionSeverity(distance: number): 'minor' | 'moderate' | 'major' {
  if (distance <= LAYOUT_THRESHOLDS.position.minor) return 'minor';
  if (distance <= LAYOUT_THRESHOLDS.position.moderate) return 'moderate';
  return 'major';
}

/**
 * Determine severity of size change
 */
function getSizeSeverity(
  oldSize: number,
  newSize: number
): 'minor' | 'moderate' | 'major' {
  if (oldSize === 0) return 'major';
  const changePercent = Math.abs(newSize - oldSize) / oldSize;
  
  if (changePercent <= LAYOUT_THRESHOLDS.size.minor) return 'minor';
  if (changePercent <= LAYOUT_THRESHOLDS.size.moderate) return 'moderate';
  return 'major';
}

/**
 * Compare two layout snapshots
 */
export function compareLayouts(
  oldLayout: PageLayout,
  newLayout: PageLayout
): LayoutComparisonResult {
  const changes: LayoutChange[] = [];
  const changesByType = {
    position: 0,
    size: 0,
    style: 0,
    missing: 0,
    new: 0,
    visibility: 0,
  };

  // Check for changes and missing elements
  for (const oldElement of oldLayout.elements) {
    const newElement = findMatchingElement(oldElement, newLayout.elements);

    if (!newElement) {
      // Element is missing
      changes.push({
        type: 'missing',
        severity: 'major',
        selector: oldElement.selector,
        label: oldElement.label,
        details: `Element "${oldElement.label}" no longer exists`,
        oldValue: { x: oldElement.x, y: oldElement.y, width: oldElement.width, height: oldElement.height },
        newValue: null,
      });
      changesByType.missing++;
      continue;
    }

    // Check visibility change
    if (oldElement.visible !== newElement.visible) {
      changes.push({
        type: 'visibility',
        severity: 'moderate',
        selector: oldElement.selector,
        label: oldElement.label,
        details: `Element "${oldElement.label}" visibility changed from ${oldElement.visible ? 'visible' : 'hidden'} to ${newElement.visible ? 'visible' : 'hidden'}`,
        oldValue: oldElement.visible,
        newValue: newElement.visible,
      });
      changesByType.visibility++;
    }

    // Only compare layout if both are visible
    if (oldElement.visible && newElement.visible) {
      // Check position change
      const distance = calculateDistance(
        oldElement.x,
        oldElement.y,
        newElement.x,
        newElement.y
      );

      if (distance > LAYOUT_THRESHOLDS.position.minor) {
        const severity = getPositionSeverity(distance);
        changes.push({
          type: 'position',
          severity,
          selector: oldElement.selector,
          label: oldElement.label,
          details: `Element "${oldElement.label}" moved ${Math.round(distance)}px (${oldElement.x},${oldElement.y}) → (${newElement.x},${newElement.y})`,
          oldValue: { x: oldElement.x, y: oldElement.y },
          newValue: { x: newElement.x, y: newElement.y },
        });
        changesByType.position++;
      }

      // Check size change
      const widthChange = Math.abs(newElement.width - oldElement.width);
      const heightChange = Math.abs(newElement.height - oldElement.height);

      if (widthChange > 5 || heightChange > 5) {
        const widthSeverity = getSizeSeverity(oldElement.width, newElement.width);
        const heightSeverity = getSizeSeverity(oldElement.height, newElement.height);
        const severity = widthSeverity === 'major' || heightSeverity === 'major' 
          ? 'major' 
          : widthSeverity === 'moderate' || heightSeverity === 'moderate' 
          ? 'moderate' 
          : 'minor';

        changes.push({
          type: 'size',
          severity,
          selector: oldElement.selector,
          label: oldElement.label,
          details: `Element "${oldElement.label}" resized from ${oldElement.width}×${oldElement.height} to ${newElement.width}×${newElement.height}`,
          oldValue: { width: oldElement.width, height: oldElement.height },
          newValue: { width: newElement.width, height: newElement.height },
        });
        changesByType.size++;
      }

      // Check style changes (fontSize, colors)
      if (oldElement.fontSize !== newElement.fontSize ||
          oldElement.color !== newElement.color ||
          oldElement.backgroundColor !== newElement.backgroundColor) {
        const styleChanges: string[] = [];
        if (oldElement.fontSize !== newElement.fontSize) {
          styleChanges.push(`font-size: ${oldElement.fontSize} → ${newElement.fontSize}`);
        }
        if (oldElement.color !== newElement.color) {
          styleChanges.push(`color: ${oldElement.color} → ${newElement.color}`);
        }
        if (oldElement.backgroundColor !== newElement.backgroundColor) {
          styleChanges.push(`background: ${oldElement.backgroundColor} → ${newElement.backgroundColor}`);
        }

        changes.push({
          type: 'style',
          severity: 'minor',
          selector: oldElement.selector,
          label: oldElement.label,
          details: `Element "${oldElement.label}" styles changed: ${styleChanges.join(', ')}`,
          oldValue: {
            fontSize: oldElement.fontSize,
            color: oldElement.color,
            backgroundColor: oldElement.backgroundColor,
          },
          newValue: {
            fontSize: newElement.fontSize,
            color: newElement.color,
            backgroundColor: newElement.backgroundColor,
          },
        });
        changesByType.style++;
      }
    }
  }

  // Check for new elements
  for (const newElement of newLayout.elements) {
    const oldElement = findMatchingElement(newElement, oldLayout.elements);
    if (!oldElement) {
      changes.push({
        type: 'new',
        severity: 'moderate',
        selector: newElement.selector,
        label: newElement.label,
        details: `New element "${newElement.label}" appeared at (${newElement.x},${newElement.y})`,
        oldValue: null,
        newValue: { x: newElement.x, y: newElement.y, width: newElement.width, height: newElement.height },
      });
      changesByType.new++;
    }
  }

  // Calculate layout score (0-100, 100 = identical)
  // Weight different change types
  const weights = {
    position: 1,
    size: 2,
    style: 0.5,
    missing: 5,
    new: 3,
    visibility: 2,
  };

  const totalWeight = Object.entries(changesByType).reduce(
    (sum, [type, count]) => sum + count * weights[type as keyof typeof weights],
    0
  );

  // More elements tracked = higher denominator for score
  const maxPossibleChanges = Math.max(oldLayout.elements.length, newLayout.elements.length) * 3;
  const layoutScore = Math.max(0, Math.round(100 - (totalWeight / maxPossibleChanges) * 100));

  return {
    totalChanges: changes.length,
    changes,
    changesByType,
    layoutScore,
  };
}

/**
 * Generate a summary of layout changes for reporting
 */
export function getLayoutChangeSummary(result: LayoutComparisonResult): string {
  const parts: string[] = [];

  if (result.changesByType.missing > 0) {
    parts.push(`${result.changesByType.missing} element(s) missing`);
  }
  if (result.changesByType.new > 0) {
    parts.push(`${result.changesByType.new} new element(s)`);
  }
  if (result.changesByType.position > 0) {
    parts.push(`${result.changesByType.position} moved`);
  }
  if (result.changesByType.size > 0) {
    parts.push(`${result.changesByType.size} resized`);
  }
  if (result.changesByType.visibility > 0) {
    parts.push(`${result.changesByType.visibility} visibility changed`);
  }
  if (result.changesByType.style > 0) {
    parts.push(`${result.changesByType.style} style changed`);
  }

  if (parts.length === 0) {
    return 'No layout changes detected';
  }

  return parts.join(', ');
}

/**
 * Get overall status based on layout changes
 */
export function getLayoutStatus(result: LayoutComparisonResult): {
  status: 'ok' | 'warning' | 'error';
  icon: string;
} {
  const majorChanges = result.changes.filter(c => c.severity === 'major').length;
  const moderateChanges = result.changes.filter(c => c.severity === 'moderate').length;

  if (majorChanges > 0 || result.changesByType.missing > 0) {
    return { status: 'error', icon: '❌' };
  }
  if (moderateChanges > 3 || result.totalChanges > 5) {
    return { status: 'warning', icon: '⚠️' };
  }
  if (result.totalChanges > 0) {
    return { status: 'warning', icon: '⚠️' };
  }
  return { status: 'ok', icon: '✅' };
}


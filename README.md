# 🧩 UI Hybrid Regression Checker

## Overview

This project automatically verifies your web application's UI using **Playwright** with a **Hybrid Approach**.  
It combines **layout structure analysis** and **visual pixel comparison** to provide comprehensive UI regression testing.  
The tool captures screenshots, analyzes element positions and dimensions, detects layout shifts, and produces interactive HTML reports with detailed change breakdowns.

---

## How It Works

### 🎯 Hybrid Approach: Layout + Visual Comparison

This tool uses a **dual-detection system** to catch UI regressions:

1. **📐 Layout Analysis** - Detects structural changes:
   - Element position shifts (x, y coordinates)
   - Size changes (width, height)
   - Missing or new elements
   - Visibility changes
   - Style changes (colors, fonts)

2. **📸 Visual Comparison** - Pixel-based detection:
   - Precise pixel-by-pixel comparison
   - Visual diff highlighting
   - Percentage of change calculation

### Execution Flow

1. **Setup Phase**:
   - Reads URLs from `urls.json`
   - Creates date-stamped directories for organization

2. **Capture Phase** (for each URL):
   - Navigates to the page and waits for `networkidle`
   - Captures a full-page screenshot → `screenshots/daily/<date>/<page>.png`
   - Extracts layout data (element positions, sizes) → `screenshots/daily/<date>/<page>-layout.json`
   - Logs console and page errors

3. **Analysis Phase**:
   - **Layout Comparison**: Compares current vs previous layout JSON
     - Identifies moved, resized, missing, or new elements
     - Calculates layout score (0-100)
     - Categorizes changes by severity (minor/moderate/major)
   
   - **Visual Comparison**: Compares screenshots using `pixelmatch`
     - Generates diff images highlighting visual changes
     - Calculates pixel difference percentage
   
   - **Hybrid Status**: Combines both analyses for final verdict
     - ✅ **OK**: No significant changes
     - ⚠️ **Warning**: Minor layout or visual changes
     - ❌ **Error**: Major changes or missing elements

4. **Reporting Phase**:
   - Generates interactive HTML report with:
     - Side-by-side screenshot comparisons
     - Layout change breakdowns
     - Collapsible detail views
     - Visual diff overlays
   - Saves results to `reports/results-<date>.json`
   - Creates `reports/summary-<date>.html`

5. **Cleanup Phase**:
   - Automatically keeps only the last 5 daily runs
   - Removes old screenshots, layouts, and reports

---

## Project Structure

```ini
ui-visual-checker/
├── urls.json                    # URLs to test
├── playwright.config.ts         # Playwright configuration
├── tests/
│   └── ui-check.spec.ts        # Main test file (captures screenshots + layout)
├── scripts/
│   ├── README.md               # Scripts documentation
│   ├── reportStyles.ts         # CSS styles for reports (includes layout styles)
│   ├── reportMethods.ts        # Utility functions (image + layout comparison)
│   └── reports.ts              # Report generator (hybrid approach)
├── utils/
│   ├── layoutAnalyzer.ts       # 🆕 Layout capture & comparison engine
│   ├── envFile.ts              # Environment configuration
│   └── globalTeardown.ts       # Cleanup hooks
├── screenshots/
│   ├── daily/
│   │   └── YYYY-MM-DD/
│   │       ├── *.png           # Daily screenshots
│   │       └── *-layout.json   # 🆕 Layout data snapshots
│   └── diffs/                  # Diff images
├── reports/
│   ├── results-*.json          # Test results data (includes layout changes)
│   ├── summary-*.html          # Daily hybrid reports
│   └── comparison-*.html       # Date comparison reports
├── auth/                        # Authentication setup
├── base/                        # Base page classes
├── package.json
└── README.md
```

---

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install
```

3. Configure your settings:

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` file:
```bash
# Authentication
USERNAME = "your-email@example.com"
OTP = "your-otp"
URL = "https://your-platform-url.com"

# Visual Regression Settings
KEEP_RUNS_COUNT = "5"          # Number of daily runs to keep
PIXEL_DIFF_THRESHOLD = "2.0"    # Error threshold percentage
```

---

## Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `KEEP_RUNS_COUNT` | `5` | Number of daily screenshot runs to keep. Older runs are automatically cleaned up. |
| `PIXEL_DIFF_THRESHOLD` | `2.0` | Pixel difference percentage threshold. Pages exceeding this will be marked as errors. |

**Examples:**

```bash
# Keep 10 runs instead of 5
KEEP_RUNS_COUNT = "10"

# More lenient (5% threshold)
PIXEL_DIFF_THRESHOLD = "5.0"

# More strict (0.5% threshold)
PIXEL_DIFF_THRESHOLD = "0.5"
```

---

## Running the Checks

### Run Tests and Generate Visual Diff Report

Execute the complete UI visual regression test suite:

```bash
npm test
# or
npx playwright test
```

This command will automatically:

1. **Run Playwright tests** - Navigate to each URL, capture screenshots, detect JS/console errors
2. **Generate visual diffs** - Compare today's screenshots with the previous day
3. **Create HTML report** - Build an interactive report with side-by-side comparisons
4. **Cleanup old runs** - Keep only the last 5 daily runs to save disk space
5. **Open report** - Automatically opens the report in your browser

### Compare Any Two Dates

View all available screenshot dates:

```bash
npm run list-dates
```

Compare screenshots from any two specific dates:

```bash
npm run compare 2025-10-15 2025-11-04
```

This will:

- Compare all screenshots between the two dates
- Generate a detailed comparison report
- Automatically open the report in your browser

---

## Viewing the Visual Diff Report

After running `npm test`, open the generated report:

```bash
# Open in default browser (macOS)
open reports/summary-$(date +%Y-%m-%d).html

# Or manually navigate to
reports/summary-YYYY-MM-DD.html
```

### Report Features

The interactive HTML report shows:

- **📊 Summary Dashboard** - Quick overview of passed, changed, and failed tests
- **📐 Layout Analysis** - 🆕 Detailed breakdown of structural changes:
  - Layout Score (0-100 scale)
  - Element position shifts with pixel distances
  - Size changes with before/after dimensions
  - Missing/new elements detection
  - Visibility and style changes
  - Severity indicators (🔴 Major, 🟡 Moderate, 🟢 Minor)
- **📷 Screenshot Comparisons** - Side-by-side visual comparison
- **⚠️ Visual Diffs** - Highlighted differences showing exactly what changed
- **📈 Hybrid Metrics** - Both layout score and pixel difference percentage
- **🔍 Zoom Feature** - Click any screenshot to zoom in for detailed inspection
- **📑 Collapsible Details** - Expand to view element-by-element changes

### Report Outputs

**Daily Reports:**

- **HTML Report**: `reports/summary-<date>.html` - Interactive visual comparison
- **JSON Results**: `reports/results-<date>.json` - Machine-readable test data
- **Diff Images**: `screenshots/diffs/<page>-diff.png` - Individual diff overlays

**Date Comparison Reports:**

- **HTML Report**: `reports/comparison-<date1>-vs-<date2>.html` - Custom date comparison
- **JSON Results**: `reports/comparison-<date1>-vs-<date2>.json` - Comparison data
- **Diff Images**: `screenshots/diffs/<page>-<date1>-vs-<date2>-diff.png`

### Available Commands

```bash
# Run daily visual regression tests
npm test

# Generate report manually
npm run report

# List all available screenshot dates
npm run list-dates

# Compare two specific dates
npm run compare 2025-10-08 2025-10-13

# Cleanup old runs (keeps last 5)
npm run cleanup
```

### Using NPX (Direct Execution)

```bash
# Generate daily report
npx tsx scripts/reports.ts

# Compare specific dates
npx tsx scripts/reports.ts compare 2025-10-08 2025-10-13

# List available dates
npx tsx scripts/reports.ts list

# Cleanup (custom keep count)
npx tsx scripts/reports.ts cleanup 10
```

---

## Notes & Tips

### Hybrid Comparison Settings

#### Layout Analysis Configuration

Located in `utils/layoutAnalyzer.ts`:

**Tracked Elements:**
- `DEFAULT_SELECTORS` - Monitors major page sections:
  - Headers, navigation, main content, footers
  - ARIA landmarks (banner, navigation, main, complementary)
  - Common containers, headings, buttons, forms
  - Test elements with `data-testid` attributes

**Thresholds:**
```typescript
Position Changes:
  - Minor:    ≤ 5px movement
  - Moderate: ≤ 20px movement  
  - Major:    > 50px movement

Size Changes:
  - Minor:    ≤ 2% change
  - Moderate: ≤ 10% change
  - Major:    > 25% change
```

#### Visual Comparison Configuration

Located in `scripts/reportMethods.ts`:

- **Pixel Threshold**: `0.01` (1% color difference) - More sensitive than before
- **Animations**: Disabled during capture for consistent screenshots
- **Full Page**: Captures entire page, not just viewport

#### Status Determination

The hybrid system combines both analyses:
- ❌ **Error**: Major layout changes OR >2% pixel difference OR JS errors
- ⚠️ **Warning**: Moderate layout changes OR 0.5-2% pixel difference
- ✅ **OK**: Minimal or no changes detected

**Easy Customization via .env:**
```bash
# Change pixel difference threshold (default: 2.0%)
PIXEL_DIFF_THRESHOLD = "5.0"

# Change number of runs to keep (default: 5)
KEEP_RUNS_COUNT = "10"
```

**Advanced Customization** (edit source files):
- Layout thresholds: `utils/layoutAnalyzer.ts` → `LAYOUT_THRESHOLDS`
- Hybrid logic: `scripts/reportMethods.ts` → `createHybridSummary()`

### Why Hybrid Approach?

The hybrid system addresses limitations of pure pixel comparison:

**Problems with Pixel-Only Comparison:**
- ❌ False positives from anti-aliasing variations
- ❌ Dynamic content (dates, counters) triggers failures
- ❌ Font rendering differences across systems
- ❌ Can't explain *what* changed, only *that* something changed

**Benefits of Hybrid Approach:**
- ✅ **Catches layout shifts**: Detects CLS (Cumulative Layout Shift) issues
- ✅ **Element-level precision**: Know exactly which component moved/resized
- ✅ **Reduced false positives**: Tolerates rendering variations
- ✅ **Better debugging**: See both structural and visual changes
- ✅ **Semantic analysis**: Understands page structure, not just pixels
- ✅ **Actionable insights**: "Header moved 30px down" vs "10,000 pixels changed"

**Use Cases:**
- Responsive design validation across breakpoints
- Component library regression testing
- Cross-browser layout consistency checks
- Accessibility structure validation
- Performance monitoring (element visibility changes)

### CI/CD Integration

For continuous integration pipelines:

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Run tests
npm test
```

### Interpreting Results

#### Status Indicators

- **✅ OK** - No significant layout or visual changes detected
- **⚠️ Diff** - Minor changes detected (requires review):
  - Small layout adjustments (< 20px position shifts)
  - Minor size changes (< 10%)
  - Small visual variations (< 2% pixels)
- **❌ Error** - Major issues found (needs immediate attention):
  - Large layout shifts (> 50px)
  - Missing or new major elements
  - Significant visual changes (> 2%)
  - JavaScript/console errors

#### Understanding Layout Changes

**Example Report Output:**
```
Layout Score: 85/100
📐 Layout: 3 changes
  🟡 POSITION - Element "Main Content" moved 15px (450,200) → (450,215)
  🟢 SIZE - Element "Header" resized from 1920×80 to 1920×85
  🟡 STYLE - Element "Navigation" color changed
```

**What This Means:**
- **Position changes**: Element coordinates shifted
  - Check for unintended layout shifts (CLS issues)
  - Verify responsive behavior
- **Size changes**: Element dimensions changed
  - May indicate content overflow
  - Could be responsive breakpoint adjustment
- **Missing elements**: Element not found in new version
  - Critical - may break functionality
  - Could be intentional removal
- **New elements**: Element appeared
  - New feature added
  - Check if positioned correctly

#### Change Evaluation

**Changes don't always mean failures:**

✅ **Acceptable Changes:**
- Intentional UI updates (new features, redesigns)
- Responsive adjustments (different viewport sizes)
- Dynamic content variations (dates, user-specific data)
- Minor style refinements (spacing, colors)

❌ **Problematic Changes:**
- Unintended layout shifts (CLS issues)
- Broken responsive breakpoints
- Missing critical elements (navigation, CTAs)
- Accessibility structure changes
- Performance regressions (hidden elements)

---

## Optional Enhancements

### Possible Future Additions

- **Notifications**: Slack/email alerts for failed checks with layout change summaries
- **Cloud Storage**: Store screenshots and layout data in S3 or cloud storage
- **Custom Selectors**: Add page-specific element tracking in `urls.json`
- **Responsive Testing**: Capture layouts at multiple viewport sizes
- **Performance Metrics**: Integrate Web Vitals (LCP, CLS, FID) tracking
- **Visual Regions**: Ignore specific dynamic areas (ads, timestamps)
- **Baseline Management UI**: Web interface to review and approve layout changes
- **Historical Trends**: Track layout score trends over time
- **Accessibility Checks**: Expand ARIA landmark validation
- **Cross-Browser**: Compare layouts across different browsers

---

## Summary

This **Hybrid UI Regression Checker** provides comprehensive testing by combining:

1. **📐 Layout Analysis** - Structural understanding of your UI
2. **📸 Visual Comparison** - Pixel-perfect visual verification
3. **📊 Intelligent Reporting** - Actionable insights with detailed breakdowns

**Key Advantages:**
- Reduces false positives while catching real issues
- Provides element-level debugging information
- Adapts to dynamic content and rendering variations
- Generates beautiful, interactive HTML reports
- Easy to integrate into CI/CD pipelines

**Perfect For:**
- Teams building responsive web applications
- Component library maintainers
- QA teams needing detailed regression insights
- DevOps looking for automated visual testing
- Anyone tired of pixel-only comparison limitations

Get started in minutes and never miss a layout regression again! 🚀

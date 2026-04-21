# Theme System Architecture Guide

## Overview

This document outlines the theme system architecture used in the md2cd tool. The theme system provides visual branding and styling for PDF outputs through a modular, configuration-driven approach that separates presentation from content.

## Core Principles

1. **Configuration-Driven**: Themes are defined by configuration files, not hardcoded logic
2. **Asset Isolation**: Each theme contains its own CSS, logos, icons, and assets
3. **Hierarchical Selection**: CLI overrides manifest, manifest overrides default
4. **Base64 Embedding**: Assets are embedded in HTML for self-contained PDF generation
5. **Extensible Footer Types**: Support for multiple footer rendering strategies
6. **No Core Modification**: Themes extend behavior without changing core code

## Architecture Components

### 1. Theme Directory Structure

**Location**: `themes/{theme-name}/`

Each theme is a self-contained directory with this structure:

```
themes/
  theme-name/
    theme.config.js       # Theme configuration (required)
    style.css             # Theme-specific CSS (required)
    assets/               # Theme assets directory (required)
      logo-header.png     # Header logo
      logo-footer.png     # Footer logo
      icon-format.svg     # Format metadata icon
      icon-duration.svg   # Duration metadata icon
      icon-audience.svg   # Audience metadata icon
```

**Required Files**:
- `theme.config.js`: JavaScript module exporting theme configuration
- `style.css`: CSS stylesheet for HTML rendering
- `assets/`: Directory containing theme-specific images

### 2. Theme Configuration Format

**File**: `themes/{theme-name}/theme.config.js`

Theme configuration is a JavaScript module that exports a default object:

```javascript
export default {
    name: 'theme-name',              // Required: Theme identifier
    displayName: 'Theme Display Name', // Optional: Human-readable name

    // Header configuration
    header: {
        logo: 'logo-filename.png',   // Required: Header logo filename
    },

    // Footer configuration (optional)
    footer: {
        type: 'centered-logo',       // Footer type
        logo: 'footer-logo.png',     // Footer logo filename
        position: {
            y: 40,                   // Y position from bottom (points)
        },
        width: 'content-width',      // Logo width strategy
    },
};
```

**Footer Types**:

1. **`centered-logo`** - Simple centered logo footer
   ```javascript
   footer: {
       type: 'centered-logo',
       logo: 'footer-logo.png',
       position: { y: 40 },          // Distance from bottom
       width: 'content-width',       // Match content width or number
   }
   ```

2. **`gradient-with-logo`** - Gradient background with logo overlay
   ```javascript
   footer: {
       type: 'gradient-with-logo',
       logo: 'footer-logo.png',
       position: { y: 40 },
       gradient: {
           height: 80,               // Gradient height in points
           stripes: 100,             // Number of gradient stripes
           colors: [                 // RGB color stops
               [10, 96, 255],        // Start color
               [2, 200, 255],
               [255, 0, 127],
               [255, 144, 0],        // End color
           ],
       },
       logoPlacement: {
           side: 'right',            // 'left' or 'right'
           width: 100,               // Logo width in points
           margin: 60,               // Margin from edge
       },
   }
   ```

3. **No footer** - Omit `footer` property or set `footer.type` to `null`

### 3. Theme Loading Utilities

**Location**: `src/utils/loadTheme.js`

Core utility functions for theme operations:

```javascript
// Load theme configuration object
loadThemeConfig(themeName)

// Get theme directory path
getThemeDir(themeName)

// Load theme CSS content as string
loadThemeCss(themeName)

// Load standard metadata icons as base64 data URIs
loadThemeIcons(themeName)
// Returns: { iconFormat, iconDuration, iconAudience }

// Get path to theme asset
getThemeAssetPath(themeName, assetName)

// Encode asset as base64 data URI
encodeAssetAsBase64(themeName, assetName)

// Get theme logo filenames
getThemeLogoFilename(themeName)
getThemeFooterLogoFilename(themeName)

// Get theme constants
getThemeConstants()
// Returns: { THEMES_DIR, DEFAULT_THEME }
```

### 4. Pipeline Integration

**Stage Execution Flow**:

```
1. Stage 10-load:
   - Determine theme name (CLI > manifest > default)
   - Store in context.theme

2. Stage 30-validate:
   - Verify theme directory exists
   - Verify theme has style.css

3. Stage 40-convert:
   - Load theme CSS and assets
   - Build HTML with theme styling
   - Embed theme assets as base64

4. Stage 50-build:
   - Render HTML to PDF with Puppeteer
   - Apply theme-specific footer overlays
   - Generate final PDF
```

**Theme Selection Logic** (Stage 10):

```javascript
// Priority: CLI flag > manifest > default
if (context.options.theme) {
    context.theme = context.options.theme;
    // CLI override
} else if (manifest.output?.theme) {
    context.theme = manifest.output.theme;
    // Manifest specified
} else {
    context.theme = 'splunk-edu';
    // Default theme
}
```

### 5. HTML Generation

**Process** (Stage 40-convert):

1. Load theme CSS content
2. Load theme icons as base64 data URIs
3. Load header logo as base64 data URI
4. Build HTML header with logo
5. Build metadata section with icons
6. Inject CSS and assets into HTML
7. Apply plugin font family overrides

**Example Flow**:

```javascript
async function buildFullHtml(manifest, bodyContent, themeName) {
    // Load theme assets
    const css = loadThemeCss(themeName);
    const icons = loadThemeIcons(themeName);
    const logoFilename = await getThemeLogoFilename(themeName);
    const logoBase64 = encodeAssetAsBase64(themeName, logoFilename);

    // Build components
    const header = buildHeader(themeName, logoBase64, manifest);
    const metadataHtml = buildMetadataSection(manifest, icons);

    // Assemble HTML
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Course Description</title>
    <style>${css}</style>
</head>
<body>
    ${header}
    <main>${bodyContent}</main>
</body>
</html>`;
}
```

### 6. PDF Footer Rendering

**Process** (Stage 50-build):

After HTML is rendered to PDF by Puppeteer, theme-specific footers are applied:

1. Load theme configuration
2. Check for footer definition
3. If no footer, return PDF unchanged
4. Load footer logo as binary buffer
5. Load PDF with pdf-lib
6. Apply footer based on type:
   - `centered-logo`: Draw logo centered at specified position
   - `gradient-with-logo`: Draw gradient stripes, then logo
7. Save modified PDF

**Footer Rendering** (`renderPdf.js`):

```javascript
export async function addFooterWithLogo(pdfBuffer, themeName) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const config = await loadThemeConfig(themeName);

    // Skip if no footer defined
    if (!config.footer || !config.footer.type) {
        return await pdfDoc.save();
    }

    // Load footer logo
    const footerLogoPath = getThemeAssetPath(
        themeName,
        await getThemeFooterLogoFilename(themeName)
    );
    const logoBuffer = fs.readFileSync(footerLogoPath);

    // Apply footer based on type
    if (config.footer.type === 'gradient-with-logo') {
        await addGradientFooter(pdfDoc, logoBuffer, config);
    } else if (config.footer.type === 'centered-logo') {
        await addCenteredLogoFooter(pdfDoc, logoBuffer, config);
    }

    return await pdfDoc.save();
}
```

## Theme Selection

### 1. Default Theme

**Hardcoded Default**: `splunk-edu`

If no theme is specified via CLI or manifest, the default theme is used.

```javascript
const DEFAULT_THEME = 'splunk-edu';
```

### 2. Manifest Declaration

Themes can be specified in `manifest.json`:

```json
{
  "metadata": {
    "courseId": "1001",
    "courseTitle": "Example Course"
  },
  "output": {
    "theme": "cisco"
  }
}
```

### 3. CLI Override

Command-line flag overrides manifest and default:

```bash
md2cd --theme cisco /path/to/course
```

**Priority Order**: CLI > Manifest > Default

## Implementation Steps

### Step 1: Create Theme Directory Structure

```bash
mkdir -p themes/my-theme/assets
cd themes/my-theme
```

### Step 2: Create Theme Configuration

```javascript
// themes/my-theme/theme.config.js
export default {
    name: 'my-theme',
    displayName: 'My Brand Theme',

    header: {
        logo: 'header-logo.png',
    },

    footer: {
        type: 'centered-logo',
        logo: 'footer-logo.png',
        position: { y: 40 },
        width: 'content-width',
    },
};
```

### Step 3: Create Theme Stylesheet

```css
/* themes/my-theme/style.css */
body {
    font-family: Arial, sans-serif;
    font-size: 14px;
    margin: 0;
    padding: 0;
}

h1 {
    color: #000080;
    font-size: 24px;
}

h2 {
    color: #FF6600;
    font-size: 20px;
}

/* Add print-specific styles */
@media print {
    @page {
        margin: 20mm;
    }
}

/* Header styling */
.header-logo {
    max-width: 200px;
    height: auto;
}

/* Metadata styling */
.metadata {
    background-color: #f0f0f0;
    padding: 20px;
    border-left: 5px solid #FF6600;
}

.metadata-icon {
    height: 20px;
    width: auto;
}
```

### Step 4: Add Required Assets

Place these image files in `themes/my-theme/assets/`:

- `header-logo.png` - Header logo
- `footer-logo.png` - Footer logo
- `icon-format.svg` - Format metadata icon (scalable SVG recommended)
- `icon-duration.svg` - Duration metadata icon (scalable SVG recommended)
- `icon-audience.svg` - Audience metadata icon (scalable SVG recommended)

### Step 5: Use Theme

**Via Manifest**:
```json
{
  "output": {
    "theme": "my-theme"
  }
}
```

**Via CLI**:
```bash
md2cd --theme my-theme /path/to/course
```

## Design Patterns

### Pattern 1: Asset Embedding

All assets are base64-encoded and embedded in HTML:

```javascript
// Convert image to data URI (auto-detects MIME type from extension)
const logoBase64 = encodeAssetAsBase64('my-theme', 'logo.png');
// Result: "data:image/png;base64,iVBORw0KGgo..."

const iconBase64 = encodeAssetAsBase64('my-theme', 'icon.svg');
// Result: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0..."

// Embed in HTML
const html = `<img src="${logoBase64}" />`;
```

**Benefits**:
- Self-contained HTML (no external dependencies)
- Reliable rendering in Puppeteer
- No file path resolution issues

### Pattern 2: Two-Stage Rendering

1. **HTML Rendering** (Puppeteer): Apply CSS and layout
2. **PDF Post-Processing** (pdf-lib): Add programmatic elements

**Why**:
- Complex footers (gradients) easier with pdf-lib
- Precise positioning control
- Avoid browser rendering quirks

### Pattern 3: Configuration Over Code

Footer types are data-driven, not hardcoded:

```javascript
// BAD: Hardcoded footer logic
if (themeName === 'cisco') {
    drawGradientFooter();
} else if (themeName === 'splunk-edu') {
    drawCenteredFooter();
}

// GOOD: Configuration-driven
if (config.footer.type === 'gradient-with-logo') {
    addGradientFooter(pdfDoc, logoBuffer, config);
} else if (config.footer.type === 'centered-logo') {
    addCenteredLogoFooter(pdfDoc, logoBuffer, config);
}
```

**Benefits**:
- Easy to add new themes
- No code changes for new footer types
- Clear separation of concerns

### Pattern 4: Graceful Degradation

Missing optional features don't break rendering:

```javascript
// Skip footer if not defined
if (!config.footer || !config.footer.type) {
    return await pdfDoc.save();  // Return PDF without footer
}
```

### Pattern 5: Validation Before Use

Validate theme existence early in pipeline:

```javascript
// Stage 30-validate
const themePath = path.join(__dirname, '../../themes', context.theme);
const themeCssPath = path.join(themePath, 'style.css');

if (!fs.existsSync(themeCssPath)) {
    context.addError(`Theme not found: ${context.theme}`, this.name);
    return;  // Stop pipeline
}
```

**Benefits**:
- Fail fast with clear error messages
- Prevent cascading failures in later stages
- Better user experience

## CSS Guidelines

### Print-Specific Styles

Always include `@media print` rules for PDF rendering:

```css
@media print {
    /* Page margins */
    @page {
        margin-top: 20mm;
        margin-bottom: 20mm;
        margin-left: 20mm;
        margin-right: 20mm;
    }

    /* First page special margins */
    @page:first {
        margin-top: 0mm;
    }

    /* Prevent page breaks inside elements */
    h2, h3 {
        page-break-after: avoid;
    }

    /* Keep list items together */
    li {
        page-break-inside: avoid;
    }
}
```

### Header Styling

Standard header structure:

```css
.first-page-header {
    margin-top: 32px;
    text-align: center;
}

.header-logo {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
}

.header-text {
    float: right;
    font-size: 13px;
    color: gray;
    margin-top: 16px;
}
```

### Metadata Section

Standard two-column layout:

```css
.two-col {
    display: flex;
    align-items: flex-start;
    gap: 5px;
}

.two-col .prerequisites {
    flex: 3;
}

.two-col .metadata {
    flex: 2;
    background-color: #f5f5f5;
    padding: 20px;
    border-left: 5px solid #ccc;
}

.metadata-line {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 0.5em 0;
}

.metadata-icon {
    height: 20px;
    width: auto;
    margin-right: 6px;
}
```

## Example Themes

### Example 1: Simple Centered Logo Theme

```javascript
// themes/simple/theme.config.js
export default {
    name: 'simple',
    displayName: 'Simple Theme',

    header: {
        logo: 'logo-header.png',
    },

    footer: {
        type: 'centered-logo',
        logo: 'logo-footer.png',
        position: { y: 40 },
        width: 'content-width',
    },
};
```

**CSS**:
```css
/* themes/simple/style.css */
body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
}

h1 { color: #333; font-size: 28px; }
h2 { color: #0066cc; font-size: 20px; }
h3 { color: #666; font-size: 16px; }

.metadata {
    background-color: #f8f8f8;
    padding: 20px;
    border-left: 4px solid #0066cc;
}
```

### Example 2: Gradient Footer Theme

```javascript
// themes/gradient/theme.config.js
export default {
    name: 'gradient',
    displayName: 'Gradient Footer Theme',

    header: {
        logo: 'logo-header.png',
    },

    footer: {
        type: 'gradient-with-logo',
        logo: 'logo-footer.png',
        position: { y: 40 },
        gradient: {
            height: 80,
            stripes: 100,
            colors: [
                [10, 96, 255],     // Blue
                [2, 200, 255],     // Cyan
                [255, 0, 127],     // Pink
                [255, 144, 0],     // Orange
            ],
        },
        logoPlacement: {
            side: 'right',
            width: 100,
            margin: 60,
        },
    },
};
```

**CSS**:
```css
/* themes/gradient/style.css */
header.first-page-header {
    background: linear-gradient(
        90deg,
        #0a60ff 5%,
        #02c8ff 37%,
        #ff007f 75%,
        #ff9000 95%
    );
    padding: 20px 60px;
}

.header-logo {
    max-width: 150px;
}

h1 { color: #0a60ff; }
h2 { color: #ff007f; }
```

### Example 3: Minimal Theme (No Footer)

```javascript
// themes/minimal/theme.config.js
export default {
    name: 'minimal',
    displayName: 'Minimal Theme',

    header: {
        logo: 'logo-header.png',
    },

    // No footer property = no footer rendered
};
```

## Advanced Features

### Custom Footer Types

To add a new footer type:

1. **Define configuration structure** in theme config
2. **Add rendering function** to `renderPdf.js`
3. **Add type check** in `addFooterWithLogo()`

**Example - Text-only footer**:

```javascript
// 1. Theme config
footer: {
    type: 'text-only',
    text: '© 2026 My Company',
    fontSize: 10,
    color: [100, 100, 100],
    position: { y: 30 },
}

// 2. Rendering function (renderPdf.js)
async function addTextFooter(pdfDoc, config) {
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width } = lastPage.getSize();

    lastPage.drawText(config.footer.text, {
        x: width / 2 - 50,  // Approximate center
        y: config.footer.position.y,
        size: config.footer.fontSize,
        color: rgb(
            config.footer.color[0] / 255,
            config.footer.color[1] / 255,
            config.footer.color[2] / 255
        ),
    });
}

// 3. Type check
export async function addFooterWithLogo(pdfBuffer, themeName) {
    // ... existing code ...

    if (config.footer.type === 'gradient-with-logo') {
        await addGradientFooter(pdfDoc, logoBuffer, config);
    } else if (config.footer.type === 'centered-logo') {
        await addCenteredLogoFooter(pdfDoc, logoBuffer, config);
    } else if (config.footer.type === 'text-only') {
        await addTextFooter(pdfDoc, config);
    }

    return await pdfDoc.save();
}
```

### Dynamic Theme Configuration

Theme configs can compute values:

```javascript
export default {
    name: 'dynamic',
    displayName: 'Dynamic Theme',

    header: {
        logo: 'logo-header.png',
    },

    footer: {
        type: 'centered-logo',
        logo: 'logo-footer.png',
        position: {
            y: (() => {
                // Compute footer position dynamically
                const baseMargin = 40;
                const extraPadding = 10;
                return baseMargin + extraPadding;
            })(),
        },
        width: 'content-width',
    },
};
```

### Responsive Asset Sizing

Themes can specify multiple logo variants:

```javascript
// Future enhancement idea
header: {
    logos: {
        small: 'logo-small.png',   // < 600pt wide
        medium: 'logo-medium.png', // 600-800pt wide
        large: 'logo-large.png',   // > 800pt wide
    },
}
```

## Best Practices

### 1. Theme Naming
- Use lowercase with hyphens: `my-theme`, not `MyTheme` or `my_theme`
- Choose descriptive names: `acme-corp`, not `theme1`
- Match directory name with config `name` property

### 2. Asset Optimization
- Use PNG format for logos and icons
- Optimize file sizes (recommend < 100KB per asset)
- Use transparent backgrounds where appropriate
- Provide high-DPI assets (2x resolution)

### 3. CSS Organization
- Group related styles together
- Use consistent naming conventions
- Add comments for complex styles
- Test print rendering thoroughly

### 4. Configuration Validation
- Include all required properties
- Use consistent units (points for PDF positioning)
- Document custom properties
- Provide sensible defaults

### 5. Testing
- Test with various content lengths
- Verify footer positioning on multi-page documents
- Check asset rendering quality
- Validate CSS print output

### 6. Documentation
- Document theme-specific features
- Provide usage examples
- List required assets
- Note any special requirements

## Troubleshooting

### Theme Not Found Error

**Error**: `Theme not found: my-theme`

**Solutions**:
1. Verify theme directory exists: `themes/my-theme/`
2. Check `style.css` exists in theme directory
3. Verify theme name matches directory name exactly
4. Check for typos in CLI flag or manifest

### Logo Not Displaying

**Error**: Logo missing in PDF output

**Solutions**:
1. Verify asset exists: `themes/my-theme/assets/logo.png`
2. Check filename in theme config matches actual file
3. Verify PNG format (not JPEG or other)
4. Check file permissions (readable)

### Footer Not Rendering

**Error**: Footer missing or incorrect in PDF

**Solutions**:
1. Verify `footer` property exists in theme config
2. Check `footer.type` is valid (`centered-logo` or `gradient-with-logo`)
3. Verify footer logo file exists
4. Check `position.y` value is reasonable (> 0, < page height)

### CSS Not Applied

**Error**: Styles not appearing in PDF

**Solutions**:
1. Verify CSS syntax is valid
2. Check `@media print` rules are present
3. Test HTML output with `--html` flag
4. Verify Puppeteer can parse CSS
5. Check for CSS conflicts with base styles

### Base64 Encoding Errors

**Error**: Invalid base64 data or corrupted images

**Solutions**:
1. Verify asset files are not corrupted
2. Check file formats are supported (PNG recommended)
3. Verify file permissions allow reading
4. Check for special characters in filenames

## Migration Guide

### Migrating from Hardcoded Styles

**Before** (hardcoded):
```javascript
// Styles mixed with logic
const html = `
<style>
  h1 { color: #ff0000; }
</style>
`;
```

**After** (theme-based):
```css
/* themes/my-theme/style.css */
h1 { color: #ff0000; }
```

### Creating Theme from Existing Styles

1. **Extract CSS**: Copy inline styles to `style.css`
2. **Create Config**: Define theme configuration
3. **Move Assets**: Relocate images to `assets/`
4. **Update References**: Change hardcoded paths to theme utils
5. **Test**: Verify output matches original

### Converting Between Footer Types

**From simple logo to gradient**:

```javascript
// Before
footer: {
    type: 'centered-logo',
    logo: 'logo.png',
    position: { y: 40 },
}

// After
footer: {
    type: 'gradient-with-logo',
    logo: 'logo.png',
    position: { y: 40 },
    gradient: {
        height: 80,
        stripes: 100,
        colors: [[255, 0, 0], [0, 0, 255]],
    },
    logoPlacement: {
        side: 'right',
        width: 100,
        margin: 60,
    },
}
```

## Summary

The theme system provides:
- **Modularity**: Self-contained theme packages
- **Flexibility**: Multiple visual styles without code changes
- **Maintainability**: Clear separation of content and presentation
- **Extensibility**: Easy to add new themes and footer types
- **Reliability**: Asset embedding ensures consistent rendering
- **Configurability**: Override themes via CLI or manifest

The key architectural decision is **configuration over convention**: themes are data-driven, not hardcoded. This enables:
- Adding new themes without modifying core code
- Per-project theme selection via manifest
- Runtime theme switching via CLI
- Easy visual customization for different brands

The two-stage rendering approach (HTML → PDF → Footer overlay) provides maximum flexibility while maintaining simplicity in the core pipeline.

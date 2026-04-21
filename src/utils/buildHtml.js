import {
    getCourseFormat,
    getCourseDuration,
    getCourseAudience,
    getCourseTitle,
} from './metadataHandler.js';
import {
    loadThemeCss,
    encodeAssetAsBase64,
    loadThemeIcons,
    getThemeLogoFilename,
} from './loadTheme.js';
import { convertToHtml } from './convertMarkdown.js';
import pluginManager from '../../plugins/pluginLoader.js';

/**
 * Build HTML for metadata section
 * @param {Object} manifest - Manifest object
 * @param {Object} icons - Icons object {iconFormat, iconDuration, iconAudience}
 * @param {number} formatIndex - Index of format to use (default: 0)
 * @returns {string} HTML
 */
export function buildMetadataSection(manifest, icons, formatIndex = 0) {
    const courseFormat =
        pluginManager.getFieldOverride('modality') ||
        pluginManager.translateValue(getCourseFormat(manifest, formatIndex));
    const courseDuration =
        pluginManager.getFieldOverride('duration') ||
        pluginManager.translateValue(getCourseDuration(manifest, formatIndex));

    let courseAudience = getCourseAudience(manifest);
    const audienceOverride = pluginManager.getFieldOverride('audience');
    if (audienceOverride) {
        courseAudience = Array.isArray(audienceOverride) ? audienceOverride : [audienceOverride];
    } else if (Array.isArray(courseAudience)) {
        courseAudience = courseAudience.map((v) => pluginManager.translateValue(v));
    }

    const formatLabel = pluginManager.getLabel('format', 'Format');
    const durationLabel = pluginManager.getLabel('duration', 'Duration');
    const audienceLabel = pluginManager.getLabel('audience', 'Audience');

    return `
    <div class="metadata">
      ${
          courseFormat
              ? `<p class="metadata-line">
              <span class="metadata-key">
                <span class="metadata-icon">${icons.iconFormat}</span>
                <strong>${formatLabel}:</strong>
              </span>
              <span class="metadata-value">${courseFormat}</span>
            </p>`
              : ''
      }
      ${
          courseDuration
              ? `<p class="metadata-line">
              <span class="metadata-key">
                <span class="metadata-icon">${icons.iconDuration}</span>
                <strong>${durationLabel}:</strong>
              </span>
              <span class="metadata-value">${courseDuration}</span>
            </p>`
              : ''
      }
      ${
          courseAudience && Array.isArray(courseAudience)
              ? `<div class="metadata-line">
              <span class="metadata-key">
                <span class="metadata-icon">${icons.iconAudience}</span>
                <strong>${audienceLabel}:</strong>
              </span>
              <div class="metadata-value">
                ${
                    courseAudience.length > 1
                        ? `<ul class="metadata-list">
                        ${courseAudience.map((item) => `<li>${item}</li>`).join('')}
                      </ul>`
                        : `<span>${courseAudience[0]}</span>`
                }
              </div>
            </div>`
              : ''
      }
    </div>
  `;
}

/**
 * Build prerequisites section HTML with metadata
 * @param {string} prereqMarkdown - Prerequisites markdown content
 * @param {string} metadataHtml - Metadata section HTML
 * @returns {string} HTML
 */
export function buildPrerequisitesSection(prereqMarkdown, metadataHtml) {
    if (!prereqMarkdown) {
        return '';
    }

    const renderedPrereqs = convertToHtml(prereqMarkdown);

    return `
    <div class="two-col">
      <div class="prerequisites">${renderedPrereqs}</div>
      ${metadataHtml}
    </div>
  `;
}

/**
 * Build HTML header with logo
 * @param {string} themeName - Theme name
 * @param {string} logoBase64 - Logo as base64 data URI
 * @param {Object} manifest - Manifest object
 * @returns {string} HTML
 */
export function buildHeader(themeName, logoBase64, _manifest) {
    return `
    <header class="first-page-header">
      <img src="${logoBase64}" class="header-logo" />
      <p class="header-text">Course Description</p>
    </header>
  `;
}

/**
 * Build complete HTML document
 * @param {Object} manifest - Manifest object
 * @param {string} bodyContent - Body HTML content (with {{PREREQUISITES}} placeholder)
 * @param {string} themeName - Theme name
 * @param {string} prereqMarkdown - Prerequisites markdown content
 * @param {number} formatIndex - Index of format to use (default: 0)
 * @returns {Promise<string>} Complete HTML document
 */
export async function buildFullHtml(manifest, bodyContent, themeName, prereqMarkdown = null, formatIndex = 0) {
    const css = loadThemeCss(themeName);
    const icons = loadThemeIcons(themeName);
    const logoFilename = await getThemeLogoFilename(themeName);
    const logoBase64 = encodeAssetAsBase64(themeName, logoFilename);

    const fontFamilyOverride = pluginManager.buildFontFamily('Arial, sans-serif');
    const fontFamilyStyle = fontFamilyOverride
        ? `<style>* { font-family: ${fontFamilyOverride} !important; }</style>`
        : '';

    // Add extra padding to prevent content from extending into footer area
    const footerSpacing = `<style>body { padding-bottom: 60pt; }</style>`;

    const header = buildHeader(themeName, logoBase64, manifest);

    // Build metadata section
    const metadataHtml = buildMetadataSection(manifest, icons, formatIndex);

    // Build prerequisites with metadata
    const prereqHtml = buildPrerequisitesSection(prereqMarkdown, metadataHtml);

    // Replace placeholder with prerequisites+metadata HTML
    const finalBodyContent = bodyContent.replace('{{PREREQUISITES}}', prereqHtml);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Course Description - ${getCourseTitle(manifest)}</title>
    <style>${css}</style>
    ${fontFamilyStyle}
    ${footerSpacing}
</head>
<body>
    ${header}
    <main>
        ${finalBodyContent}
    </main>
</body>
</html>`;
}

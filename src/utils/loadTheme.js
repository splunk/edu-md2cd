import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THEMES_DIR = path.join(__dirname, '../../themes');
const DEFAULT_THEME = 'splunk-edu';

/**
 * Load theme configuration
 * @param {string} themeName - Theme name
 * @returns {Promise<Object>} Theme configuration object
 */
export async function loadThemeConfig(themeName = DEFAULT_THEME) {
    const configPath = path.join(getThemeDir(themeName), 'theme.config.js');

    if (!fs.existsSync(configPath)) {
        throw new Error(
            `Theme configuration not found: ${themeName}. Expected config at ${configPath}`,
        );
    }

    // Convert to file URL for cross-platform ESM compatibility (required on Windows)
    const configModule = await import(pathToFileURL(configPath).href);
    return configModule.default;
}

/**
 * Get theme directory path
 * @param {string} themeName - Theme name
 * @returns {string} Absolute path to theme directory
 */
export function getThemeDir(themeName = DEFAULT_THEME) {
    return path.join(THEMES_DIR, themeName);
}

/**
 * Get path to a theme asset
 * @param {string} themeName - Theme name
 * @param {string} assetName - Asset filename
 * @returns {string} Absolute path to asset
 */
export function getThemeAssetPath(themeName, assetName) {
    return path.join(getThemeDir(themeName), 'assets', assetName);
}

/**
 * Load theme CSS content
 * @param {string} themeName - Theme name
 * @returns {string} CSS content
 */
export function loadThemeCss(themeName = DEFAULT_THEME) {
    const themeDir = getThemeDir(themeName);
    const cssPath = path.join(themeDir, 'style.css');

    if (!fs.existsSync(cssPath)) {
        throw new Error(`Theme not found: ${themeName}. Expected CSS at ${cssPath}`);
    }

    return fs.readFileSync(cssPath, 'utf-8');
}

/**
 * Encode theme asset as base64 data URI
 * @param {string} themeName - Theme name
 * @param {string} assetName - Asset filename
 * @returns {string} Base64 encoded data URI
 */
export function encodeAssetAsBase64(themeName, assetName) {
    const fullPath = getThemeAssetPath(themeName, assetName);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Asset not found at path: ${fullPath}`);
    }

    const data = fs.readFileSync(fullPath).toString('base64');
    return `data:image/png;base64,${data}`;
}

/**
 * Load all standard icons for a theme as base64 data URIs
 * @param {string} themeName - Theme name
 * @returns {Object} Object with iconFormat, iconDuration, iconAudience
 */
export function loadThemeIcons(themeName = DEFAULT_THEME) {
    return {
        iconFormat: encodeAssetAsBase64(themeName, 'icon-format.png'),
        iconDuration: encodeAssetAsBase64(themeName, 'icon-duration.png'),
        iconAudience: encodeAssetAsBase64(themeName, 'icon-audience.png'),
    };
}

/**
 * Get theme-specific logo filename
 * @param {string} themeName - Theme name
 * @returns {Promise<string>} Logo filename
 */
export async function getThemeLogoFilename(themeName = DEFAULT_THEME) {
    const config = await loadThemeConfig(themeName);
    return config.header.logo;
}

/**
 * Get theme-specific footer logo filename
 * @param {string} themeName - Theme name
 * @returns {Promise<string>} Footer logo filename
 */
export async function getThemeFooterLogoFilename(themeName = DEFAULT_THEME) {
    const config = await loadThemeConfig(themeName);
    return config.footer.logo;
}

/**
 * Get theme constants
 * @returns {Object} {THEMES_DIR, DEFAULT_THEME}
 */
export function getThemeConstants() {
    return { THEMES_DIR, DEFAULT_THEME };
}

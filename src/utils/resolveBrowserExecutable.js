import fs from 'fs';
import os from 'os';
import path from 'path';

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
];

const WINDOWS_NO_BROWSER_ERROR =
    'No supported browser found on Windows. Install Google Chrome or Microsoft Edge, then retry.';

/**
 * Platform-specific browser executable paths, in search order.
 * @returns {string[]}
 */
function getBrowserCandidatePaths() {
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        return [
            path.join('C:', 'Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join('C:', 'Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join('C:', 'Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            path.join('C:', 'Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ];
    }

    if (process.platform === 'darwin') {
        return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
    }

    return [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ];
}

/**
 * Resolve the first existing system browser executable for the current platform.
 * @returns {string|null} Absolute path to browser executable, or null if none found
 */
export function resolveBrowserExecutable() {
    for (const candidatePath of getBrowserCandidatePaths()) {
        if (fs.existsSync(candidatePath)) {
            return candidatePath;
        }
    }
    return null;
}

/**
 * Build Puppeteer launch options for the current platform.
 * Windows requires a system Chrome or Edge install and uses pipe transport.
 * @returns {import('puppeteer').LaunchOptions}
 */
export function getPuppeteerLaunchOptions() {
    const launchOptions = {
        headless: true,
        args: [...PUPPETEER_ARGS],
    };

    const executablePath = resolveBrowserExecutable();
    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    if (process.platform === 'win32') {
        launchOptions.pipe = true;
        launchOptions.protocolTimeout = 180_000;

        if (!executablePath) {
            throw new Error(WINDOWS_NO_BROWSER_ERROR);
        }
    }

    return launchOptions;
}

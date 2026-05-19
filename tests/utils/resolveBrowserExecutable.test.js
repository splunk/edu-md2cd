import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

describe('resolveBrowserExecutable', () => {
    let existsSyncSpy;
    let platformDescriptor;

    beforeEach(() => {
        existsSyncSpy = vi.spyOn(fs, 'existsSync');
        platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (platformDescriptor) {
            Object.defineProperty(process, 'platform', platformDescriptor);
        }
    });

    it('returns the first existing browser path', async () => {
        Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
        const chromePath = '/usr/bin/google-chrome';
        existsSyncSpy.mockImplementation((filePath) => filePath === chromePath);

        vi.resetModules();
        const { resolveBrowserExecutable } = await import('../../src/utils/resolveBrowserExecutable.js');

        const result = resolveBrowserExecutable();

        expect(result).toBe(chromePath);
        expect(existsSyncSpy).toHaveBeenCalled();
    });

    it('returns null when no browser exists', async () => {
        Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
        existsSyncSpy.mockReturnValue(false);

        vi.resetModules();
        const { resolveBrowserExecutable } = await import('../../src/utils/resolveBrowserExecutable.js');

        const result = resolveBrowserExecutable();

        expect(result).toBeNull();
    });
});

describe('getPuppeteerLaunchOptions', () => {
    let existsSyncSpy;
    let platformDescriptor;

    beforeEach(() => {
        existsSyncSpy = vi.spyOn(fs, 'existsSync');
        platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (platformDescriptor) {
            Object.defineProperty(process, 'platform', platformDescriptor);
        }
    });

    function mockPlatform(platform) {
        Object.defineProperty(process, 'platform', {
            configurable: true,
            value: platform,
        });
    }

    it('on Windows sets pipe, protocolTimeout, and executablePath when browser exists', async () => {
        mockPlatform('win32');
        const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        existsSyncSpy.mockImplementation((filePath) => filePath === chromePath);

        vi.resetModules();
        const { getPuppeteerLaunchOptions } = await import('../../src/utils/resolveBrowserExecutable.js');

        const options = getPuppeteerLaunchOptions();

        expect(options.headless).toBe(true);
        expect(options.pipe).toBe(true);
        expect(options.protocolTimeout).toBe(180_000);
        expect(options.executablePath).toBe(chromePath);
        expect(options.args).toEqual([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ]);
    });

    it('on Windows throws when no browser is found', async () => {
        mockPlatform('win32');
        existsSyncSpy.mockReturnValue(false);

        vi.resetModules();
        const { getPuppeteerLaunchOptions } = await import('../../src/utils/resolveBrowserExecutable.js');

        expect(() => getPuppeteerLaunchOptions()).toThrow(
            'No supported browser found on Windows. Install Google Chrome or Microsoft Edge, then retry.',
        );
    });

    it('on non-Windows does not set pipe or require executablePath', async () => {
        mockPlatform('darwin');
        existsSyncSpy.mockReturnValue(false);

        vi.resetModules();
        const { getPuppeteerLaunchOptions } = await import('../../src/utils/resolveBrowserExecutable.js');

        const options = getPuppeteerLaunchOptions();

        expect(options.pipe).toBeUndefined();
        expect(options.protocolTimeout).toBeUndefined();
        expect(options.executablePath).toBeUndefined();
        expect(options.headless).toBe(true);
        expect(options.args).toEqual([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ]);
    });

    it('on non-Windows sets executablePath when browser exists', async () => {
        mockPlatform('darwin');
        const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        existsSyncSpy.mockImplementation((filePath) => filePath === chromePath);

        vi.resetModules();
        const { getPuppeteerLaunchOptions } = await import('../../src/utils/resolveBrowserExecutable.js');

        const options = getPuppeteerLaunchOptions();

        expect(options.executablePath).toBe(chromePath);
        expect(options.pipe).toBeUndefined();
    });
});

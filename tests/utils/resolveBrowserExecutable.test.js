import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

vi.mock('fs');

describe('resolveBrowserExecutable', () => {
    let platformDescriptor;

    beforeEach(() => {
        platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (platformDescriptor) {
            Object.defineProperty(process, 'platform', platformDescriptor);
        }
    });

    it('returns the first existing browser path', async () => {
        Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
        const chromePath = '/usr/bin/google-chrome';
        
        vi.resetModules();
        const fs = (await import('fs')).default;
        fs.existsSync.mockImplementation((filePath) => filePath === chromePath);
        const { resolveBrowserExecutable } = await import('../../src/utils/resolveBrowserExecutable.js');

        const result = resolveBrowserExecutable();

        expect(result).toBe(chromePath);
        expect(fs.existsSync).toHaveBeenCalled();
    });

    it('returns null when no browser exists', async () => {
        Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
        
        vi.resetModules();
        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(false);
        const { resolveBrowserExecutable } = await import('../../src/utils/resolveBrowserExecutable.js');

        const result = resolveBrowserExecutable();

        expect(result).toBeNull();
    });
});

describe('getPuppeteerLaunchOptions', () => {
    let platformDescriptor;

    beforeEach(() => {
        platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
        vi.clearAllMocks();
    });

    afterEach(() => {
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

    it.skip('on Windows sets pipe, protocolTimeout, and executablePath when browser exists', async () => {
        const { getPuppeteerLaunchOptions } = await import('../../src/utils/resolveBrowserExecutable.js');
        
        mockPlatform('win32');
        const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        
        vi.mocked(fs.existsSync).mockImplementation((filePath) => filePath === chromePath);

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
        
        vi.resetModules();
        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(false);
        const { getPuppeteerLaunchOptions } = await import('../../src/utils/resolveBrowserExecutable.js');

        expect(() => getPuppeteerLaunchOptions()).toThrow(
            'No supported browser found on Windows. Install Google Chrome or Microsoft Edge, then retry.',
        );
    });

    it('on non-Windows does not set pipe or require executablePath', async () => {
        mockPlatform('darwin');
        
        vi.resetModules();
        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(false);
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
        
        vi.resetModules();
        const fs = (await import('fs')).default;
        fs.existsSync.mockImplementation((filePath) => filePath === chromePath);
        const { getPuppeteerLaunchOptions } = await import('../../src/utils/resolveBrowserExecutable.js');

        const options = getPuppeteerLaunchOptions();

        expect(options.executablePath).toBe(chromePath);
        expect(options.pipe).toBeUndefined();
    });
});

/**
 * Puppeteer diagnostic script for Windows troubleshooting
 * Run this to test if Puppeteer can launch Chrome successfully
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

console.log('🔍 Testing Puppeteer/Chrome setup...\n');

// Try to find Chrome installations
console.log('📍 Checking Chrome installations:');
const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];

let systemChrome = null;
for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
        console.log(`  ✅ Found system Chrome: ${chromePath}`);
        systemChrome = chromePath;
        break;
    }
}

if (!systemChrome) {
    console.log('  ⚠️  No system Chrome found');
}

// Check for bundled Chrome
const nodeModulesPath = path.resolve('./node_modules/puppeteer');
if (fs.existsSync(nodeModulesPath)) {
    console.log(`  ✅ Puppeteer installed at: ${nodeModulesPath}`);
} else {
    console.log('  ⚠️  Puppeteer not found in node_modules');
}

console.log();

const configurations = [
    {
        name: 'Default (WebSocket)',
        config: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    },
    {
        name: 'Pipe transport (Windows-optimized)',
        config: {
            headless: true,
            pipe: true,
            protocolTimeout: 180000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        }
    },
    {
        name: 'System Chrome (explicit path)',
        config: {
            headless: true,
            pipe: true,
            executablePath: systemChrome,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu'
            ]
        },
        skip: !systemChrome
    },
    {
        name: 'Visible Chrome (non-headless)',
        config: {
            headless: false,
            pipe: true,
            executablePath: systemChrome,
            args: ['--no-sandbox']
        },
        skip: !systemChrome
    }
];

for (const { name, config, skip } of configurations) {
    if (skip) {
        console.log(`Skipping: ${name} (not available)`);
        console.log();
        continue;
    }
    
    console.log(`Testing: ${name}`);
    let browser;
    
    try {
        console.log(`  🔄 Launching browser...`);
        browser = await puppeteer.launch(config);
        console.log(`  ✅ Browser launched successfully`);
        
        const page = await browser.newPage();
        console.log(`  ✅ Page created successfully`);
        
        await page.setContent('<html><body><h1>Test</h1></body></html>');
        console.log(`  ✅ Content set successfully`);
        
        const pdfBuffer = await page.pdf({ format: 'Letter' });
        console.log(`  ✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
        
        await browser.close();
        console.log(`  ✅ Browser closed successfully`);
        console.log(`  🎉 ${name} PASSED\n`);
        
    } catch (error) {
        console.error(`  ❌ ${name} FAILED`);
        console.error(`  Error: ${error.message}`);
        if (error.cause) {
            console.error(`  Cause: ${error.cause.message || error.cause}`);
        }
        if (error.stack) {
            const stackLines = error.stack.split('\n').slice(1, 3);
            console.error(`  Stack: ${stackLines.join(' ')}`);
        }
        console.log();
        
        if (browser) {
            try {
                await browser.close();
            } catch {
                // Ignore
            }
        }
    }
}

console.log('\n📊 Diagnostic complete!');
console.log('\n🔧 Windows-specific troubleshooting:');
console.log('  1. Antivirus/Windows Defender:');
console.log('     - Add Chrome and Node.js to exclusions');
console.log('     - Temporarily disable to test');
console.log('  2. Missing dependencies:');
console.log('     - Install Visual C++ Redistributable 2015-2022');
console.log('     - Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe');
console.log('  3. Chrome installation:');
console.log('     - Try: npx @puppeteer/browsers install chrome@stable');
console.log('     - Or reinstall Google Chrome manually');
console.log('  4. Windows permissions:');
console.log('     - Run PowerShell as Administrator');
console.log('     - Check: Get-ExecutionPolicy (should be RemoteSigned or Unrestricted)');
console.log('  5. Alternative solution:');
console.log('     - Use Docker: docker run -it --rm node:18 (run tool inside container)');
console.log('  6. Try older Node.js:');
console.log('     - Node 18 LTS has better Puppeteer compatibility than Node 22');

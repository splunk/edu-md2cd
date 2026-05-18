/**
 * Puppeteer diagnostic script for Windows troubleshooting
 * Run this to test if Puppeteer can launch Chrome successfully
 */
import puppeteer from 'puppeteer';

console.log('🔍 Testing Puppeteer/Chrome setup...\n');

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
        name: 'New headless mode',
        config: {
            headless: 'new',
            pipe: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        }
    }
];

for (const { name, config } of configurations) {
    console.log(`Testing: ${name}`);
    let browser;
    
    try {
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
            console.error(`  Cause: ${error.cause.message}`);
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
console.log('\nTroubleshooting tips:');
console.log('  • If all tests fail, Chrome may not be installed');
console.log('  • Try: npx puppeteer browsers install chrome');
console.log('  • Check antivirus/firewall settings');
console.log('  • Try running as Administrator');
console.log('  • Check Node.js version compatibility');

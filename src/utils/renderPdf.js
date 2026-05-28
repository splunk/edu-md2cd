import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { getPuppeteerLaunchOptions } from './resolveBrowserExecutable.js';

/**
 * Render HTML string to PDF buffer
 * @param {string} html - Complete HTML document
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function renderHtmlToPdf(html) {
    let browser;
    
    try {
        const launchOptions = getPuppeteerLaunchOptions();
        browser = await puppeteer.launch(launchOptions);
        
        const page = await browser.newPage();
        
        // Use domcontentloaded since all assets are embedded
        await page.setContent(html, { waitUntil: 'domcontentloaded' });

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '30mm',
                left: '20mm',
            },
        });

        return pdfBuffer;
    } catch (error) {
        throw new Error(`Failed to generate PDF: ${error.message}`, { cause: error });
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch {
                // Ignore close errors
            }
        }
    }
}

/**
 * Add themed footer with logo to PDF
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {string} _themeName - Theme name
 * @returns {Promise<Buffer>} Modified PDF buffer
 */
export async function addFooterWithLogo(pdfBuffer, _themeName) {
    // Footer rendering is disabled - return PDF as-is
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return await pdfDoc.save();
}

/**
 * Generate complete PDF from HTML with themed footer
 * @param {string} html - Complete HTML document
 * @param {string} themeName - Theme name
 * @returns {Promise<Buffer>} Final PDF buffer
 */
export async function generatePdf(html, themeName) {
    try {
        const pdfBuffer = await renderHtmlToPdf(html);
        return await addFooterWithLogo(pdfBuffer, themeName);
    } catch (error) {
        throw new Error(`PDF generation failed: ${error.message}`, { cause: error });
    }
}

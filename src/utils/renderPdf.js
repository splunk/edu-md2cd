import puppeteer from 'puppeteer';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import { loadThemeConfig, getThemeAssetPath, getThemeFooterLogoFilename } from './loadTheme.js';

/**
 * Render HTML string to PDF buffer
 * @param {string} html - Complete HTML document
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function renderHtmlToPdf(html) {
    let browser;
    
    try {
        // Launch browser with args for better Windows compatibility
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set longer timeout and use more forgiving wait strategy
        page.setDefaultTimeout(60000);
        
        // Use domcontentloaded instead of networkidle0 since all assets are embedded
        await page.setContent(html, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });

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
        // Always close browser, even if error occurred
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Add gradient footer to PDF (Cisco theme)
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {Buffer} logoBuffer - Logo image buffer
 * @param {Object} config - Theme configuration
 * @returns {Promise<void>}
 */
async function addGradientFooter(pdfDoc, logoBuffer, config) {
    const logoImage = await pdfDoc.embedPng(logoBuffer);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width } = lastPage.getSize();

    const gradientColors = config.footer.gradient.colors;
    const footerHeight = config.footer.gradient.height;
    const footerY = config.footer.position.y;
    const numStripes = config.footer.gradient.stripes;
    const stripeHeight = footerHeight / numStripes;

    // Draw gradient stripes
    for (let i = 0; i < numStripes; i++) {
        const progress = i / numStripes;
        const colorIndex = Math.floor(progress * (gradientColors.length - 1));
        const localProgress = (progress * (gradientColors.length - 1)) % 1;

        if (colorIndex >= gradientColors.length - 1) {
            const lastColor = gradientColors[gradientColors.length - 1];
            lastPage.drawRectangle({
                x: 0,
                y: footerY + i * stripeHeight,
                width: width,
                height: stripeHeight + 0.5,
                color: rgb(lastColor[0] / 255, lastColor[1] / 255, lastColor[2] / 255),
            });
            continue;
        }

        const c1 = gradientColors[colorIndex];
        const c2 = gradientColors[colorIndex + 1];

        const r = c1[0] + (c2[0] - c1[0]) * localProgress;
        const g = c1[1] + (c2[1] - c1[1]) * localProgress;
        const b = c1[2] + (c2[2] - c1[2]) * localProgress;

        lastPage.drawRectangle({
            x: 0,
            y: footerY + i * stripeHeight,
            width: width,
            height: stripeHeight + 0.5,
            color: rgb(r / 255, g / 255, b / 255),
        });
    }

    // Add logo
    const targetLogoWidth = config.footer.logoPlacement.width;
    const scale = targetLogoWidth / logoImage.width;
    const logoDims = logoImage.scale(scale);

    const logoX =
        config.footer.logoPlacement.side === 'right'
            ? width - logoDims.width - config.footer.logoPlacement.margin
            : config.footer.logoPlacement.margin;
    const logoY = footerY + (footerHeight - logoDims.height) / 2;

    lastPage.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoDims.width,
        height: logoDims.height,
    });
}

/**
 * Add centered logo footer to PDF (Splunk theme)
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {Buffer} logoBuffer - Logo image buffer
 * @param {Object} config - Theme configuration
 * @returns {Promise<void>}
 */
async function addCenteredLogoFooter(pdfDoc, logoBuffer, config) {
    const logoImage = await pdfDoc.embedPng(logoBuffer);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    // Content width: Letter (612pt) minus 20mm margins on each side (20mm ≈ 56.7pt)
    // 612 - (2 * 56.7) = 498.6 points
    const contentWidth = config.footer.width === 'content-width' ? 499 : config.footer.width;
    const scale = contentWidth / logoImage.width;
    const logoDims = logoImage.scale(scale);

    const { width } = lastPage.getSize();
    const logoX = (width - logoDims.width) / 2;
    const logoY = config.footer.position.y;

    lastPage.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoDims.width,
        height: logoDims.height,
    });
}

/**
 * Add themed footer with logo to PDF
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {string} themeName - Theme name
 * @returns {Promise<Buffer>} Modified PDF buffer
 */
export async function addFooterWithLogo(pdfBuffer, themeName) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const config = await loadThemeConfig(themeName);

    // Skip footer if theme doesn't define one
    if (!config.footer || !config.footer.type) {
        return await pdfDoc.save();
    }

    const footerLogoFilename = await getThemeFooterLogoFilename(themeName);
    const footerLogoPath = getThemeAssetPath(themeName, footerLogoFilename);
    const logoBuffer = fs.readFileSync(footerLogoPath);

    if (config.footer.type === 'gradient-with-logo') {
        await addGradientFooter(pdfDoc, logoBuffer, config);
    } else if (config.footer.type === 'centered-logo') {
        await addCenteredLogoFooter(pdfDoc, logoBuffer, config);
    } else {
        throw new Error(`Unknown footer type: ${config.footer.type}`);
    }

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

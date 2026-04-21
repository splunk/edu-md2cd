import { Stage } from '../pipeline.js';
import { generatePdf } from '../utils/renderPdf.js';
import { ensurePDFDirectoryExists } from '../utils/fileHandler.js';
import { getCourseTitle, slugify, getCourseFormats } from '../utils/metadataHandler.js';
import { buildFullHtml } from '../utils/buildHtml.js';
import { convertToHtml } from '../utils/convertMarkdown.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Stage 50: Build PDF(s) and write to output
 * Generates PDF(s) from HTML and writes to the configured output path
 * Supports multiple formats - generates one PDF per format
 */
export class BuildStage extends Stage {
    constructor() {
        super('50-build');
    }

    async execute(context) {
        logger.info('🏗️  Building PDF(s)...');

        try {
            // Get all formats from manifest
            const formats = getCourseFormats(context.manifest);
            
            // Determine output directory
            let outputDir;
            if (context.options.flatOutputRoot) {
                // Flat mode: use root dist folder
                outputDir = context.options.flatOutputRoot;
            } else if (context.outputDestination) {
                // Use manifest-specified destination
                outputDir = path.join(context.sourceDir, context.outputDestination);
            } else {
                // Default: ./dist in source directory
                outputDir = path.join(context.sourceDir, 'dist');
            }

            context.outputDir = outputDir;
            await ensurePDFDirectoryExists(outputDir);

            // Get custom output configuration if any
            const customPdfConfig = context.manifest?.output?.pdfs?.courseDescription;

            // Generate PDF for each format
            const outputPaths = [];
            
            for (let formatIndex = 0; formatIndex < formats.length; formatIndex++) {
                const format = formats[formatIndex];
                const mode = format.mode;
                
                logger.info(`  Generating PDF for format: ${mode}`);

                // Determine output filename for this format
                const outputFilename = this.getOutputFilename(
                    context,
                    mode,
                    formatIndex,
                    formats.length,
                    customPdfConfig
                );

                const outputPath = path.join(outputDir, outputFilename);

                // Regenerate HTML for this specific format
                // Convert cleaned markdown to HTML
                const mainHtml = convertToHtml(context.cleanedMarkdown);
                
                // Build complete HTML document with this format's metadata
                const html = await buildFullHtml(
                    context.manifest,
                    mainHtml,
                    context.theme,
                    context.prereqMarkdown,
                    formatIndex,
                );
                
                // Generate PDF
                logger.info(`    Output: ${outputPath}`);
                const pdfBuffer = await generatePdf(html, context.theme);

                // Write PDF to disk
                await fs.writeFile(outputPath, pdfBuffer);
                outputPaths.push(outputPath);
                
                logger.info(`    ✅ PDF generated successfully`);
            }

            // Store all output paths in context
            context.outputPath = outputPaths.length === 1 ? outputPaths[0] : outputPaths;
            
            if (formats.length > 1) {
                logger.info(`✅ ${formats.length} PDFs generated successfully`);
            } else {
                logger.info(`✅ PDF generated successfully`);
            }
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }

    /**
     * Get output filename for a specific format
     * @param {Object} context - Pipeline context
     * @param {string} mode - Course delivery mode
     * @param {number} formatIndex - Index of current format
     * @param {number} totalFormats - Total number of formats
     * @param {string|Array} customPdfConfig - Custom PDF configuration
     * @returns {string} Output filename
     */
    getOutputFilename(context, mode, formatIndex, totalFormats, customPdfConfig) {
        const courseTitle = getCourseTitle(context.manifest);
        const slug = slugify(courseTitle);

        // Check for custom filename
        if (customPdfConfig) {
            if (typeof customPdfConfig === 'string') {
                // Single custom filename (backward compatibility)
                return customPdfConfig;
            } else if (Array.isArray(customPdfConfig)) {
                // Array of custom filenames per format
                const customConfig = customPdfConfig.find(cfg => cfg.mode === mode);
                if (customConfig && customConfig.title) {
                    return customConfig.title;
                }
            }
        }

        // Generate default filename
        if (totalFormats === 1) {
            // Single format: use traditional naming
            return `${slug}-course-description.pdf`;
        } else {
            // Multiple formats: append mode slug
            const modeSlug = slugify(mode);
            return `${slug}-${modeSlug}.pdf`;
        }
    }
}

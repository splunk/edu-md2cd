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

            // Get custom output configuration
            const customPdfConfig = context.manifest?.output?.pdfs?.courseDescription;
            
            const outputPaths = [];
            
            // Check if this is a custom format combinations array
            if (Array.isArray(customPdfConfig) && customPdfConfig.length > 0 && customPdfConfig[0].includes) {
                // Custom format combinations mode
                logger.info(`  Custom format combinations: ${customPdfConfig.length} PDF(s) to generate`);
                
                // Validate all includes against available formats
                this.validateCustomFormatCombinations(customPdfConfig, formats);
                
                // Generate PDF for each custom combination
                for (const config of customPdfConfig) {
                    const { filename, includes } = config;
                    
                    // Filter formats to only those in includes
                    const customFormats = formats.filter(fmt => includes.includes(fmt.mode));
                    
                    logger.info(`  Generating PDF: ${filename} (${customFormats.length} format${customFormats.length > 1 ? 's' : ''})`);
                    
                    const outputPath = path.join(outputDir, filename);
                    
                    // Convert cleaned markdown to HTML
                    const mainHtml = convertToHtml(context.cleanedMarkdown);
                    
                    // Build complete HTML document with custom formats
                    const html = await buildFullHtml(
                        context.manifest,
                        mainHtml,
                        context.theme,
                        context.prereqMarkdown,
                        0,
                        false,
                        customFormats
                    );
                    
                    // Generate PDF
                    logger.info(`    Output: ${outputPath}`);
                    const pdfBuffer = await generatePdf(html, context.theme);
                    
                    // Write PDF to disk
                    await fs.writeFile(outputPath, pdfBuffer);
                    outputPaths.push(outputPath);
                    
                    logger.info(`    ✅ PDF generated successfully`);
                }
            } else {
                // Original split/combined strategy mode
                // Determine format strategy: 'combined' (default) or 'split'
                let formatStrategy = 'combined';
                if (customPdfConfig && typeof customPdfConfig === 'object' && !Array.isArray(customPdfConfig)) {
                    formatStrategy = customPdfConfig.format || 'combined';
                }
                
                // Determine which formats to process
                let formatsToProcess;
                if (formatStrategy === 'split') {
                    // Split mode: generate one PDF per format
                    formatsToProcess = formats.map((fmt, idx) => idx);
                } else {
                    // Combined mode: generate single PDF with first format (shows table if multiple)
                    formatsToProcess = [0];
                }
                
                // Generate PDF(s)
                for (const formatIndex of formatsToProcess) {
                    const format = formats[formatIndex];
                    const mode = format.mode;
                    
                    logger.info(`  Generating PDF for format: ${mode}`);

                    // Determine output filename for this format
                    const outputFilename = this.getOutputFilename(
                        context,
                        mode,
                        formatIndex,
                        formats.length,
                        customPdfConfig,
                        formatStrategy
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
                        formatStrategy === 'split' // showSingleFormat
                    );
                    
                    // Generate PDF
                    logger.info(`    Output: ${outputPath}`);
                    const pdfBuffer = await generatePdf(html, context.theme);

                    // Write PDF to disk
                    await fs.writeFile(outputPath, pdfBuffer);
                    outputPaths.push(outputPath);
                    
                    logger.info(`    ✅ PDF generated successfully`);
                }
            }

            // Store output path(s) in context
            context.outputPath = outputPaths.length === 1 ? outputPaths[0] : outputPaths;
            
            if (outputPaths.length > 1) {
                logger.info(`✅ ${outputPaths.length} PDFs generated successfully`);
            } else {
                logger.info(`✅ PDF generated successfully`);
            }
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }

    /**
     * Validate custom format combinations
     * Ensures all modes in includes arrays exist in metadata.format
     * @param {Array} customPdfConfig - Array of custom format combinations
     * @param {Array} availableFormats - Array of format objects from metadata
     * @throws {Error} If any mode in includes doesn't exist in metadata.format
     */
    validateCustomFormatCombinations(customPdfConfig, availableFormats) {
        const availableModes = availableFormats.map(fmt => fmt.mode);
        
        for (const config of customPdfConfig) {
            const { filename, includes } = config;
            
            for (const mode of includes) {
                if (!availableModes.includes(mode)) {
                    throw new Error(
                        `Invalid format combination in ${filename}: ` +
                        `Mode "${mode}" is not defined in metadata.format. ` +
                        `Available modes: ${availableModes.join(', ')}`
                    );
                }
            }
        }
    }

    /**
     * Get output filename for a specific format
     * @param {Object} context - Pipeline context
     * @param {string} mode - Course delivery mode
     * @param {number} formatIndex - Index of current format
     * @param {number} totalFormats - Total number of formats
     * @param {string|Array|Object} customPdfConfig - Custom PDF configuration
     * @param {string} formatStrategy - 'combined' or 'split'
     * @returns {string} Output filename
     */
    getOutputFilename(context, mode, formatIndex, totalFormats, customPdfConfig, formatStrategy) {
        const courseTitle = getCourseTitle(context.manifest);
        const slug = slugify(courseTitle);
        const modeSlug = slugify(mode);

        // Handle object-based configuration
        if (customPdfConfig && typeof customPdfConfig === 'object' && !Array.isArray(customPdfConfig)) {
            const baseFilename = customPdfConfig.filename || `${slug}-course-description`;
            
            if (formatStrategy === 'split' && totalFormats > 1) {
                // Split mode: append mode suffix
                const baseName = baseFilename.replace(/\.pdf$/i, '');
                // Use short mode codes for common modes
                const modeSuffix = this.getModeCode(mode);
                return `${baseName}-${modeSuffix}.pdf`;
            } else {
                // Combined mode or single format
                return baseFilename.endsWith('.pdf') ? baseFilename : `${baseFilename}.pdf`;
            }
        }

        // Check for custom filename (backward compatibility)
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
            return `${slug}-${modeSlug}.pdf`;
        }
    }

    /**
     * Get short mode code for filename suffixes
     * @param {string} mode - Full mode name
     * @returns {string} Short mode code
     */
    getModeCode(mode) {
        const modeLower = mode.toLowerCase();
        
        // Map common modes to short codes
        if (modeLower.includes('elearning') || modeLower.includes('e-learning')) {
            if (modeLower.includes('lab')) {
                return 'eln-lab';
            }
            return 'eln';
        }
        if (modeLower.includes('instructor') || modeLower.includes('ilt')) {
            if (modeLower.includes('lab')) {
                return 'ilt-lab';
            }
            return 'ilt';
        }
        if (modeLower.includes('lab') && modeLower.includes('only')) {
            return 'lab';
        }
        
        // Default: use slugified mode
        return slugify(mode);
    }
}

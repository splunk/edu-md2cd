import { Stage } from '../pipeline.js';
import { generatePdf } from '../utils/renderPdf.js';
import { ensurePDFDirectoryExists } from '../utils/fileHandler.js';
import { getCourseId, getCourseTitle, getVersion, slugify } from '../utils/metadataHandler.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Stage 50: Build PDF and write to output
 * Generates PDF from HTML and writes to the configured output path
 */
export class BuildStage extends Stage {
    constructor() {
        super('50-build');
    }

    async execute(context) {
        logger.info('🏗️  Building PDF...');

        try {
            // Determine output filename
            const courseTitle = getCourseTitle(context.manifest);
            const slug = slugify(courseTitle);

            let outputFilename;
            if (context.customOutputFilename) {
                outputFilename = context.customOutputFilename;
            } else {
                outputFilename = `${slug}-course-description.pdf`;
            }

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
            context.outputPath = path.join(outputDir, outputFilename);

            // Ensure output directory exists
            await ensurePDFDirectoryExists(outputDir);

            // Generate PDF using utils
            logger.info(`  Output: ${context.outputPath}`);
            const pdfBuffer = await generatePdf(context.html, context.theme);

            // Write PDF to disk
            await fs.writeFile(context.outputPath, pdfBuffer);

            logger.info(`✅ PDF generated successfully`);
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }
}

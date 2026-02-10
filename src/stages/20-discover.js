import { Stage } from '../pipeline.js';
import { readMarkdownFile } from '../utils/fileHandler.js';
import logger from '../utils/logger.js';

/**
 * Stage 20: Discover and load markdown input file
 * Finds the course description markdown file based on manifest.input.courseDescription
 * or falls back to searching for *-course-description.md
 */
export class DiscoverStage extends Stage {
    constructor() {
        super('20-discover');
    }

    async execute(context) {
        logger.info('🔍 Discovering input files...');

        try {
            // Read markdown file (uses manifest.input.courseDescription if specified)
            const { content, filePath } = await readMarkdownFile(
                context.sourceDir,
                context.manifest,
            );

            context.markdownContent = content;
            context.markdownFilePath = filePath;

            logger.info(`  Input: ${filePath}`);
            logger.info(`  Content length: ${content.length} characters`);
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }
}

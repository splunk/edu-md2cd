import { Stage } from '../pipeline.js';
import { getManifestPath, loadManifest } from '../utils/metadataHandler.js';
import logger from '../utils/logger.js';

/**
 * Stage 10: Load manifest.json and plugins
 * Loads the manifest file and extracts metadata, plugins, theme, etc.
 */
export class LoadStage extends Stage {
    constructor() {
        super('10-load');
    }

    async execute(context) {
        logger.info('📦 Loading manifest...');

        try {
            // Get manifest path (handles migration from metadata.yaml if needed)
            const manifestPath = await getManifestPath(context.sourceDir);
            context.manifestPath = manifestPath;

            // Load and parse manifest
            const manifest = await loadManifest(manifestPath);
            context.manifest = manifest;
            context.metadata = manifest.metadata;

            // Extract plugins if specified
            if (manifest.plugins && Array.isArray(manifest.plugins)) {
                context.plugins = manifest.plugins;
                logger.info(`  Found ${manifest.plugins.length} plugin(s)`);
            }

            // Extract theme if specified
            if (manifest.output?.theme) {
                context.theme = manifest.output.theme;
                logger.info(`  Theme: ${context.theme}`);
            } else {
                context.theme = 'splunk-edu'; // Default theme
                logger.info(`  Theme: ${context.theme} (default)`);
            }

            // Extract output configuration
            if (manifest.output?.destination) {
                context.outputDestination = manifest.output.destination;
            }

            if (manifest.output?.pdfs?.courseDescription) {
                context.customOutputFilename = manifest.output.pdfs.courseDescription;
            }

            logger.info(`  Course: ${context.metadata.courseTitle} (${context.metadata.courseId})`);
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }
}

import { Stage } from '../pipeline.js';
import { loadMetadataAndManifest } from '../utils/metadataHandler.js';
import { validateManifest, formatValidationErrors } from '../utils/validator.js';
import logger from '../utils/logger.js';

/**
 * Stage 10: Load metadata.json + optional manifest.json and plugins.
 * Loads both files, merges them, and extracts metadata, plugins, theme, etc.
 */
export class LoadStage extends Stage {
    constructor() {
        super('10-load');
    }

    async execute(context) {
        logger.info('📦 Loading manifest...');

        try {
            // Load and merge metadata.json (required) + manifest.json (optional)
            const manifest = await loadMetadataAndManifest(context.sourceDir, {
                migrateFormat: context.options.migrate || 'yaml',
            });
            context.manifest = manifest;
            context.metadata = manifest.metadata;

            // Validate manifest against schema
            const validation = validateManifest(manifest);
            if (!validation.valid) {
                const errorMessages = formatValidationErrors(validation.errors);
                logger.error('Manifest validation failed:');
                errorMessages.forEach((msg) => logger.error(`  ${msg}`));
                throw new Error('Manifest validation failed. Please fix the errors above.');
            }
            logger.info('✓ Manifest validated');

            // Extract plugins if specified
            if (manifest.plugins && Array.isArray(manifest.plugins)) {
                context.plugins = manifest.plugins;
                logger.info(`  Found ${manifest.plugins.length} plugin(s)`);
            }

            // Extract theme: CLI --theme overrides manifest, which overrides default
            if (context.options.theme) {
                context.theme = context.options.theme;
                logger.info(`  Theme: ${context.theme} (CLI override)`);
            } else if (manifest.output?.theme) {
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

            // Log course information
            const projectId = context.metadata.projectId;
            const courseId = context.metadata.courseId;
            const idParts = [];
            if (projectId) idParts.push(`Project: ${projectId}`);
            if (courseId) idParts.push(`Course: ${courseId}`);
            const idInfo = idParts.length > 0 ? ` (${idParts.join(', ')})` : '';
            logger.info(`  Course: ${context.metadata.courseTitle}${idInfo}`);
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }
}

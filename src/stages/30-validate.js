import { Stage } from '../pipeline.js';
import { getCourseId, getCourseTitle, getVersion, getProjectId } from '../utils/metadataHandler.js';
import { validateModality, validatePrerequisites } from '../utils/validator.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stage 30: Validate manifest, plugins, and theme
 * Ensures all required data is present and references are valid
 */
export class ValidateStage extends Stage {
    constructor() {
        super('30-validate');
    }

    async execute(context) {
        logger.info('✓ Validating configuration...');

        try {
            // Validate required metadata fields
            const projectId = getProjectId(context.manifest); // Required field
            const courseId = getCourseId(context.manifest); // Will fallback to projectId
            const courseTitle = getCourseTitle(context.manifest);
            const version = getVersion(context.manifest);

            if (!version) {
                context.addWarning("No 'version' found in metadata", this.name);
            }

            // Validate modality/format field
            const modalityValidation = validateModality(context.manifest);
            if (!modalityValidation.valid) {
                modalityValidation.errors.forEach((error) => {
                    context.addError(error, this.name);
                });
                return;
            }

            // Validate prerequisites
            const prerequisitesValidation = validatePrerequisites(context.manifest);
            if (!prerequisitesValidation.valid) {
                prerequisitesValidation.errors.forEach((error) => {
                    context.addError(error, this.name);
                });
                return;
            }

            // Validate theme exists
            const themePath = path.join(__dirname, '../../themes', context.theme);
            const themeCssPath = path.join(themePath, 'style.css');

            if (!fs.existsSync(themeCssPath)) {
                context.addError(`Theme not found: ${context.theme}`, this.name);
                return;
            }

            // Log validation results
            const hasCourseId = context.manifest?.metadata?.courseId;
            if (hasCourseId) {
                logger.info(`  Validated: ${courseTitle} (Project: ${projectId}, Course: ${courseId})`);
            } else {
                logger.info(`  Validated: ${courseTitle} (Project: ${projectId})`);
            }
            if (version) {
                logger.info(`  Version: ${version}`);
            }

            // Validate plugins (existence check, actual loading happens in convert stage)
            if (context.plugins.length > 0) {
                for (const pluginEntry of context.plugins) {
                    const pluginName =
                        typeof pluginEntry === 'string' ? pluginEntry : pluginEntry.name;
                    const pluginPath = path.join(
                        __dirname,
                        '../../plugins',
                        pluginName,
                        'index.js',
                    );

                    if (!fs.existsSync(pluginPath)) {
                        context.addWarning(`Plugin not found: ${pluginName}`, this.name);
                    } else {
                        logger.info(`  Plugin validated: ${pluginName}`);
                    }
                }
            }

            // Validate markdown content
            if (!context.markdownContent || context.markdownContent.trim() === '') {
                context.addError('Markdown content is empty', this.name);
            }
        } catch (error) {
            context.addError(error.message, this.name);
        }
    }
}

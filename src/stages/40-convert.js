import { Stage } from '../pipeline.js';
import { extractPrerequisites, convertToHtml } from '../utils/convertMarkdown.js';
import { buildFullHtml } from '../utils/buildHtml.js';
import pluginManager from '../../plugins/pluginLoader.js';
import logger from '../utils/logger.js';

/**
 * Stage 40: Convert markdown to HTML
 * Loads plugins, applies transformations, and generates HTML with theme
 */
export class ConvertStage extends Stage {
    constructor() {
        super('40-convert');
    }

    async execute(context) {
        logger.info('🔄 Converting markdown to HTML...');

        try {
            // Load and register plugins
            if (context.plugins.length > 0) {
                await this.loadPlugins(context.plugins);
            }

            // Extract prerequisites section
            const { prereqMarkdown, cleanedMarkdown } = extractPrerequisites(
                context.markdownContent,
            );

            // Convert main content to HTML
            const mainHtml = convertToHtml(cleanedMarkdown);

            // Build complete HTML document (buildFullHtml handles prerequisites + metadata internally)
            const html = await buildFullHtml(
                context.manifest,
                mainHtml,
                context.theme,
                prereqMarkdown,
            );
            context.html = html;

            logger.info(`  Generated HTML (${html.length} bytes)`);
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }

    /**
     * Load plugins from manifest
     * @param {Array} plugins - Plugin entries from manifest
     */
    async loadPlugins(plugins) {
        for (const pluginEntry of plugins) {
            try {
                let pluginName, userTranslations;

                if (typeof pluginEntry === 'string') {
                    pluginName = pluginEntry;
                } else {
                    pluginName = pluginEntry.name;
                    userTranslations = pluginEntry.translations;
                }

                const pluginModule = await import(`../../plugins/${pluginName}/index.js`);
                const plugin = pluginModule.default;
                pluginManager.register(plugin);

                if (userTranslations) {
                    pluginManager.registerUserTranslations(userTranslations);
                }

                logger.info(`  Loaded plugin: ${pluginName}`);
            } catch (err) {
                logger.warn(`  Failed to load plugin: ${err.message}`);
            }
        }
    }
}

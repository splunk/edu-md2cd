import { Stage } from '../pipeline.js';
import { extractPrerequisites, convertToHtml } from '../utils/convertMarkdown.js';
import { buildFullHtml } from '../utils/buildHtml.js';
import { generatePrerequisitesMarkdown } from '../utils/metadataHandler.js';
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

            // Check if prerequisites should be generated from metadata or extracted from markdown
            let prereqMarkdown;
            let cleanedMarkdown;

            const generatedPrereqs = generatePrerequisitesMarkdown(context.manifest);
            if (generatedPrereqs) {
                // Use generated prerequisites from metadata
                prereqMarkdown = generatedPrereqs;
                // Insert placeholder for prerequisites before Course Outline section
                cleanedMarkdown = this.insertPrerequisitesPlaceholder(context.markdownContent);
                logger.info('  Generated prerequisites from metadata');
            } else {
                // Fall back to extracting prerequisites from markdown (legacy behavior)
                const extracted = extractPrerequisites(context.markdownContent);
                prereqMarkdown = extracted.prereqMarkdown;
                cleanedMarkdown = extracted.cleanedMarkdown;
                if (prereqMarkdown) {
                    logger.info('  Extracted prerequisites from markdown');
                }
            }

            // Store cleaned markdown and prerequisites in context for build stage
            context.cleanedMarkdown = cleanedMarkdown;
            context.prereqMarkdown = prereqMarkdown;

            // Convert main content to HTML
            const mainHtml = convertToHtml(cleanedMarkdown);

            // Get formatIndex from context (default to 0 for backward compatibility)
            const formatIndex = context.formatIndex !== undefined ? context.formatIndex : 0;

            // Build complete HTML document (buildFullHtml handles prerequisites + metadata internally)
            const html = await buildFullHtml(
                context.manifest,
                mainHtml,
                context.theme,
                prereqMarkdown,
                formatIndex,
            );
            context.html = html;

            logger.info(`  Generated HTML (${html.length} bytes)`);
        } catch (error) {
            context.addError(error.message, this.name);
            throw error;
        }
    }

    /**
     * Insert prerequisites placeholder before Course Outline section
     * @param {string} markdown - Markdown content
     * @returns {string} Markdown with {{PREREQUISITES}} placeholder inserted
     */
    insertPrerequisitesPlaceholder(markdown) {
        const lines = markdown.replace(/\r\n/g, '\n').split('\n');
        const courseOutlineHeaders = pluginManager.getCourseOutlineHeaders();

        // Find the Course Outline header
        let insertIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim().toLowerCase();
            if (courseOutlineHeaders.some((header) => trimmedLine === header.toLowerCase())) {
                insertIndex = i;
                break;
            }
        }

        if (insertIndex === -1) {
            // No Course Outline found, insert at the end
            return markdown + '\n\n{{PREREQUISITES}}\n';
        }

        // Insert placeholder before Course Outline
        const before = lines.slice(0, insertIndex);
        const after = lines.slice(insertIndex);
        return [...before, '{{PREREQUISITES}}', '', ...after].join('\n');
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

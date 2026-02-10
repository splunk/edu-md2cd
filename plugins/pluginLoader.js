import logger from '../src/utils/logger.js';

class PluginManager {
    constructor() {
        this.plugins = [];
        this.hooks = {
            fontFamilies: [],
            prerequisiteHeaders: ['## prerequisites'],
            courseOutlineHeaders: ['## course outline'],
            labels: {},
            valueTranslations: {},
            fieldOverrides: {},
        };
    }

    register(plugin) {
        if (!plugin || !plugin.name) {
            logger.error('Plugin must have a name property');
            return;
        }

        this.plugins.push(plugin);
        logger.info(`✓ Loaded plugin: ${plugin.name}`);

        if (plugin.hooks) {
            if (plugin.hooks.fontFamilies) {
                this.hooks.fontFamilies.push(...plugin.hooks.fontFamilies);
            }
            if (plugin.hooks.prerequisiteHeaders) {
                this.hooks.prerequisiteHeaders.push(...plugin.hooks.prerequisiteHeaders);
            }
            if (plugin.hooks.courseOutlineHeaders) {
                this.hooks.courseOutlineHeaders.push(...plugin.hooks.courseOutlineHeaders);
            }
            if (plugin.hooks.labels) {
                Object.assign(this.hooks.labels, plugin.hooks.labels);
            }
            if (plugin.hooks.valueTranslations) {
                Object.assign(this.hooks.valueTranslations, plugin.hooks.valueTranslations);
            }
        }
    }

    getFontFamilies() {
        return this.hooks.fontFamilies;
    }

    getPrerequisiteHeaders() {
        return this.hooks.prerequisiteHeaders;
    }

    getCourseOutlineHeaders() {
        return this.hooks.courseOutlineHeaders;
    }

    getLabel(key, defaultValue) {
        return this.hooks.labels[key] || defaultValue;
    }

    registerUserTranslations(translations) {
        Object.assign(this.hooks.fieldOverrides, translations);
    }

    translateValue(value) {
        if (!value) return value;
        // Check built-in value translations
        return this.hooks.valueTranslations[value] || value;
    }

    getFieldOverride(field) {
        return this.hooks.fieldOverrides[field];
    }

    buildFontFamily(baseFonts) {
        const pluginFonts = this.getFontFamilies();
        if (pluginFonts.length === 0) {
            return baseFonts;
        }
        const baseParts = baseFonts.split(',').map((f) => f.trim());
        const genericIndex = baseParts.findIndex(
            (f) => f === 'sans-serif' || f === 'serif' || f === 'monospace',
        );

        if (genericIndex !== -1) {
            baseParts.splice(genericIndex, 0, ...pluginFonts);
        } else {
            baseParts.push(...pluginFonts);
        }

        return baseParts.join(', ');
    }
}

const pluginManager = new PluginManager();

export default pluginManager;

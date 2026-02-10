/**
 * Context object shared across pipeline stages
 * Each stage receives context, modifies it, and returns it for the next stage
 */
export class Context {
    constructor(options = {}) {
        // Input options from CLI
        this.sourceDir = options.sourceDir;
        this.options = options;

        // Manifest data
        this.manifest = null;
        this.metadata = null;

        // Input file
        this.markdownContent = null;
        this.markdownFilePath = null;

        // Generated content
        this.html = null;
        this.pdfBuffer = null;

        // Output configuration
        this.outputPath = null;
        this.outputDir = null;

        // Theme and plugins
        this.theme = null;
        this.plugins = [];

        // Errors and warnings
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Add error to context
     * @param {string} message - Error message
     * @param {string} stage - Stage where error occurred
     */
    addError(message, stage = 'unknown') {
        this.errors.push({ message, stage, timestamp: new Date().toISOString() });
    }

    /**
     * Add warning to context
     * @param {string} message - Warning message
     * @param {string} stage - Stage where warning occurred
     */
    addWarning(message, stage = 'unknown') {
        this.warnings.push({ message, stage, timestamp: new Date().toISOString() });
    }

    /**
     * Check if context has errors
     * @returns {boolean}
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * Get all error messages
     * @returns {string[]}
     */
    getErrorMessages() {
        return this.errors.map((e) => `[${e.stage}] ${e.message}`);
    }
}

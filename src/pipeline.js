import logger from './utils/logger.js';

/**
 * Pipeline executor - runs stages in sequence
 */
export class Pipeline {
    constructor(stages = []) {
        this.stages = stages;
    }

    /**
     * Execute all stages in sequence
     * @param {Context} context - Context object
     * @returns {Promise<Context>} Updated context
     */
    async run(context) {
        logger.info('🚀 Starting pipeline...');

        for (const stage of this.stages) {
            const stageName = stage.name || 'Unknown Stage';

            try {
                logger.debug(`Running stage: ${stageName}`);
                await stage.execute(context);

                // Check for errors after each stage
                if (context.hasErrors()) {
                    logger.error(`Stage ${stageName} generated errors:`);
                    context.getErrorMessages().forEach((msg) => logger.error(`  ${msg}`));
                    throw new Error(`Pipeline stopped due to errors in ${stageName}`);
                }

                // Log warnings if any
                if (context.warnings.length > 0) {
                    context.warnings.forEach((w) => {
                        if (w.stage === stageName) {
                            logger.warn(`  ${w.message}`);
                        }
                    });
                }
            } catch (error) {
                logger.error(`❌ Pipeline failed at stage: ${stageName}`);
                throw error;
            }
        }

        logger.info('✅ Pipeline completed successfully');
        return context;
    }

    /**
     * Add a stage to the pipeline
     * @param {Object} stage - Stage object with execute method
     */
    addStage(stage) {
        this.stages.push(stage);
    }
}

/**
 * Base class for pipeline stages
 */
export class Stage {
    constructor(name) {
        this.name = name;
    }

    /**
     * Execute the stage
     * @param {Context} context - Context object
     * @returns {Promise<void>}
     */
    async execute(context) {
        throw new Error(`Stage ${this.name} must implement execute() method`);
    }
}

import path from 'path';
import { validateSourcePath, findMarkdownFiles } from './utils/fileHandler.js';
import logger from './utils/logger.js';
import { Context } from './context.js';
import { Pipeline } from './pipeline.js';

// Import stages
import { LoadStage } from './stages/10-load.js';
import { DiscoverStage } from './stages/20-discover.js';
import { ValidateStage } from './stages/30-validate.js';
import { ConvertStage } from './stages/40-convert.js';
import { BuildStage } from './stages/50-build.js';

/**
 * Convert a single markdown file to PDF using the pipeline
 */
export async function convertMarkdownToPDF(sourceDir, options = {}, flatOutputRoot = null) {
    try {
        await validateSourcePath(sourceDir);

        // Create context
        const context = new Context({
            sourceDir,
            ...options,
            flatOutputRoot,
        });

        // Handle special options that bypass pipeline
        if (options.html) {
            // For --html mode, we need to run partial pipeline
            const pipeline = new Pipeline([
                new LoadStage(),
                new DiscoverStage(),
                new ValidateStage(),
                new ConvertStage(),
            ]);

            await pipeline.run(context);
            console.log(context.html);
            return;
        }

        if (options.dryRun) {
            const pipeline = new Pipeline([new LoadStage()]);
            await pipeline.run(context);

            const courseId = context.metadata?.courseId || context.metadata?.id || 'unknown';
            const courseTitle =
                context.metadata?.courseTitle || context.metadata?.title || 'Unknown';
            logger.info(`Will generate PDF for ${courseId}-${courseTitle}`);
            return;
        }

        // Full pipeline for PDF generation
        const pipeline = new Pipeline([
            new LoadStage(),
            new DiscoverStage(),
            new ValidateStage(),
            new ConvertStage(),
            new BuildStage(),
        ]);

        await pipeline.run(context);
    } catch (err) {
        logger.error('Error:', err.message);
        throw err;
    }
}

/**
 * Convert multiple markdown files recursively
 */
export async function convertAllMarkdownFiles(rootPath, options = {}) {
    const files = await findMarkdownFiles(rootPath);

    if (files.length === 0) {
        logger.info('No matching Markdown files found.');
        return;
    }

    if (options.dryRun) {
        logger.info(`Dry run: Found ${files.length} file(s):`);
        files.forEach((f) => logger.info('•', f));
        return;
    }

    // Set up flat output directory if --flat flag is used
    let flatOutputRoot = null;
    if (options.flat) {
        flatOutputRoot = options.output
            ? path.resolve(options.output)
            : path.join(rootPath, 'dist');
    }

    const succeeded = [];
    const failed = [];

    for (const filePath of files) {
        const folderPath = path.dirname(filePath);
        if (options.verbose) {
            logger.info(`Converting: ${filePath}`);
        }

        try {
            await convertMarkdownToPDF(folderPath, options, flatOutputRoot);
            succeeded.push(filePath);
        } catch (err) {
            logger.warn(`Skipping ${folderPath}: ${err.message}`);
            failed.push({ path: folderPath, error: err.message });
        }
    }

    // Print summary
    logger.info('');
    logger.info(
        `Summary: ${succeeded.length} succeeded, ${failed.length} failed (${files.length} total)`,
    );

    if (failed.length > 0) {
        logger.error('');
        logger.error('Failed courses:');
        for (const f of failed) {
            logger.error(`   • ${f.path}`);
            logger.error(`     ${f.error}`);
        }
    }
}

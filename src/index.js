#!/usr/bin/env node

import path from 'path';
import { Command } from 'commander';
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
async function convertMarkdownToPDF(sourceDir, options = {}, flatOutputRoot = null) {
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
            console.log(`🧪 Will generate PDF for ${courseId}-${courseTitle}`);
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
async function convertAllMarkdownFiles(rootPath, options = {}) {
    const files = await findMarkdownFiles(rootPath);

    if (files.length === 0) {
        console.log('No matching Markdown files found.');
        return;
    }

    if (options.dryRun) {
        console.log(`🧪 Dry run: Found ${files.length} file(s):`);
        files.forEach((f) => console.log('•', f));
        return;
    }

    // Set up flat output directory if --flat flag is used
    const flatOutputRoot = options.flat ? path.join(rootPath, 'dist') : null;

    for (const filePath of files) {
        const folderPath = path.dirname(filePath);
        if (options.verbose) {
            console.log(`📄 Converting: ${filePath}`);
        }

        await convertMarkdownToPDF(folderPath, options, flatOutputRoot);
    }
}

const program = new Command();

program
    .name('md2cd')
    .description('Convert Markdown course descriptions to PDF')
    .argument(
        '[sourceDir]',
        'Path to a course folder or root directory',
        // process.cwd()
    )
    .option(
        '-r, --recursive',
        "recursively convert all '-course-description.md' files in a given directory",
    )
    .option('-f, --flat', 'consolidate all outputs into root dist folder (use with --recursive)')
    .option('-d, --dry-run', 'list files that would be converted without generating output')
    .option('-H, --html', 'output generated HTML to console instead of PDF');
// .option("-v, --verbose", "enable detailed logging to console");
// .option("-l, --log <file>", "generate a log file; expects output path")
// .version("1.0.0");

program.action(async (sourceDir = '.', options) => {
    const absolutePath = path.resolve(sourceDir);

    let resolvedLogPath = undefined;
    if (options.log) {
        if (typeof options.log !== 'string') {
            console.error('⚠️ Please provide a log file name or path after the -l flag.');
            process.exit(1);
        }

        resolvedLogPath = path.isAbsolute(options.log)
            ? options.log
            : path.join(absolutePath, options.log);
    }

    const updatedOptions = { ...options, log: resolvedLogPath };

    if (options.recursive) {
        await convertAllMarkdownFiles(absolutePath, updatedOptions);
    } else {
        await convertMarkdownToPDF(absolutePath, updatedOptions);
    }
});

program.parse(process.argv);

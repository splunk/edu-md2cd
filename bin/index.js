#!/usr/bin/env node

import path from 'path';
import { Command } from 'commander';
import { convertMarkdownToPDF, convertAllMarkdownFiles } from '../src/index.js';

const program = new Command();

program
    .name('md2cd')
    .description('Convert Markdown course descriptions to PDF')
    .argument('[sourceDir]', 'Path to a course folder or root directory')
    .option(
        '-r, --recursive',
        "recursively convert all '-course-description.md' files in a given directory",
    )
    .option('-f, --flat', 'consolidate all outputs into root dist folder (use with --recursive)')
    .option('-o, --output <dir>', 'specify output directory for flat mode')
    .option('-t, --theme <name>', 'override theme (e.g., cisco, splunk-edu)')
    .option('-d, --dry-run', 'list files that would be converted without generating output')
    .option('-H, --html', 'output generated HTML to console instead of PDF');

program.action(async (sourceDir = '.', options) => {
    // If --output is used, require a sourceDir argument (not default '.')
    if (options.output && (!sourceDir || sourceDir === '.' || sourceDir === undefined)) {
        console.error(
            '❌ Error: When using --output/-o, you must specify both an output directory and an input directory.',
        );
        console.error('   Example: md2cd -rf -o /output/dir /input/dir');
        process.exit(1);
    }

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

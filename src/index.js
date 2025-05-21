#!/usr/bin/env node

import path from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";

import {
  readMarkdownFile,
  getOutputPath,
  ensurePDFDirectoryExists,
  validateSourcePath,
  findMarkdownFiles,
} from "./utils/fileHandler.js";

import { generateHTML } from "./generators/htmlGenerator.js";
import { generatePDF } from "./generators/pdfGenerator.js";
import logger from "./utils/logger.js";

import {
  getMetadataPath,
  loadMetadata,
  getCourseId,
  getCourseTitle,
  getProductVersion,
  slugify,
} from "./utils/metadataHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertMarkdownToPDF(sourceDir, options = {}) {
  try {
    await validateSourcePath(sourceDir);
    const { content, filePath } = await readMarkdownFile(sourceDir);

    // GET META!
    const metadataPath = await getMetadataPath(sourceDir);
    const metadata = await loadMetadata(metadataPath);

    let courseId, courseTitle, productVersion;

    try {
      courseId = getCourseId(metadata);
      courseTitle = getCourseTitle(metadata);
      productVersion = getProductVersion(metadata);
    } catch (err) {
      logger.error(`Uh oh! ${err.message}`);
      process.exit(1);
    }

    // if (options.verbose) {
    //   console.log("📝 Metadata:", metadata);
    // }

    const html = generateHTML(content, metadata, sourceDir);

    if (options.dryRun) {
      console.log(`🧪 Will generate PDF for ${courseId}-${courseTitle}`);
      // if (options.log) {
      //   logger(
      //     {
      //       timestamp: new Date().toISOString(),
      //       file: filePath,
      //       course_id: metadata.course_id,
      //       course_title: metadata.course_title,
      //       status: "dry-run",
      //     },
      //     options.log
      //   );
      // }
      return;
    }

    await ensurePDFDirectoryExists(sourceDir);

    // Con🐈enate output title
    const safeTitle =
      courseId + "-" + slugify(courseTitle) + "-" + productVersion;

    const outputPath = path.join(
      sourceDir,
      "pdfs",
      `${safeTitle}-course-description.pdf`
    );

    // Generate!
    logger.info(`⚙️  Generating PDF ${outputPath}`);
    await generatePDF(html, outputPath);

    if (options.log) {
      logger(
        {
          timestamp: new Date().toISOString(),
          file: filePath,
          course_id: metadata.course_id,
          course_title: metadata.course_title,
          output_pdf: outputPath,
          status: "success",
        },
        options.log
      );
    }
  } catch (err) {
    logger.error("Error:", err.message);

    // if (options.log) {
    //   logger(
    //     {
    //       timestamp: new Date().toISOString(),
    //       file: sourceDir,
    //       status: "error",
    //       error: err.message,
    //     },
    //     options.log
    //   );
    // }
  }
}

async function convertAllMarkdownFiles(rootPath, options = {}) {
  const files = await findMarkdownFiles(rootPath);

  if (files.length === 0) {
    console.log("No matching Markdown files found.");
    return;
  }

  if (options.dryRun) {
    console.log(`🧪 Dry run: Found ${files.length} file(s):`);
    files.forEach((f) => console.log("•", f));
    return;
  }

  for (const filePath of files) {
    const folderPath = path.dirname(filePath);
    if (options.verbose) {
      console.log(`📄 Converting: ${filePath}`);
    }

    await convertMarkdownToPDF(folderPath, options);
  }
}

const program = new Command();

program
  .name("md2cd")
  .description("Convert Markdown course descriptions to PDF")
  .argument(
    "[sourceDir]",
    "Path to a course folder or root directory"
    // process.cwd()
  )
  .option(
    "-r, --recursive",
    "recursively convert all '-course-description.md' files in a given directory"
  )
  .option(
    "-d, --dry-run",
    "list files that would be converted without generating output"
  );
// .option("-v, --verbose", "enable detailed logging to console");
// .option("-l, --log <file>", "generate a log file; expects output path")
// .version("1.0.0");

program.action(async (sourceDir = ".", options) => {
  const absolutePath = path.resolve(sourceDir);

  let resolvedLogPath = undefined;
  if (options.log) {
    if (typeof options.log !== "string") {
      console.error(
        "⚠️ Please provide a log file name or path after the -l flag."
      );
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

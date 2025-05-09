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
import { logEvent } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertMarkdownToPDF(sourcePath, options = {}) {
  try {
    await validateSourcePath(sourcePath);
    const { content, metadata, filePath } = await readMarkdownFile(sourcePath);

    if (options.verbose) {
      console.log("📝 Metadata:", metadata);
      console.log("📄 Markdown preview:", content.slice(0, 200), "...");
    }

    const html = generateHTML(content, metadata, sourcePath);

    if (options.dryRun) {
      console.log(
        `🧪 Dry run: would generate PDF for ${metadata.course_id} - ${metadata.course_title}`
      );
      if (options.log) {
        logEvent(
          {
            timestamp: new Date().toISOString(),
            file: filePath,
            course_id: metadata.course_id,
            course_title: metadata.course_title,
            status: "dry-run",
          },
          options.log
        );
      }
      return;
    }

    await ensurePDFDirectoryExists(sourcePath);

    const safeTitle =
      metadata.course_id.toString() +
      "-" +
      metadata.course_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-+|-+$)/g, "");

    const outputPath = path.join(
      sourcePath,
      "pdfs",
      `${safeTitle}-course-description.pdf`
    );

    await generatePDF(html, outputPath);

    console.log(`✅ PDF created at: ${outputPath}`);

    if (options.log) {
      logEvent(
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
    console.error("❌ Error:", err.message);

    if (options.log) {
      logEvent(
        {
          timestamp: new Date().toISOString(),
          file: sourcePath,
          status: "error",
          error: err.message,
        },
        options.log
      );
    }
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
  .argument("<sourcePath>", "Path to a course folder or root directory")
  .option(
    "-r, --recursive",
    "Recursively convert all '-course-description.md' files"
  )
  .option(
    "-d, --dry-run",
    "List files that would be converted but don't generate output"
  )
  .option("-v, --verbose", "Enable detailed logging to console")
  .option("-l, --log <file>", "Path to output log file")
  .version("1.0.0");

program.action(async (sourcePath, options) => {
  const absolutePath = path.resolve(sourcePath);

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

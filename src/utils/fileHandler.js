import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export async function readMarkdownFile(sourcePath) {
  const files = await fs.readdir(sourcePath);
  const match = files.find((file) => file.endsWith("course-description.md"));

  if (!match) {
    throw new Error(
      `No file ending with 'course-description.md' found in: ${sourcePath}`
    );
  }

  const filePath = path.join(sourcePath, match);
  const rawContent = await fs.readFile(filePath, "utf-8");

  const { content, data: metadata } = matter(rawContent);

  if (!content.trim()) {
    throw new Error("Markdown file is empty.");
  }

  return { content, metadata, filePath };
}

export function getOutputPath(sourcePath) {
  return path.join(sourcePath, "pdfs", "course-description.pdf");
}

export async function ensurePDFDirectoryExists(sourcePath) {
  const pdfDir = path.join(sourcePath, "pdfs");
  try {
    await fs.mkdir(pdfDir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create pdfs directory: ${err.message}`);
  }
}

export async function validateSourcePath(sourcePath) {
  try {
    const stat = await fs.stat(sourcePath);
    if (!stat.isDirectory()) {
      throw new Error();
    }
  } catch {
    throw new Error(`Source path is invalid or does not exist: ${sourcePath}`);
  }
}

export async function findMarkdownFiles(
  dir,
  pattern = "course-description.md",
  results = []
) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await findMarkdownFiles(fullPath, pattern, results);
      } else if (entry.isFile() && entry.name.endsWith(pattern)) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.error("❌ Error reading directory:", err.message);
  }

  return results;
}

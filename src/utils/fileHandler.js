import fs from 'fs/promises';
import path from 'path';

export async function readMarkdownFile(sourcePath, manifest = null) {
    let filePath;

    // Check if manifest has input.courseDescription specified
    if (manifest?.input?.courseDescription) {
        const specifiedPath = manifest.input.courseDescription;
        // Handle both absolute and relative paths
        filePath = path.isAbsolute(specifiedPath)
            ? specifiedPath
            : path.join(sourcePath, specifiedPath);

        // Verify the file exists
        try {
            await fs.access(filePath);
        } catch (err) {
            throw new Error(`Course description file specified in manifest not found: ${filePath}`);
        }
    } else {
        // Fallback to default behavior: find any file ending with "course-description.md"
        const files = await fs.readdir(sourcePath);
        const match = files.find((file) => file.endsWith('course-description.md'));

        if (!match) {
            throw new Error(`No file ending with 'course-description.md' found in ${sourcePath}`);
        }

        filePath = path.join(sourcePath, match);
    }

    const content = await fs.readFile(filePath, 'utf-8');

    if (!content.trim()) {
        throw new Error('Markdown file is empty.');
    }

    return { content, filePath };
}

export function getOutputPath(sourcePath) {
    return path.join(sourcePath, 'pdfs', 'course-description.pdf');
}

export async function ensurePDFDirectoryExists(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        throw new Error(`Failed to create output directory: ${err.message}`);
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

export async function findMarkdownFiles(dir, pattern = 'course-description.md', results = []) {
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
        console.error('❌ Error reading directory:', err.message);
    }

    return results;
}

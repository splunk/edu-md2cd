import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import logger from './logger.js';
import { migrateMetadata } from './migrator.js';

export function getCourseTitle(metadata) {
    // Support manifest.json (courseTitle or title) and legacy YAML (course_title)
    const courseTitle =
        metadata?.metadata?.courseTitle || metadata?.metadata?.title || metadata?.course_title;
    if (courseTitle === undefined) {
        throw new Error("No 'courseTitle', 'title', or 'course_title' found in the metadata");
    }
    return courseTitle;
}

export function getProjectId(metadata) {
    // Get project ID (required field)
    const projectId = metadata?.metadata?.projectId || metadata?.project_id;
    if (projectId === undefined) {
        throw new Error("No 'projectId' or 'project_id' found in the metadata");
    }
    return projectId;
}

export function getCourseId(metadata) {
    // Support manifest.json (courseId or id) and legacy YAML (course_id)
    // Falls back to projectId if courseId is not present
    const courseId = metadata?.metadata?.courseId || metadata?.metadata?.id || metadata?.course_id;
    if (courseId !== undefined) {
        return courseId;
    }
    
    // Fallback to projectId
    const projectId = metadata?.metadata?.projectId || metadata?.project_id;
    if (projectId !== undefined) {
        return projectId;
    }
    
    throw new Error("No 'courseId', 'id', 'projectId', or legacy identifiers found in the metadata");
}

export function getVersion(metadata) {
    // Support new nested structure (splunk.platform.version), old manifest.json, and legacy YAML
    const version =
        metadata?.metadata?.splunk?.platform?.version ||
        metadata?.metadata?.version ||
        metadata?.version;
    return version;
}

/**
 * Get all course formats from metadata
 * @param {Object} metadata - Manifest object
 * @returns {Array} Array of format objects with mode and duration
 */
export function getCourseFormats(metadata) {
    // Check for new format array structure
    const formats = metadata?.metadata?.format;
    if (Array.isArray(formats) && formats.length > 0) {
        return formats;
    }

    // Backward compatibility: check for old modality/duration fields
    const modality = metadata?.metadata?.modality || metadata?.format;
    const duration = metadata?.metadata?.duration || metadata?.duration;
    
    if (modality) {
        // Return as single-item array for consistency
        return [{
            mode: modality,
            duration: duration || undefined
        }];
    }

    throw new Error("No 'format', 'modality', or legacy 'format' found in the metadata");
}

/**
 * Get course format/mode from metadata (for backward compatibility)
 * Returns the mode from the first format or legacy modality field
 * @param {Object} metadata - Manifest object
 * @param {number} formatIndex - Index of format to get (default: 0)
 * @returns {string} Course mode/format
 */
export function getCourseFormat(metadata, formatIndex = 0) {
    const formats = getCourseFormats(metadata);
    if (!formats[formatIndex]) {
        throw new Error(`Format index ${formatIndex} not found`);
    }
    return formats[formatIndex].mode;
}

/**
 * Get course duration from metadata (for backward compatibility)
 * Returns the duration from the first format or legacy duration field
 * @param {Object} metadata - Manifest object
 * @param {number} formatIndex - Index of format to get (default: 0)
 * @returns {string|undefined} Course duration
 */
export function getCourseDuration(metadata, formatIndex = 0) {
    const formats = getCourseFormats(metadata);
    if (!formats[formatIndex]) {
        throw new Error(`Format index ${formatIndex} not found`);
    }
    return formats[formatIndex].duration;
}

export function getCourseAudience(metadata) {
    // Support new object structure, old array, and legacy YAML
    const roles = metadata?.metadata?.roles || metadata?.metadata?.audience || metadata?.audience;
    if (roles === undefined) {
        throw new Error("No 'roles' or 'audience' found in the metadata");
    }

    // If roles is an object with customer/internal, return only customer
    // Also support legacy audience.role for backward compatibility
    if (typeof roles === 'object' && !Array.isArray(roles)) {
        return Array.isArray(roles.customer) ? roles.customer : 
               Array.isArray(roles.role) ? roles.role : undefined;
    }

    return roles;
}

export function slugify(text) {
    logger.debug(`Slugifying text: "${text}"`);
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

/**
 * Generate prerequisites markdown from metadata
 * @param {Object} metadata - Manifest object with prerequisites
 * @returns {string|null} Generated prerequisites markdown or null if no prerequisites
 */
export function generatePrerequisitesMarkdown(metadata) {
    const prerequisites = metadata?.metadata?.prerequisites;

    if (!prerequisites || !prerequisites.courses || prerequisites.courses.length === 0) {
        return null;
    }

    const lines = ['## Prerequisites', ''];

    // Add required prerequisite courses
    lines.push(
        'To be successful, students must have completed these Splunk Education course(s) or possess equivalent working knowledge:',
    );
    lines.push('');
    prerequisites.courses.forEach((course) => {
        lines.push(`- ${course}`);
    });

    // Add competencies if present
    if (prerequisites.competencies && prerequisites.competencies.length > 0) {
        lines.push('');
        lines.push('Students are expected to have knowledge of the following topics prior to participating in the course:');
        lines.push('');
        prerequisites.competencies.forEach((skill) => {
            lines.push(`- ${skill}`);
        });
    }

    return lines.join('\n');
}

export async function getManifestPath(sourceDir) {
    const manifestPath = path.join(sourceDir, 'manifest.json');
    const yamlExtensions = ['yaml', 'yml'];

    // Check if manifest.json exists
    try {
        await fs.access(manifestPath);
        return manifestPath;
    } catch {
        // manifest.json doesn't exist, check for metadata.yaml
    }

    // Try to find metadata.yaml or metadata.yml
    for (const ext of yamlExtensions) {
        const yamlPath = path.join(sourceDir, `metadata.${ext}`);
        try {
            await fs.access(yamlPath);
        } catch {
            // File doesn't exist, try next extension
            continue;
        }

        // Found YAML file, migrate it (let errors propagate)
        logger.info(`📦 Found ${path.basename(yamlPath)}, migrating to manifest.json...`);
        await migrateMetadata(yamlPath, sourceDir, logger);
        return manifestPath;
    }

    // No manifest or metadata file found
    logger.error('No manifest.json or metadata.yaml/yml found');
    process.exit(1);
}

export async function loadManifest(manifestPath) {
    const manifestRaw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    // Pad course_id if present in legacy format
    if (manifest.metadata?.course_id) {
        manifest.metadata.course_id = manifest.metadata.course_id.toString().padStart(4, '0');
    }
    // Also check for 'id' in old short format
    if (manifest.metadata?.id) {
        manifest.metadata.id = manifest.metadata.id.toString().padStart(4, '0');
    }
    // Also check for 'courseId' in new descriptive format
    if (manifest.metadata?.courseId) {
        manifest.metadata.courseId = manifest.metadata.courseId.toString().padStart(4, '0');
    }

    logger.info(`🚚 Loading manifest ${manifestPath}`);

    return manifest;
}

// Legacy compatibility aliases
export const getMetadataPath = getManifestPath;
export const loadMetadata = loadManifest;

export async function updateMetadataDate(metadataPath, metadata, updatedDate) {
    if (metadata.course_id) {
        metadata.course_id = metadata.course_id.toString().padStart(4, '0');
    }

    metadata.updated = updatedDate;

    const newYaml = yaml.dump(metadata);
    await fs.writeFile(metadataPath, newYaml, 'utf8');

    logger.info(`🏷️  Updating metadata.updated: ${updatedDate}`);
}

export function getFormattedDate(input) {
    const date = input ? new Date(input) : new Date();

    if (isNaN(date.getTime())) {
        logger.error(`Invalid date format. Use YYYY-MM-DD.`, `You entered: ${input}`);
        process.exit(1);
    }

    return date.toISOString().split('T')[0];
}

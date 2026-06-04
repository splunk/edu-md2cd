import fs from 'fs/promises';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
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
    // Get project ID (optional field)
    const projectId = metadata?.metadata?.projectId || metadata?.project_id;
    return projectId; // Returns undefined if not present
}

export function getCourseId(metadata) {
    // Support manifest.json (courseId or id) and legacy YAML (course_id)
    const courseId = metadata?.metadata?.courseId || metadata?.metadata?.id || metadata?.course_id;
    if (courseId === undefined) {
        throw new Error("No 'courseId', 'id', or 'course_id' found in the metadata");
    }
    return courseId;
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
    const flattenCourseEntries = (courseItem) => {
        if (typeof courseItem === 'string') {
            return [courseItem];
        }

        if (Array.isArray(courseItem)) {
            return courseItem.flatMap((nestedCourseItem) => flattenCourseEntries(nestedCourseItem));
        }

        return [];
    };
    const prerequisiteItems = prerequisites.courses;
    const requiredCourses = prerequisiteItems.filter((courseItem) => typeof courseItem === 'string');
    const courseOptionGroups = prerequisiteItems.filter(Array.isArray);

    lines.push(
        'To be successful, students must have completed the following',
        'Splunk Education course(s) or have equivalent working',
        'knowledge:',
    );

    if (requiredCourses.length > 0) {
        lines.push('');
        requiredCourses.forEach((course) => {
            lines.push(`- ${course}`);
        });
    }

    if (courseOptionGroups.length > 0) {
        courseOptionGroups.forEach((courseOptions, groupIndex) => {
            lines.push('');
            if (requiredCourses.length > 0) {
                lines.push(
                    courseOptionGroups.length === 1
                        ? 'Additionally, complete one of the following:'
                        : `Additionally, complete one of the following (Group ${groupIndex + 1}):`,
                );
            } else {
                lines.push(
                    courseOptionGroups.length === 1
                        ? 'Complete one of the following:'
                        : `Complete one of the following (Group ${groupIndex + 1}):`,
                );
            }
            lines.push('');
            const flattenedCourseOptions = flattenCourseEntries(courseOptions);
            flattenedCourseOptions.forEach((course) => {
                lines.push(`- ${course}`);
            });
        });
    }

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

/**
 * Candidate filenames to search, in priority order.
 */
const METADATA_CANDIDATES = ['metadata.json', 'metadata.yaml', 'metadata.yml'];
const MANIFEST_CANDIDATES = ['manifest.json', 'manifest.yaml', 'manifest.yml'];

/**
 * Parse file content as JSON or YAML depending on file extension.
 *
 * @param {string} filePath - Path used only to determine format
 * @param {string} content - Raw file content
 * @returns {Object} Parsed object
 */
function parseFileContent(filePath, content) {
    if (filePath.endsWith('.json')) {
        return JSON.parse(content);
    }
    return parseYaml(content);
}

/**
 * Find and load the metadata file (metadata.json/.yaml/.yml) for a course
 * directory. If a YAML file is found but uses the legacy schema (no top-level
 * `metadata:` key), it is migrated to metadata.yaml before loading.
 *
 * metadata.json is checked first; YAML variants are fallbacks.
 *
 * @param {string} sourceDir - Course directory to search
 * @returns {Promise<{filePath: string, data: Object}>} Resolved path and parsed object
 */
async function findAndLoadMetadata(sourceDir) {
    for (const candidate of METADATA_CANDIDATES) {
        const filePath = path.join(sourceDir, candidate);
        try {
            await fs.access(filePath);
        } catch {
            continue;
        }

        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = parseFileContent(filePath, raw);

        // Detect legacy YAML: new-schema files always have a top-level `metadata` key
        if (!parsed.metadata) {
            logger.info(`📦 Found legacy ${candidate}, migrating to metadata.yaml...`);
            await migrateMetadata(filePath, sourceDir, logger);
            // Reload the freshly written metadata.yaml
            const migratedPath = path.join(sourceDir, 'metadata.yaml');
            const migratedRaw = await fs.readFile(migratedPath, 'utf8');
            return { filePath: migratedPath, data: parseFileContent(migratedPath, migratedRaw) };
        }

        return { filePath, data: parsed };
    }

    logger.error('No metadata.json or metadata.yaml/yml found');
    process.exit(1);
}

/**
 * Find and load the optional manifest file (manifest.json/.yaml/.yml).
 *
 * @param {string} sourceDir - Course directory to search
 * @returns {Promise<Object>} Parsed manifest object, or {} if absent
 */
async function findAndLoadManifest(sourceDir) {
    for (const candidate of MANIFEST_CANDIDATES) {
        const filePath = path.join(sourceDir, candidate);
        try {
            await fs.access(filePath);
        } catch {
            continue;
        }

        const raw = await fs.readFile(filePath, 'utf8');
        logger.info(`🚚 Loading manifest ${filePath}`);
        return parseFileContent(filePath, raw);
    }

    return {};
}

/**
 * Return the path to the metadata file for a source directory (for legacy
 * callers). Triggers migration if a legacy YAML is found.
 *
 * @param {string} sourceDir - Course directory to search
 * @returns {Promise<string>} Absolute path to the metadata file
 */
export async function getMetadataFilePath(sourceDir) {
    const { filePath } = await findAndLoadMetadata(sourceDir);
    return filePath;
}

/**
 * Load metadata (required) and manifest (optional) for a course directory,
 * merging them into a single combined object. Supports JSON and YAML for
 * both files. Legacy metadata.yaml (no `metadata:` key) is migrated
 * automatically to metadata.yaml using the new schema.
 *
 * @param {string} sourceDir - Course directory to load from
 * @returns {Promise<Object>} Merged manifest object
 */
export async function loadMetadataAndManifest(sourceDir) {
    const { filePath: metadataFilePath, data: metadataFile } = await findAndLoadMetadata(sourceDir);

    // Pad course IDs if needed
    if (metadataFile.metadata?.course_id) {
        metadataFile.metadata.course_id = metadataFile.metadata.course_id.toString().padStart(4, '0');
    }
    if (metadataFile.metadata?.id) {
        metadataFile.metadata.id = metadataFile.metadata.id.toString().padStart(4, '0');
    }
    if (metadataFile.metadata?.courseId) {
        metadataFile.metadata.courseId = metadataFile.metadata.courseId.toString().padStart(4, '0');
    }

    logger.info(`🚚 Loading metadata ${metadataFilePath}`);

    // Optionally load manifest (JSON or YAML)
    const manifestFile = await findAndLoadManifest(sourceDir);

    // Merge: metadata file provides `metadata`; manifest provides everything else
    return {
        ...manifestFile,
        metadata: metadataFile.metadata,
    };
}

// Legacy compatibility aliases
export const getManifestPath = getMetadataFilePath;
export const loadManifest = loadMetadataAndManifest;
export const getMetadataPath = getMetadataFilePath;
export const loadMetadata = loadMetadataAndManifest;

export async function updateMetadataDate(metadataPath, metadata, updatedDate) {
    if (metadata.course_id) {
        metadata.course_id = metadata.course_id.toString().padStart(4, '0');
    }

    metadata.updated = updatedDate;

    const newYaml = stringifyYaml(metadata);
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

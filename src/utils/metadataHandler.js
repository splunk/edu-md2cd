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

export function getCourseFormat(metadata) {
    // Support both manifest.json (modality) and legacy YAML (format)
    const courseFormat = metadata?.metadata?.modality || metadata?.format;
    if (courseFormat === undefined) {
        throw new Error("No 'modality' or 'format' found in the metadata");
    }
    return courseFormat;
}

export function getCourseDuration(metadata) {
    // Support both manifest.json and legacy YAML
    const courseDuration = metadata?.metadata?.duration || metadata?.duration;
    if (courseDuration === undefined) {
        throw new Error("No 'duration' found in the metadata");
    }
    return courseDuration;
}

export function getCourseAudience(metadata) {
    // Support new object structure, old array, and legacy YAML
    const audience = metadata?.metadata?.audience || metadata?.audience;
    if (audience === undefined) {
        throw new Error("No 'audience' found in the metadata");
    }

    // If audience is an object with role/internal/external, flatten all arrays
    if (typeof audience === 'object' && !Array.isArray(audience)) {
        const allAudiences = [];
        if (Array.isArray(audience.role)) allAudiences.push(...audience.role);
        if (Array.isArray(audience.internal)) allAudiences.push(...audience.internal);
        if (Array.isArray(audience.external)) allAudiences.push(...audience.external);
        return allAudiences.length > 0 ? allAudiences : undefined;
    }

    return audience;
}

export function slugify(text) {
    logger.debug(`Slugifying text: "${text}"`);
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

export async function getManifestPath(sourceDir) {
    const manifestPath = path.join(sourceDir, 'manifest.json');
    const yamlExtensions = ['yaml', 'yml'];

    // Check if manifest.json exists
    try {
        await fs.access(manifestPath);
        return manifestPath;
    } catch (err) {
        // manifest.json doesn't exist, check for metadata.yaml
    }

    // Try to find metadata.yaml or metadata.yml
    for (const ext of yamlExtensions) {
        const yamlPath = path.join(sourceDir, `metadata.${ext}`);
        try {
            await fs.access(yamlPath);
            // Found YAML file, migrate it
            logger.info(`📦 Found ${path.basename(yamlPath)}, migrating to manifest.json...`);
            await migrateMetadata(yamlPath, sourceDir, logger);
            return manifestPath;
        } catch (err) {
            continue;
        }
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

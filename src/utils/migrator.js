// src/utils/migrator.js
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { generateSlug } from './slugger.js';

/**
 * Remove duplicates from array
 *
 * @param {Array} array - Input array
 * @returns {Array|undefined} Deduplicated array or undefined if input wasn't an array
 */
function deduplicateArray(array) {
    if (!Array.isArray(array)) return undefined;
    return [...new Set(array)];
}

/**
 * Normalize modality field from legacy format values
 *
 * @param {string} legacyFormat - Legacy format string
 * @returns {string} Normalized modality
 */
function normalizeModality(legacyFormat) {
    const normalized = legacyFormat.toLowerCase();

    if (normalized.includes('instructor-led') || normalized.includes('ilt')) {
        return 'ILT';
    }
    if (normalized.includes('virtual') || normalized.includes('vilt')) {
        return 'VILT';
    }
    if (normalized.includes('self-paced')) {
        return 'Self-paced';
    }

    // Return as-is if can't normalize
    return legacyFormat;
}

/**
 * Map legacy output format values to new format
 *
 * @param {Array<string>} legacyFormats - Legacy output array
 * @returns {Array<string>} New format array
 */
function mapLegacyOutputFormats(legacyFormats) {
    const mapping = {
        lab: 'pdf',
        'app-xml': 'app',
        cd: 'cd',
        readme: 'readme',
    };

    return legacyFormats.map((format) => mapping[format] || format).filter(Boolean);
}

/**
 * Flatten legacy audience structure to array
 *
 * @param {Object|Array} audience - Legacy audience structure
 * @returns {Array<string>} Flattened audience array
 */
function flattenAudience(audience) {
    if (Array.isArray(audience)) {
        return deduplicateArray(audience);
    }

    if (typeof audience === 'object' && audience !== null) {
        const flattened = [];

        if (Array.isArray(audience.role)) {
            flattened.push(...audience.role);
        }
        if (Array.isArray(audience.internal)) {
            flattened.push(...audience.internal);
        }
        if (Array.isArray(audience.external)) {
            flattened.push(...audience.external);
        }

        return deduplicateArray(flattened);
    }

    return [];
}

/**
 * Map metadata.yaml structure to manifest.json structure
 *
 * @param {Object} metadata - Parsed metadata.yaml object
 * @returns {Object} Manifest.json structure
 */
function mapYamlToManifest(metadata) {
    const manifest = {
        metadata: {
            courseId: metadata.course_id || metadata.courseId || 'unknown',
            courseTitle: metadata.course_title || metadata.courseTitle || 'Untitled Course',
        },
        input: {
            labGuides: './lab-guides',
        },
    };

    // Generate slug if not present
    if (metadata.slug) {
        manifest.metadata.slug = metadata.slug;
    } else {
        manifest.metadata.slug = generateSlug(manifest.metadata.courseTitle);
    }

    // Add description if present
    if (metadata.description) {
        manifest.metadata.description = metadata.description;
    }

    // Map author/courseDeveloper - keep as array or string
    if (metadata.course_developer || metadata.courseDeveloper || metadata.author) {
        const authorField =
            metadata.author || metadata.course_developer || metadata.courseDeveloper;
        manifest.metadata.courseDeveloper = authorField;
    }

    // Add optional metadata fields if present
    if (metadata.format || metadata.modality) {
        const modalityValue = metadata.modality || metadata.format;
        manifest.metadata.modality = normalizeModality(modalityValue);
    }

    if (metadata.duration) {
        manifest.metadata.duration = metadata.duration;
    }

    // Map audience to new object structure
    if (metadata.audience) {
        const flattened = flattenAudience(metadata.audience);
        if (flattened && flattened.length > 0) {
            manifest.metadata.audience = {
                role: flattened,
                internal: [],
                external: [],
            };
        }
    }

    if (metadata.ga) {
        manifest.metadata.ga = metadata.ga;
    }

    if (metadata.updated) {
        manifest.metadata.updated = metadata.updated;
    }

    // Map version to splunk.platform structure
    if (metadata.version) {
        manifest.metadata.splunk = {
            platform: {
                deployment: '',
                version: metadata.version,
            },
        };
    }

    // Map output formats if present
    if (metadata.output && Array.isArray(metadata.output)) {
        manifest.output = {
            formats: mapLegacyOutputFormats(metadata.output),
        };
    }

    return manifest;
}

/**
 * Migrate metadata.yaml to manifest.json format
 *
 * @param {string} metadataPath - Path to metadata.yaml or metadata.yml
 * @param {string} coursePath - Course directory path
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Migrated manifest object
 */
export async function migrateMetadata(metadataPath, coursePath, logger) {
    logger.info('🔄 Migrating legacy configuration...');

    // Read and parse YAML
    const yamlContent = await readFile(metadataPath, 'utf8');
    let metadata;

    try {
        metadata = parseYaml(yamlContent);
    } catch (error) {
        throw new Error(
            `Invalid YAML in ${metadataPath}: ${error.message}\n` +
                `💡 Check YAML syntax (indentation, colons, hyphens)`,
        );
    }

    // Map metadata.yaml fields to manifest.json structure
    const manifest = mapYamlToManifest(metadata);

    // Write manifest.json
    const manifestPath = resolve(coursePath, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    // Inform user about migration
    logger.info('✓ Created manifest.json');
    logger.warn('');
    logger.warn('⚠️  metadata.yaml is deprecated');
    logger.warn('   Your course has been migrated to manifest.json');
    logger.warn('   Please review and commit manifest.json to your repository');
    logger.warn('   The old metadata.yaml file can be safely deleted');
    logger.warn('');

    return manifest;
}

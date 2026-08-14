// src/utils/migrator.js
import { readFile, rename, rm, writeFile } from 'fs/promises';
import { basename, dirname, resolve } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { generateSlug } from './slugger.js';

/**
 * Normalizes duration strings to the schema-compatible hour/hours format.
 *
 * @param {string} duration - Legacy duration string
 * @returns {string|undefined} Normalized duration or original value when it cannot be parsed
 */
export function normalizeDuration(duration) {
    if (!duration || typeof duration !== 'string') {
        return duration;
    }

    const durationMatch = duration.match(/^\s*([\d.]+)\s*/);
    if (!durationMatch || !durationMatch[1]) {
        return duration;
    }

    const numericDuration = Number(durationMatch[1]);
    if (Number.isNaN(numericDuration)) {
        return duration;
    }

    const unit = numericDuration <= 1 ? 'hour' : 'hours';
    return `${durationMatch[1]} ${unit}`;
}

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
 * Detects whether a parsed metadata file uses the legacy snake_case schema.
 * New-schema files may be wrapped (`metadata:`) or flat (camelCase fields at
 * the root); either form must take precedence over a stray snake_case field.
 *
 * @param {Object} rawMetadata - Parsed metadata file content
 * @returns {boolean} True when the legacy schema is detected
 */
export function isLegacySchema(rawMetadata) {
    return (
        rawMetadata !== null &&
        typeof rawMetadata === 'object' &&
        !rawMetadata.metadata &&
        rawMetadata.courseId === undefined &&
        rawMetadata.courseTitle === undefined &&
        (rawMetadata.course_id !== undefined || rawMetadata.course_title !== undefined)
    );
}

/**
 * Detects a redundant top-level metadata wrapper in YAML metadata files.
 *
 * @param {Object} rawMetadata - Parsed metadata file content
 * @returns {boolean} True when a redundant metadata wrapper is present
 */
export function hasRedundantMetadataWrapper(rawMetadata) {
    return (
        rawMetadata !== null &&
        typeof rawMetadata === 'object' &&
        rawMetadata.metadata !== null &&
        typeof rawMetadata.metadata === 'object' &&
        !Array.isArray(rawMetadata.metadata)
    );
}

/**
 * Promotes a redundant top-level metadata wrapper to the root object.
 *
 * @param {Object} rawMetadata - Parsed metadata file content
 * @returns {Object} Unwrapped metadata object
 */
export function unwrapRedundantMetadata(rawMetadata) {
    const { metadata, ...remainingConfig } = rawMetadata;
    return { ...metadata, ...remainingConfig };
}

/**
 * Normalize modality field from legacy format values
 *
 * @param {string} legacyFormat - Legacy format string
 * @returns {string} Normalized modality
 */
function normalizeModality(legacyFormat) {
    const normalized = legacyFormat.toLowerCase();

    // Map legacy values to new valid modalities
    if (
        normalized.includes('instructor-led') ||
        normalized.includes('ilt') ||
        normalized.includes('instructor') ||
        normalized.includes('classroom')
    ) {
        return 'Instructor-led training';
    }
    if (
        normalized.includes('elearning with lab') ||
        normalized.includes('e-learning with lab') ||
        normalized.includes('self-paced with lab')
    ) {
        return 'eLearning with lab exercises';
    }
    if (
        normalized.includes('elearning') ||
        normalized.includes('e-learning') ||
        normalized.includes('self-paced') ||
        normalized.includes('vilt')
    ) {
        return 'eLearning';
    }
    if (normalized.includes('lab') && (normalized.includes('only') || normalized.includes('exercise'))) {
        return 'Lab experience';
    }

    // Return as-is if can't normalize (will be caught by validation)
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
function mapAudienceToRoles(audience) {
    if (Array.isArray(audience)) {
        return {
            customer: deduplicateArray(audience),
        };
    }

    if (typeof audience === 'object' && audience !== null) {
        const customerRoles = deduplicateArray([
            ...(Array.isArray(audience.role) ? audience.role : []),
            ...(Array.isArray(audience.external) ? audience.external : []),
        ]);
        const internalRoles = deduplicateArray(
            Array.isArray(audience.internal) ? audience.internal : []
        );
        const roles = {};

        if (customerRoles && customerRoles.length > 0) {
            roles.customer = customerRoles;
        }
        if (internalRoles && internalRoles.length > 0) {
            roles.internal = internalRoles;
        }

        return roles;
    }

    return {};
}

/**
 * Map metadata.yaml structure to manifest.json structure
 *
 * @param {Object} metadata - Parsed metadata.yaml object
 * @returns {Object} Manifest.json structure
 */
export function buildManifestFromLegacy(metadata) {
    const manifest = {
        metadata: {
            courseId:
                metadata.course_id !== undefined
                    ? String(metadata.course_id).padStart(4, '0')
                    : metadata.courseId || 'unknown',
            courseTitle: metadata.course_title || metadata.courseTitle || 'Untitled Course',
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
    // Map format/modality string + duration → new format array of objects
    if (metadata.format || metadata.modality) {
        const modeString = metadata.modality || metadata.format;
        manifest.metadata.format = [
            {
                mode: normalizeModality(typeof modeString === 'string' ? modeString : String(modeString)),
                ...(metadata.duration !== undefined && {
                    duration: normalizeDuration(String(metadata.duration)),
                }),
            },
        ];
    } else if (metadata.duration) {
        manifest.metadata.format = [{ duration: normalizeDuration(String(metadata.duration)) }];
    }

    // Map audience to new roles structure (customer/internal)
    if (metadata.audience) {
        const roles = mapAudienceToRoles(metadata.audience);
        if (Object.keys(roles).length > 0) {
            manifest.metadata.roles = roles;
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
 * Generate YAML output for migrated metadata or manifest files.
 *
 * @param {Object} manifest - Object to serialize
 * @returns {string} YAML string
 */
export function serializeManifestAsYaml(manifest) {
    return stringifyYaml(manifest);
}

/**
 * Generate JSON output for migrated metadata or manifest files.
 *
 * @param {Object} manifest - Object to serialize
 * @returns {string} JSON string
 */
export function serializeManifestAsJson(manifest) {
    return JSON.stringify(manifest, null, 2) + '\n';
}

/**
 * Preserve the original legacy metadata file and write the migrated metadata file.
 *
 * @param {string} metadataPath - Original metadata file path
 * @param {Object} metadataObject - Migrated metadata object to write
 * @param {'json'|'yaml'} [format='yaml'] - Output format for the migrated file
 * @returns {Promise<string>} Path to the new canonical metadata file
 */
export async function writeMigratedMetadataFile(metadataPath, metadataObject, format = 'yaml') {
    const metadataExt = format === 'json' ? '.json' : '.yaml';
    const metadataOutPath = resolve(dirname(metadataPath), `metadata${metadataExt}`);
    const legacyPath = `${metadataPath}.legacy`;

    await rm(legacyPath, { force: true });
    await rename(metadataPath, legacyPath);

    const serializedMetadata =
        format === 'json'
            ? serializeManifestAsJson({ metadata: metadataObject })
            : serializeManifestAsYaml(metadataObject);
    await writeFile(metadataOutPath, serializedMetadata);

    return metadataOutPath;
}

/**
 * Migrate metadata.yaml to manifest format
 *
 * @param {string} metadataPath - Path to metadata.yaml or metadata.yml
 * @param {string} coursePath - Course directory path
 * @param {Object} logger - Logger instance
 * @param {'json'|'yaml'} [format='yaml'] - Output format for migrated files
 * @returns {Promise<Object>} Migrated manifest object
 */
export async function migrateMetadata(metadataPath, coursePath, logger, format = 'yaml') {
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
            { cause: error },
        );
    }

    if (hasRedundantMetadataWrapper(metadata)) {
        metadata = unwrapRedundantMetadata(metadata);
    }

    // Map metadata.yaml fields to manifest.json structure
    const manifest = buildManifestFromLegacy(metadata);

    // Separate metadata from any non-metadata fields (input/output from legacy YAML)
    const { metadata: metadataObj, ...manifestRest } = manifest;

    const isJson = format === 'json';
    const metadataOutPath = await writeMigratedMetadataFile(metadataPath, metadataObj, format);

    // Write manifest file only when there are non-metadata fields to preserve
    if (Object.keys(manifestRest).length > 0) {
        const manifestExt = isJson ? '.json' : '.yaml';
        const manifestOutPath = resolve(coursePath, `manifest${manifestExt}`);
        if (isJson) {
            await writeFile(manifestOutPath, serializeManifestAsJson(manifestRest));
        } else {
            await writeFile(manifestOutPath, serializeManifestAsYaml(manifestRest));
        }
    }

    // Inform user about migration
    logger.info(`✓ Created ${basename(metadataOutPath)}`);
    logger.warn('');
    logger.warn('metadata.yaml (legacy schema) is deprecated');
    logger.warn(`   Original preserved as: ${basename(metadataPath)}.legacy`);
    logger.warn(`   Your course has been migrated to ${basename(metadataOutPath)} (new schema)`);
    logger.warn(`   Please review and commit ${basename(metadataOutPath)} to your repository`);
    logger.warn('');

    return manifest;
}

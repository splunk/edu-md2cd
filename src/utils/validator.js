import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VALID_PREREQUISITE_COURSES } from './validPrerequisites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Valid modality values for course delivery method
 * @constant {Array<string>}
 */
const VALID_MODALITIES = [
    'eLearning',
    'eLearning with lab exercises',
    'Instructor-led',
    'Instructor-led training',
    'Instructor-led with lab exercises',
    'Lab exercises only'
];

/**
 * Validate manifest against JSON schema
 * @param {Object} manifest - Manifest object to validate
 * @returns {Object} Validation result with { valid: boolean, errors: array }
 */
export function validateManifest(manifest) {
    const ajv = new Ajv({ allErrors: true });

    const schemaPath = path.join(__dirname, '../../schemas/manifest.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    const validate = ajv.compile(schema);
    const valid = validate(manifest);

    return {
        valid,
        errors: validate.errors || [],
    };
}

/**
 * Format validation errors into human-readable messages
 * @param {Array} errors - AJV validation errors
 * @returns {Array} Formatted error messages
 */
export function formatValidationErrors(errors) {
    return errors.map((error) => {
        const path = error.instancePath || 'manifest';

        switch (error.keyword) {
            case 'required':
                return `${path}: Missing required property '${error.params.missingProperty}'`;
            case 'type':
                return `${path}: Must be ${error.params.type}`;
            case 'enum':
                return `${path}: Must be one of: ${error.params.allowedValues.join(', ')}`;
            case 'pattern':
                return `${path}: Does not match required pattern`;
            case 'minLength':
                return `${path}: Must be at least ${error.params.limit} characters`;
            case 'additionalProperties':
                return `${path}: Unknown property '${error.params.additionalProperty}'`;
            default:
                return `${path}: ${error.message}`;
        }
    });
}

/**
 * Validate format/modality field values
 * Checks both new format array and legacy modality field
 * @param {Object} manifest - Manifest or metadata object to validate
 * @returns {Object} Validation result with { valid: boolean, errors: array }
 */
export function validateModality(manifest) {
    const errors = [];

    // Check for new format array structure
    const formats = manifest?.metadata?.format;
    if (Array.isArray(formats) && formats.length > 0) {
        formats.forEach((format, index) => {
            if (!format.mode) {
                errors.push(`Format[${index}]: Missing required 'mode' field`);
            } else if (!VALID_MODALITIES.includes(format.mode)) {
                const validOptions = VALID_MODALITIES.map((m) => `"${m}"`).join(', ');
                errors.push(
                    `Format[${index}]: Mode must be one of the following: ${validOptions}. Received: "${format.mode}"`
                );
            }
        });

        return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
    }

    // Backward compatibility: check for old modality field or legacy YAML format
    const modalityValue = manifest?.metadata?.modality || manifest?.format;

    // If no modality/format is specified, it's valid (field is optional)
    if (!modalityValue) {
        return { valid: true, errors: [] };
    }

    // Check if the value is one of the valid options
    if (!VALID_MODALITIES.includes(modalityValue)) {
        const validOptions = VALID_MODALITIES.map((m) => `"${m}"`).join(', ');
        return {
            valid: false,
            errors: [
                `Modality must be one of the following: ${validOptions}. Received: "${modalityValue}"`,
            ],
        };
    }

    return { valid: true, errors: [] };
}

/**
 * Validate prerequisites required courses
 * @param {Object} manifest - Manifest object to validate
 * @returns {Object} Validation result with { valid: boolean, errors: array }
 */
export function validatePrerequisites(manifest) {
    const prerequisites = manifest?.metadata?.prerequisites;

    // If no prerequisites specified, it's valid (will be caught by schema if courses is missing)
    if (!prerequisites || !prerequisites.courses) {
        return { valid: true, errors: [] };
    }

    const invalidCourses = [];

    // Validate each required course against the valid list
    prerequisites.courses.forEach((course) => {
        if (!VALID_PREREQUISITE_COURSES.includes(course)) {
            invalidCourses.push(course);
        }
    });

    if (invalidCourses.length > 0) {
        return {
            valid: false,
            errors: invalidCourses.map(
                (course) =>
                    `Invalid prerequisite course: "${course}". Please ensure all required prerequisites are valid course names.`,
            ),
        };
    }

    return { valid: true, errors: [] };
}

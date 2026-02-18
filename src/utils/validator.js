import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

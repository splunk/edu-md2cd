import { describe, expect, it } from 'vitest';
import { validatePrerequisites } from '../../src/utils/validator.js';

describe('validatePrerequisites', () => {
    it('accepts string and array prerequisite entries when all courses are valid', () => {
        const manifest = {
            metadata: {
                prerequisites: {
                    courses: [
                        'Developing SOAR Playbooks',
                        [
                            'Investigating Incidents with Splunk SOAR',
                            'Introduction to Splunk SOAR',
                        ],
                    ],
                    competencies: ['Linux chops'],
                },
            },
        };

        const result = validatePrerequisites(manifest);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('rejects invalid courses found inside OR groups', () => {
        const manifest = {
            metadata: {
                prerequisites: {
                    courses: [
                        [
                            'Investigating Incidents with Splunk SOAR',
                            'Not A Real Course',
                        ],
                    ],
                    competencies: ['Linux chops'],
                },
            },
        };

        const result = validatePrerequisites(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Not A Real Course');
    });

    it('accepts nested array options when all nested courses are valid', () => {
        const manifest = {
            metadata: {
                prerequisites: {
                    courses: [
                        'Splunk Enterprise System Administration',
                        [
                            'Troubleshooting Splunk Enterprise',
                            'Architecting Splunk Enterprise Deployments',
                            [
                                'Splunk Enterprise System Administration',
                                'Splunk Enterprise Data Administration',
                            ],
                        ],
                    ],
                    competencies: ['Linux chops'],
                },
            },
        };

        const result = validatePrerequisites(manifest);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
});

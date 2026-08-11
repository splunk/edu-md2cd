import { describe, expect, it } from 'vitest';
import { validateManifest, validatePrerequisites } from '../../src/utils/validator.js';

describe('validateManifest', () => {
    it('accepts md2lab-shared fields while retaining md2cd-specific metadata and output fields', () => {
        const manifest = {
            metadata: {
                projectId: '26-0065',
                lmsId: ['EDU-1001', 'EDU-1002'],
                courseId: '26-0065',
                courseTitle: 'Lab Guide - Administering ES',
                version: '8.6',
                slug: 'lab_guide_administering_es',
                description: 'Course description',
                courseDeveloper: ['Splunk EDU'],
                format: [
                    {
                        mode: 'Instructor-led training',
                        duration: '13.5 hours',
                    },
                ],
                roles: {
                    customer: ['SOC Analyst'],
                    internal: ['Sales Engineer'],
                },
                audience: ['Legacy audience'],
                prerequisites: {
                    courses: ['Splunk Enterprise System Administration'],
                    competencies: ['Linux chops'],
                },
                ga: '2026-08-01',
                updated: '2026-08-06',
                splunk: {
                    platform: {
                        deployment: '',
                        version: 'ES 8.6',
                    },
                },
            },
            input: {
                courseDescription: 'course-description.md',
                labGuides: ['lab-guides/core', 'lab-guides/advanced'],
                static: 'static',
                readme: 'README.md',
            },
            output: {
                destination: 'dist',
                render: {
                    theme: 'cisco',
                    code: {
                        theme: 'atom-one-dark',
                        lineNumbers: true,
                        spl: true,
                    },
                },
                pdfs: {
                    courseDescription: {
                        filename: 'course.pdf',
                        format: 'combined',
                    },
                },
            },
            plugins: [
                'locale-jp',
                {
                    name: 'locale-jp',
                    translations: {
                        audience: 'Audience',
                    },
                },
            ],
        };

        const result = validateManifest(manifest);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
});

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

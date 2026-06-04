import { describe, expect, it } from 'vitest';
import { generatePrerequisitesMarkdown } from '../../src/utils/metadataHandler.js';

describe('generatePrerequisitesMarkdown', () => {
    const baseMetadata = {
        metadata: {
            prerequisites: {
                courses: [],
                competencies: [],
            },
        },
    };

    it('renders required courses with updated intro copy', () => {
        const metadata = {
            ...baseMetadata,
            metadata: {
                ...baseMetadata.metadata,
                prerequisites: {
                    ...baseMetadata.metadata.prerequisites,
                    courses: ['Investigating Incidents with Splunk SOAR'],
                },
            },
        };

        const markdown = generatePrerequisitesMarkdown(metadata);

        expect(markdown).toContain('To be successful, students must have completed the following');
        expect(markdown).toContain('Splunk Education course(s) or have equivalent working');
        expect(markdown).toContain('knowledge:');
        expect(markdown).toContain('- Investigating Incidents with Splunk SOAR');
        expect(markdown).not.toContain('Complete one of the following:');
    });

    it('renders OR-only prerequisites with one-of heading', () => {
        const metadata = {
            ...baseMetadata,
            metadata: {
                ...baseMetadata.metadata,
                prerequisites: {
                    ...baseMetadata.metadata.prerequisites,
                    courses: [
                        [
                            'Investigating Incidents with Splunk SOAR',
                            'Introduction to Splunk SOAR',
                        ],
                    ],
                },
            },
        };

        const markdown = generatePrerequisitesMarkdown(metadata);

        expect(markdown).toContain('Complete one of the following:');
        expect(markdown).toContain('- Investigating Incidents with Splunk SOAR');
        expect(markdown).toContain('- Introduction to Splunk SOAR');
        expect(markdown).not.toContain('Additionally, complete one of the following:');
    });

    it('renders mixed prerequisites with additional one-of heading', () => {
        const metadata = {
            ...baseMetadata,
            metadata: {
                ...baseMetadata.metadata,
                prerequisites: {
                    ...baseMetadata.metadata.prerequisites,
                    courses: [
                        'Developing SOAR Playbooks',
                        [
                            'Investigating Incidents with Splunk SOAR',
                            'Introduction to Splunk SOAR',
                        ],
                    ],
                },
            },
        };

        const markdown = generatePrerequisitesMarkdown(metadata);

        expect(markdown).toContain('- Developing SOAR Playbooks');
        expect(markdown).toContain('Additionally, complete one of the following:');
        expect(markdown).toContain('- Investigating Incidents with Splunk SOAR');
        expect(markdown).toContain('- Introduction to Splunk SOAR');
    });

    it('renders nested array entries inside OR groups as list items', () => {
        const metadata = {
            ...baseMetadata,
            metadata: {
                ...baseMetadata.metadata,
                prerequisites: {
                    ...baseMetadata.metadata.prerequisites,
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
                },
            },
        };

        const markdown = generatePrerequisitesMarkdown(metadata);

        expect(markdown).toContain('Additionally, complete one of the following:');
        expect(markdown).toContain('- Troubleshooting Splunk Enterprise');
        expect(markdown).toContain('- Architecting Splunk Enterprise Deployments');
        expect(markdown).toContain('- Splunk Enterprise Data Administration');
    });
});

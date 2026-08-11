import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    generatePrerequisitesMarkdown,
    loadMetadataAndManifest,
} from '../../src/utils/metadataHandler.js';

const tempDirs = [];

async function makeTempCourseDir() {
    const tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'md2cd-metadata-handler-'));
    tempDirs.push(tempDirPath);
    return tempDirPath;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((tempDirPath) => fs.rm(tempDirPath, { recursive: true, force: true }))
    );
});

describe('loadMetadataAndManifest', () => {
    it('loads flat metadata.yaml without a top-level metadata wrapper', async () => {
        const courseDirPath = await makeTempCourseDir();

        await fs.writeFile(
            path.join(courseDirPath, 'metadata.yaml'),
            [
                'courseId: 26-0065',
                'courseTitle: Lab Guide - Administering ES',
                'slug: lab_guide_administering_es',
                'format:',
                '  - mode: Instructor-led training',
                '    duration: 13.5 hours',
                'splunk:',
                '  platform:',
                "    deployment: ''",
                '    version: ES 8.6',
                '',
            ].join('\n')
        );

        const manifest = await loadMetadataAndManifest(courseDirPath);

        expect(manifest.metadata.courseId).toBe('26-0065');
        expect(manifest.metadata.courseTitle).toBe('Lab Guide - Administering ES');
        expect(manifest.metadata.format).toEqual([
            { mode: 'Instructor-led training', duration: '13.5 hours' },
        ]);
        expect(manifest.metadata.splunk.platform.version).toBe('ES 8.6');
    });

    it('merges flat metadata.yaml with manifest.yaml config overrides', async () => {
        const courseDirPath = await makeTempCourseDir();

        await fs.writeFile(
            path.join(courseDirPath, 'metadata.yaml'),
            [
                'courseId: 1234',
                'courseTitle: Splunk Cloud Administration',
                'format:',
                '  - mode: eLearning',
                '    duration: 5 hours',
                'splunk:',
                '  platform:',
                "    deployment: ''",
                '    version: 9.4',
                '',
            ].join('\n')
        );

        await fs.writeFile(
            path.join(courseDirPath, 'manifest.yaml'),
            [
                'input:',
                '  courseDescription: ./custom-filename.md',
                'output:',
                '  destination: custom-output',
                '  render:',
                '    theme: cisco',
                '  pdfs:',
                '    courseDescription: custom-filename.pdf',
                'plugins:',
                '  - locale-jp',
                '',
            ].join('\n')
        );

        const manifest = await loadMetadataAndManifest(courseDirPath);

        expect(manifest.metadata.courseId).toBe('1234');
        expect(manifest.input.courseDescription).toBe('./custom-filename.md');
        expect(manifest.output.destination).toBe('custom-output');
        expect(manifest.output.render.theme).toBe('cisco');
        expect(manifest.output.pdfs.courseDescription).toBe('custom-filename.pdf');
        expect(manifest.plugins).toEqual(['locale-jp']);
    });
});

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

        expect(markdown).toContain('- Complete one of the following:');
        expect(markdown).toContain('  - Investigating Incidents with Splunk SOAR');
        expect(markdown).toContain('  - Introduction to Splunk SOAR');
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
        expect(markdown).toContain('- Additionally, complete one of the following:');
        expect(markdown).toContain('  - Investigating Incidents with Splunk SOAR');
        expect(markdown).toContain('  - Introduction to Splunk SOAR');
    });

    it('renders multiple OR-only groups using "Additionally" for second group', () => {
        const metadata = {
            ...baseMetadata,
            metadata: {
                ...baseMetadata.metadata,
                prerequisites: {
                    ...baseMetadata.metadata.prerequisites,
                    courses: [
                        [
                            'Troubleshooting Splunk Enterprise',
                            'Splunk Enterprise Cluster Administration',
                        ],
                        [
                            'Splunk Enterprise System Administration',
                            'Splunk Enterprise Data Administration',
                        ],
                    ],
                },
            },
        };

        const markdown = generatePrerequisitesMarkdown(metadata);

        expect(markdown).toContain('- Complete one of the following:');
        expect(markdown).toContain('- Additionally, complete one of the following:');
        expect(markdown).toContain('  - Troubleshooting Splunk Enterprise');
        expect(markdown).toContain('  - Splunk Enterprise Cluster Administration');
        expect(markdown).toContain('  - Splunk Enterprise System Administration');
        expect(markdown).toContain('  - Splunk Enterprise Data Administration');
        expect(markdown).not.toContain('Group 1');
        expect(markdown).not.toContain('Group 2');
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

        expect(markdown).toContain('- Additionally, complete one of the following:');
        expect(markdown).toContain('  - Troubleshooting Splunk Enterprise');
        expect(markdown).toContain('  - Architecting Splunk Enterprise Deployments');
        expect(markdown).toContain('  - Splunk Enterprise Data Administration');
    });
});

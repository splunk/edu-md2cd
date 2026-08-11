import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
    buildManifestFromLegacy,
    hasRedundantMetadataWrapper,
    migrateMetadata,
    normalizeDuration,
    unwrapRedundantMetadata,
} from '../../src/utils/migrator.js';

const tempDirs = [];

async function makeTempDir() {
    const tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'md2cd-migrator-'));
    tempDirs.push(tempDirPath);
    return tempDirPath;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((tempDirPath) => fs.rm(tempDirPath, { recursive: true, force: true }))
    );
});

describe('normalizeDuration', () => {
    it('normalizes abbreviated plural durations to hours', () => {
        expect(normalizeDuration('18 hr')).toBe('18 hours');
    });

    it('normalizes singular durations to hour', () => {
        expect(normalizeDuration('1 hr')).toBe('1 hour');
    });

    it('returns unparseable values unchanged', () => {
        expect(normalizeDuration('half day')).toBe('half day');
    });
});

describe('metadata wrapper helpers', () => {
    it('detects and unwraps redundant metadata wrappers', () => {
        const wrappedMetadata = {
            metadata: {
                course_id: '1001',
                course_title: 'Splunk Cloud Administration',
            },
            output: ['cd'],
        };

        expect(hasRedundantMetadataWrapper(wrappedMetadata)).toBe(true);
        expect(unwrapRedundantMetadata(wrappedMetadata)).toEqual({
            course_id: '1001',
            course_title: 'Splunk Cloud Administration',
            output: ['cd'],
        });
    });
});

describe('buildManifestFromLegacy', () => {
    it('retains repo-specific modality mapping and role splitting', () => {
        const manifest = buildManifestFromLegacy({
            course_id: '1001',
            course_title: 'Splunk Cloud Administration',
            format: 'Instructor-Led Training',
            duration: '18 hr',
            audience: {
                role: ['Administrator'],
                external: ['Architect'],
                internal: ['Sales Engineer'],
            },
            version: '9.4',
            output: ['cd'],
        });

        expect(manifest.metadata.courseId).toBe('1001');
        expect(manifest.metadata.format).toEqual([
            { mode: 'Instructor-led training', duration: '18 hours' },
        ]);
        expect(manifest.metadata.roles).toEqual({
            customer: ['Administrator', 'Architect'],
            internal: ['Sales Engineer'],
        });
        expect(manifest.output.formats).toEqual(['cd']);
    });
});

describe('migrateMetadata', () => {
    it('preserves the original legacy file and writes flat YAML metadata', async () => {
        const courseDirPath = await makeTempDir();
        const metadataPath = path.join(courseDirPath, 'metadata.yml');

        await fs.writeFile(
            metadataPath,
            [
                'metadata:',
                "  course_id: '1001'",
                "  course_title: 'Splunk Cloud Administration'",
                "  format: 'Instructor-Led Training'",
                "  duration: '18 hr'",
                '  audience:',
                '    - Splunk Cloud Administrators',
                "  updated: '2026-02-02'",
                "  version: '9.4'",
                'output:',
                '  - cd',
                '',
            ].join('\n')
        );

        const logger = {
            info() {},
            warn() {},
            error() {},
        };

        const manifest = await migrateMetadata(metadataPath, courseDirPath, logger, 'yaml');

        expect(manifest.metadata.format[0].duration).toBe('18 hours');

        const migratedMetadata = parseYaml(
            await fs.readFile(path.join(courseDirPath, 'metadata.yaml'), 'utf8')
        );
        expect(migratedMetadata.courseId).toBe('1001');
        expect(migratedMetadata.format[0].duration).toBe('18 hours');

        const migratedManifest = parseYaml(
            await fs.readFile(path.join(courseDirPath, 'manifest.yaml'), 'utf8')
        );
        expect(migratedManifest.output.formats).toEqual(['cd']);

        const legacyMetadata = await fs.readFile(`${metadataPath}.legacy`, 'utf8');
        expect(legacyMetadata).toContain("course_id: '1001'");
    });
});
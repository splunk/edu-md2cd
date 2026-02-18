import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(__dirname, 'fixtures');

const fixtures = [
    {
        name: 'custom-input',
        files: ['custom-filename.md', 'manifest.json'],
    },
    {
        name: 'custom-output',
        files: ['course-description.md', 'manifest.json'],
    },
    {
        name: 'locale-plugin',
        files: ['jp-course-description.md', 'manifest.json'],
    },
    {
        name: 'manifest-migration',
        files: ['course-description.md', 'metadata.yaml'],
    },
    {
        name: 'recursive-flat/advanced',
        files: ['advanced-course-description.md', 'manifest.json'],
    },
    {
        name: 'recursive-flat/foundation',
        files: ['foundation-course-description.md', 'manifest.json'],
    },
    {
        name: 'theme-system',
        files: ['course-description.md', 'manifest.json'],
    },
];

describe('Fixture files existence', () => {
    fixtures.forEach((fixture) => {
        describe(fixture.name, () => {
            fixture.files.forEach((file) => {
                it(`should have file: ${file}`, () => {
                    const filePath = path.join(fixturesDir, fixture.name, file);
                    expect(fs.existsSync(filePath)).toBe(true);
                });
            });
        });
    });
});

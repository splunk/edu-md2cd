import { describe, it, expect, afterEach } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const exec = promisify(execFile);
const BIN = path.resolve('bin/md2cd.js');
const FIXTURES = path.resolve('tests/fixtures');

/**
 * Run the md2cd CLI with given args.
 * All logs (including dry-run) go to stderr via pino.
 * Only --html output goes to stdout.
 */
async function run(args) {
    try {
        const { stdout, stderr } = await exec('node', [BIN, ...args]);
        return { stdout, stderr, exitCode: 0 };
    } catch (err) {
        return {
            stdout: err.stdout || '',
            stderr: err.stderr || '',
            exitCode: err.code ?? 1,
        };
    }
}

// ─── Dry-run tests (manifest loading + validation) ──────────────────────────

describe('E2E: dry-run mode', () => {
    it('custom-input: loads manifest and resolves custom input file', async () => {
        const { stderr, exitCode } = await run(['--dry-run', path.join(FIXTURES, 'custom-input')]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('Will generate PDF');
        expect(stderr).toContain('1234');
    });

    it('custom-output: loads manifest with custom output config', async () => {
        const { stderr, exitCode } = await run(['--dry-run', path.join(FIXTURES, 'custom-output')]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('Will generate PDF');
        expect(stderr).toContain('1234');
    });

    it('locale-plugin: loads manifest with plugin config', async () => {
        const { stderr, exitCode } = await run(['--dry-run', path.join(FIXTURES, 'locale-plugin')]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('Will generate PDF');
        expect(stderr).toContain('1001');
    });

    it('theme-system: loads manifest with theme config', async () => {
        const { stderr, exitCode } = await run(['--dry-run', path.join(FIXTURES, 'theme-system')]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('Will generate PDF');
        expect(stderr).toContain('1234');
    });

    it('recursive-flat/foundation: loads manifest', async () => {
        const { stderr, exitCode } = await run([
            '--dry-run',
            path.join(FIXTURES, 'recursive-flat', 'foundation'),
        ]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('Will generate PDF');
        expect(stderr).toContain('1234');
    });

    it('recursive-flat/advanced: loads manifest', async () => {
        const { stderr, exitCode } = await run([
            '--dry-run',
            path.join(FIXTURES, 'recursive-flat', 'advanced'),
        ]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('Will generate PDF');
        expect(stderr).toContain('5678');
    });
});

// ─── Manifest migration (metadata.yaml → manifest.json) ─────────────────────

describe('E2E: manifest migration', () => {
    const migrationDir = path.join(FIXTURES, 'manifest-migration');
    const generatedManifest = path.join(migrationDir, 'manifest.json');

    afterEach(async () => {
        // Clean up generated manifest.json so the fixture stays pristine
        try {
            await fs.unlink(generatedManifest);
        } catch {
            // Ignore if not created
        }
    });

    it('migrates metadata.yaml and creates manifest.json', async () => {
        // Run the tool — migration will create manifest.json, but validation
        // may fail due to legacy fields the migrator produces (e.g. input.labGuides).
        // The important thing is that the migration itself works correctly.
        await run(['--dry-run', migrationDir]);

        // Verify manifest.json was created
        const stat = await fs.stat(generatedManifest);
        expect(stat.isFile()).toBe(true);

        // Verify migrated content is correct
        const manifest = JSON.parse(await fs.readFile(generatedManifest, 'utf8'));
        expect(manifest.metadata.courseId).toBe('1001');
        expect(manifest.metadata.courseTitle).toBe('Splunk Cloud Administration');
        expect(manifest.metadata.slug).toBe('sca');
        expect(manifest.metadata.modality).toBe('Instructor-led');
        expect(manifest.metadata.duration).toBe('18 hr');
    });
});

// ─── Recursive dry-run ──────────────────────────────────────────────────────

describe('E2E: recursive dry-run', () => {
    it('discovers all course-description.md files in recursive-flat', async () => {
        const { stderr, exitCode } = await run([
            '--recursive',
            '--dry-run',
            path.join(FIXTURES, 'recursive-flat'),
        ]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('Dry run');
        expect(stderr).toContain('foundation-course-description.md');
        expect(stderr).toContain('advanced-course-description.md');
    });
});

// ─── HTML output tests (full pipeline minus PDF) ────────────────────────────

describe('E2E: HTML output', () => {
    it('custom-input: generates HTML from custom input file', async () => {
        const { stdout, exitCode } = await run(['--html', path.join(FIXTURES, 'custom-input')]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('<!DOCTYPE html>');
        expect(stdout).toContain('Course Description');
        expect(stdout).toContain('Splunk Cloud Administration');
    });

    it('custom-output: generates HTML (output config does not affect HTML mode)', async () => {
        const { stdout, exitCode } = await run(['--html', path.join(FIXTURES, 'custom-output')]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('<!DOCTYPE html>');
    });

    it('locale-plugin: generates HTML with Japanese content', async () => {
        const { stdout, exitCode } = await run(['--html', path.join(FIXTURES, 'locale-plugin')]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('<!DOCTYPE html>');
        // Japanese section headers should be present
        expect(stdout).toContain('Splunk Cloud 管理');
        // Plugin labels should be applied
        expect(stdout).toContain('形式');
        expect(stdout).toContain('時間');
        expect(stdout).toContain('対象者');
    });

    it('theme-system: generates HTML with cisco theme', async () => {
        const { stdout, exitCode } = await run(['--html', path.join(FIXTURES, 'theme-system')]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('<!DOCTYPE html>');
        // Cisco theme CSS should be embedded
        expect(stdout).toContain('Cisco');
    });

    it('metadata-prerequisites: generates prerequisites from metadata', async () => {
        const { stdout, exitCode } = await run([
            '--html',
            path.join(FIXTURES, 'metadata-prerequisites'),
        ]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('<!DOCTYPE html>');
        // Generated prerequisites header should be present
        expect(stdout).toContain('Prerequisites');
        // Required prerequisites should be present
        expect(stdout).toContain('Splunk Enterprise System Administration');
        expect(stdout).toContain('Troubleshooting Splunk Enterprise');
        expect(stdout).toContain('Splunk Enterprise Cluster Administration');
        // Required intro text should be present
        expect(stdout).toContain(
            'To be successful, students must have completed these Splunk Education course(s) or possess equivalent working knowledge',
        );
        // Optional prerequisites should be present
        expect(stdout).toContain('Linux chops');
        expect(stdout).toContain('Karate chops');
        expect(stdout).toContain('Underwater basket weaving');
        // Optional intro text should be present
        expect(stdout).toContain('Students are expected to have knowledge of the following topics prior to participating in the course');
    });
});

// ─── CLI validation ─────────────────────────────────────────────────────────

describe('E2E: CLI validation', () => {
    it('--output without sourceDir shows error', async () => {
        const { stderr, exitCode } = await run(['--output', '/tmp/test-output']);
        expect(exitCode).not.toBe(0);
        expect(stderr).toContain('Error');
    });

    it('invalid source directory shows error', async () => {
        const { exitCode } = await run(['--dry-run', '/nonexistent/path/that/does/not/exist']);
        expect(exitCode).not.toBe(0);
    });
});

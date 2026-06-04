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
    const generatedMetadata = path.join(migrationDir, 'metadata.yaml');
    const generatedManifest = path.join(migrationDir, 'manifest.yaml');

    afterEach(async () => {
        // Clean up generated files so the fixture stays pristine
        for (const f of [generatedMetadata, generatedManifest]) {
            try { await fs.unlink(f); } catch { /* ignore */ }
        }
    });

    it('migrates legacy metadata.yaml and creates metadata.yaml (new schema)', async () => {
        // Run the tool — migration will create metadata.yaml (new schema)
        await run(['--dry-run', migrationDir]);

        // Verify metadata.yaml was created
        const stat = await fs.stat(generatedMetadata);
        expect(stat.isFile()).toBe(true);

        // Verify migrated content is correct
        const { parse } = await import('yaml');
        const metadata = parse(await fs.readFile(generatedMetadata, 'utf8'));
        expect(metadata.metadata.courseId).toBe('1001');
        expect(metadata.metadata.courseTitle).toBe('Splunk Cloud Administration');
        expect(metadata.metadata.slug).toBe('sca');
        expect(metadata.metadata.modality).toBe('Instructor-led training');
        expect(metadata.metadata.duration).toBe('18 hr');
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

    it('boolean-prerequisites: generates prerequisites from metadata with OR groups', async () => {
        const { stdout, exitCode } = await run([
            '--html',
            path.join(FIXTURES, 'boolean-prerequisites'),
        ]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('<!DOCTYPE html>');
        // Generated prerequisites header should be present
        expect(stdout).toContain('Prerequisites');
        // Required prerequisites should be present
        expect(stdout).toContain('Splunk Enterprise System Administration');
        // OR group options should be present
        expect(stdout).toContain('Troubleshooting Splunk Enterprise');
        expect(stdout).toContain('Architecting Splunk Enterprise Deployments');
        expect(stdout).toContain('Splunk Enterprise Data Administration');
        expect(stdout).toContain('Additionally, complete one of the following');
        // Updated intro text should be present
        expect(stdout).toContain(
            'To be successful, students must have completed the following',
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

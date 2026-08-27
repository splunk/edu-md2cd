import { describe, expect, it } from 'vitest';
import { BuildStage } from '../../src/stages/50-build.js';

function makeContext(metadata) {
    return { manifest: { metadata } };
}

describe('BuildStage.getOutputFilename', () => {
    const stage = new BuildStage();

    it('uses manifest output.pdfs.courseDescription when defined', () => {
        const context = makeContext({ courseTitle: 'Custom Output', slug: 'custom-output' });

        const filename = stage.getOutputFilename(
            context,
            'eLearning',
            0,
            1,
            'custom-filename.pdf',
            'combined'
        );

        expect(filename).toBe('custom-filename.pdf');
    });

    it('falls back to metadata.slug when no manifest output is configured', () => {
        const context = makeContext({ courseTitle: 'Some Other Title', slug: 'my-slug' });

        const filename = stage.getOutputFilename(context, 'eLearning', 0, 1, undefined, 'combined');

        expect(filename).toBe('my-slug-course-description.pdf');
    });

    it('uses metadata.slug (not the slugified title) for multi-format filenames', () => {
        const context = makeContext({ courseTitle: 'Some Other Title', slug: 'my-slug' });

        const filename = stage.getOutputFilename(
            context,
            'Instructor-led training',
            0,
            2,
            undefined,
            'split'
        );

        expect(filename).toBe('my-slug-instructor-led-training.pdf');
    });

    it('slugifies the course title when no manifest output or slug is defined', () => {
        const context = makeContext({ courseTitle: 'No Slug Here' });

        const filename = stage.getOutputFilename(context, 'eLearning', 0, 1, undefined, 'combined');

        expect(filename).toBe('no-slug-here-course-description.pdf');
    });
});

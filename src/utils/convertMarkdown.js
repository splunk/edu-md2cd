import { marked } from 'marked';
import pluginManager from '../../plugins/pluginLoader.js';

/**
 * Convert markdown to HTML
 * @param {string} markdown - Markdown content
 * @returns {string} HTML
 */
export function convertToHtml(markdown) {
    return marked(markdown);
}

/**
 * Extract a section between specified headers
 * @param {string} markdown - Markdown content
 * @param {string[]} startHeaders - Headers that mark section start
 * @param {string[]} endHeaders - Headers that mark section end
 * @returns {Object} {content: extracted markdown, start: index, end: index}
 */
export function extractSection(markdown, startHeaders, endHeaders) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim().toLowerCase();

        if (startHeaders.some((header) => trimmedLine === header.toLowerCase())) {
            startIndex = i;
        } else if (
            startIndex !== -1 &&
            endHeaders.some((header) => trimmedLine === header.toLowerCase())
        ) {
            endIndex = i;
            break;
        }
    }

    if (startIndex === -1 || endIndex === -1) {
        return { content: null, startIndex: -1, endIndex: -1 };
    }

    const sectionLines = lines.slice(startIndex, endIndex);
    return {
        content: sectionLines.join('\n'),
        startIndex,
        endIndex,
        allLines: lines,
    };
}

/**
 * Extract prerequisites section from markdown
 * @param {string} markdown - Markdown content
 * @returns {Object} {prereqMarkdown: string, cleanedMarkdown: string}
 */
export function extractPrerequisites(markdown) {
    const prerequisitesHeaders = pluginManager.getPrerequisiteHeaders();
    const courseOutlineHeaders = pluginManager.getCourseOutlineHeaders();

    const section = extractSection(markdown, prerequisitesHeaders, courseOutlineHeaders);

    if (!section.content) {
        return { prereqMarkdown: null, cleanedMarkdown: markdown };
    }

    // Replace section with placeholder
    const before = section.allLines.slice(0, section.startIndex);
    const after = section.allLines.slice(section.endIndex);
    const cleanedMarkdown = [...before, '{{PREREQUISITES}}', ...after].join('\n');

    return {
        prereqMarkdown: section.content,
        cleanedMarkdown,
    };
}

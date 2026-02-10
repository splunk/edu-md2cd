/**
 * Generate slug from course title following PMO guidelines
 * 
 * Rules:
 * - Remove "Splunk" from title
 * - Remove "Enterprise" from title
 * - Shorten "Administrator" to "Admin"
 * - Convert to lowercase
 * - Replace spaces with underscores
 * - Remove special characters
 * - Collapse multiple underscores
 * 
 * @param {string} title - Course title
 * @returns {string} Generated slug
 */
export function generateSlug(title) {
  return title
    .replace(/splunk/gi, '')
    .replace(/enterprise/gi, '')
    .replace(/administrator/gi, 'admin')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}
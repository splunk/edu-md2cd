import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Valid prerequisite courses for validation
 * Loaded from data/course-titles.json
 * This list can be updated periodically as new courses are added
 * @constant {Array<string>}
 */
const courseTitlesPath = path.join(__dirname, '../../data/course-titles.json');
export const VALID_PREREQUISITE_COURSES = JSON.parse(fs.readFileSync(courseTitlesPath, 'utf-8'));

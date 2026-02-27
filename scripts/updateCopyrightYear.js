// scripts/updateCopyrightYear.js
// Updates the copyright year in README.md to the current year

const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, '..', 'README.md');
const currentYear = new Date().getFullYear();

let readme = fs.readFileSync(readmePath, 'utf8');

// Replace copyright year patterns like "Copyright 2023" or "Copyright (c) 2023"
readme = readme.replace(/(Copyright\s*(?:\(c\))?\s*)\d{4}/gi, `$1${currentYear}`);

fs.writeFileSync(readmePath, readme);

console.log(`Updated copyright year to ${currentYear} in README.md`);

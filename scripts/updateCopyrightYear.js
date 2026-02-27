// scripts/updateCopyrightYear.js
// Updates the copyright year in README.md to the current year

const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, '..', 'README.md');
const currentYear = new Date().getFullYear();

let readme = fs.readFileSync(readmePath, 'utf8');

// Replace copyright year pattern like "© 2025 Splunk LLC. All rights reserved."
readme = readme.replace(/©\s*\d{4}\s*Splunk LLC\. All rights reserved\./i, `© ${currentYear} Splunk LLC. All rights reserved.`);

fs.writeFileSync(readmePath, readme);

console.log(`Updated copyright year to ${currentYear} in README.md`);

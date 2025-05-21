import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

import {
  getCourseAudience,
  getCourseDuration,
  getCourseFormat,
} from "../utils/metadataHandler.js";

import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.join(__dirname, "../assets");

function getBase64Image(fileName) {
  const fullPath = path.join(ASSETS_DIR, fileName);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Image not found at path: ${fullPath}`);
  }

  return fs.readFileSync(fullPath).toString("base64");
}

const iconFormat = `data:image/png;base64,${getBase64Image("icon-format.png")}`;
const iconDuration = `data:image/png;base64,${getBase64Image(
  "icon-duration.png"
)}`;
const iconAudience = `data:image/png;base64,${getBase64Image(
  "icon-audience.png"
)}`;

function extractAndRenderPrerequisites(markdownText, metadata) {
  let courseFormat, courseDuration, courseAudience;

  try {
    courseFormat = getCourseFormat(metadata);
    courseDuration = getCourseDuration(metadata);
    courseAudience = getCourseAudience(metadata);
  } catch (err) {
    logger.error(`Uh oh! ${err.message}`);
    process.exit(1);
  }

  const lines = markdownText.replace(/\r\n/g, "\n").split("\n");

  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === "## prerequisites") {
      startIndex = i;
    } else if (
      startIndex !== -1 &&
      lines[i].trim().toLowerCase() === "## course outline"
    ) {
      endIndex = i;
      break;
    }
  }

  if (startIndex === -1 || endIndex === -1) {
    return { prereqHTML: "", cleanedMarkdown: markdownText };
  }

  const prereqLines = lines.slice(startIndex, endIndex);
  const fullMatch = prereqLines.join("\n");

  const renderedPrereqs = marked(fullMatch);

  const metadataHTML = `
    <div class="metadata">
      ${
        courseFormat
          ? `<p class="metadata-line">
              <span class="metadata-key">
                <img src="${iconFormat}" class="metadata-icon" alt="icon" />
                <strong>Format:</strong>
              </span>
              <span class="metadata-value">${courseFormat}</span>
            </p>`
          : ""
      }
      ${
        courseDuration
          ? `<p class="metadata-line">
              <span class="metadata-key">
                <img src="${iconDuration}" class="metadata-icon" alt="icon" />
                <strong>Duration:</strong>
              </span>
              <span class="metadata-value">${courseDuration}</span>
            </p>`
          : ""
      }
      ${
        courseAudience && Array.isArray(courseAudience)
          ? `<div class="metadata-line">
              <span class="metadata-key">
                <img src="${iconAudience}" class="metadata-icon" alt="icon" />
                <strong>Audience:</strong>
              </span>
              <div class="metadata-value">
                ${
                  courseAudience.length > 1
                    ? `<ul class="metadata-list">
                        ${courseAudience
                          .map((item) => `<li>${item}</li>`)
                          .join("")}
                      </ul>`
                    : `<span>${courseAudience[0]}</span>`
                }
              </div>
            </div>`
          : ""
      }
    </div>
  `;

  const prereqHTML = `
    <div class="two-col">
      <div class="prerequisites">${renderedPrereqs}</div>
      ${metadataHTML}
    </div>
  `;

  const before = lines.slice(0, startIndex);
  const after = lines.slice(endIndex);
  const cleanedMarkdown = [...before, "{{PREREQUISITES}}", ...after].join("\n");

  return { prereqHTML, cleanedMarkdown };
}

export function generateHTML(markdownText, metadata = {}) {
  if (!markdownText)
    throw new Error("markdownText is required in generateHTML.");
  if (!metadata) throw new Error("metadata is required in generateHTML.");

  const cssPath = path.join(__dirname, "../styles/style.css");
  const style = fs.readFileSync(cssPath, "utf-8");

  const logoPath = path.join(ASSETS_DIR, "logo-splunk-edu-header.png");
  const imageData = fs.readFileSync(logoPath).toString("base64");
  const imageSrc = `data:image/png;base64,${imageData}`;

  const headerHTML = `
    <header class="first-page-header">
      <img src="${imageSrc}" class="header-logo" />
      <p class="header-text">Course Description</p>
    </header>
  `;

  const { prereqHTML, cleanedMarkdown } = extractAndRenderPrerequisites(
    markdownText,
    metadata
  );

  const renderedMain = marked(cleanedMarkdown);
  const htmlContent = renderedMain.replace("{{PREREQUISITES}}", prereqHTML);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${metadata.course_title}</title>
      <style>${style}</style>
    </head>
    <body>
      ${headerHTML}
      <main>${htmlContent}</main>
    </body>
    </html>
  `;
}

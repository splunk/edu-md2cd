import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import logger from "./logger.js";

export function getCourseTitle(metadata) {
  const courseTitle = metadata?.course_title;
  if (courseTitle === undefined) {
    throw new Error("No 'course_title' found in the metadata");
  }
  return courseTitle;
}

export function getCourseId(metadata) {
  const courseId = metadata?.course_id;
  if (courseId === undefined) {
    throw new Error("No 'course_id' found in the metadata");
  }
  return courseId;
}

export function getProductVersion(metadata) {
  const productVersion = metadata?.version;
  if (productVersion === undefined) {
    throw new Error("No 'version' found in the metadata");
  }
  return productVersion;
}

export function getCourseFormat(metadata) {
  const courseFormat = metadata?.format;
  if (courseFormat === undefined) {
    throw new Error("No 'format' found in the metadata");
  }
  return courseFormat;
}

export function getCourseDuration(metadata) {
  const courseDuration = metadata?.duration;
  if (courseDuration === undefined) {
    throw new Error("No 'duration' found in the metadata");
  }
  return courseDuration;
}

export function getCourseAudience(metadata) {
  const courseAudience = metadata?.audience;
  if (courseAudience === undefined) {
    throw new Error("No 'audience' found in the metadata");
  }
  return courseAudience;
}

export function slugify(text) {
  logger.debug(`Slugifying text: "${text}"`);
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function getMetadataPath(sourceDir) {
  const metadataExtensions = ["yaml", "yml"];
  let metadataPath;

  // Try both .yaml and .yml extensions
  for (const ext of metadataExtensions) {
    const filePath = path.join(sourceDir, `metadata.${ext}`);
    try {
      await fs.access(filePath);
      metadataPath = filePath;
      break;
    } catch (err) {
      continue;
    }
  }

  if (!metadataPath) {
    logger.error("Metadata file not found (metadata.yaml or metadata.yml)");
    process.exit(1);
  }

  return metadataPath;
}

export async function loadMetadata(metadataPath) {
  const metadataRaw = await fs.readFile(metadataPath, "utf8");
  const metadata = yaml.load(metadataRaw) || {};

  if (metadata.course_id) {
    metadata.course_id = metadata.course_id.toString().padStart(4, "0");
  }

  logger.info(`🚚 Loading metadata ${metadataPath}`);

  return metadata;
}

export async function updateMetadataDate(metadataPath, metadata, updatedDate) {
  if (metadata.course_id) {
    metadata.course_id = metadata.course_id.toString().padStart(4, "0");
  }

  metadata.updated = updatedDate;

  const newYaml = yaml.dump(metadata);
  await fs.writeFile(metadataPath, newYaml, "utf8");

  logger.info(`🏷️  Updating metadata.updated: ${updatedDate}`);
}

export function getFormattedDate(input) {
  const date = input ? new Date(input) : new Date();

  if (isNaN(date.getTime())) {
    logger.error(
      `Invalid date format. Use YYYY-MM-DD.`,
      `You entered: ${input}`
    );
    process.exit(1);
  }

  return date.toISOString().split("T")[0];
}

import fs from "fs";
import path from "path";

export function logEvent(event, logPath) {
  if (!logPath) return;

  try {
    const dir = path.dirname(logPath);
    fs.mkdirSync(dir, { recursive: true });

    const line = JSON.stringify(event) + "\n";
    fs.appendFileSync(logPath, line, "utf-8");
  } catch (err) {
    console.error(`⚠️ Failed to write to log: ${err.message}`);
  }
}

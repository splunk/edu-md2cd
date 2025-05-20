// import fs from "fs";
// import path from "path";

// export function logEvent(event, logPath) {
//   if (!logPath) return;

//   try {
//     const dir = path.dirname(logPath);
//     fs.mkdirSync(dir, { recursive: true });

//     const line = JSON.stringify(event) + "\n";
//     fs.appendFileSync(logPath, line, "utf-8");
//   } catch (err) {
//     console.error(`⚠️ Failed to write to log: ${err.message}`);
//   }
// }

const LOG_LEVELS = ["error", "warn", "info", "debug"];
const CURRENT_LEVEL = process.env.LOG_LEVEL || "info";

function shouldLog(level) {
  const currentIdx = LOG_LEVELS.indexOf(CURRENT_LEVEL);
  const levelIdx = LOG_LEVELS.indexOf(level);
  return levelIdx <= currentIdx;
}

const PREFIX = {
  info: "",
  warn: "⚠️ ",
  error: "❌ ",
  debug: "🐛 ",
};

const logger = {};
for (const level of LOG_LEVELS) {
  logger[level] = (...args) => {
    if (shouldLog(level)) {
      console[level === "debug" ? "log" : level](PREFIX[level], ...args);
    }
  };
}

export default logger;

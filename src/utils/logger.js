import pino from 'pino';
import pinoPretty from 'pino-pretty';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Use pino-pretty synchronously (not as a worker transport) so we can pass
// formatter functions.  This is fine for a CLI tool.
const prettyStream = isDevelopment
    ? pinoPretty({
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
          destination: 2, // stderr — keep stdout clean for --html output
      })
    : undefined;

const baseLogger = pino(
    { level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info') },
    prettyStream || pino.destination({ dest: 2, sync: true }),
);

const EMOJI = {
    debug: '🐛',
    info: '📋',
    warn: '⚠️ ',
    error: '❌',
    fatal: '💀',
};

// Levels whose label is 4 chars (INFO, WARN) need 1 extra space to align
// with 5-char labels (DEBUG, ERROR, FATAL).
const SHORT_LEVELS = new Set(['info', 'warn']);

// Matches any Unicode emoji (surrogate pairs, variation selectors, ZWJ sequences, etc.)
const EMOJI_RE =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1FAD6}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}\u{200D}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{2934}\u{2935}\u{25AA}-\u{25FE}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{2702}\u{2712}\u{270D}\u{270F}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{26A0}\u{26A1}\u{26D4}\u{2705}]/u;

const logger = {};
for (const level of ['debug', 'info', 'warn', 'error', 'fatal']) {
    logger[level] = (...args) => {
        const message = args.map(String).join(' ');
        const pad = SHORT_LEVELS.has(level) ? ' ' : '';
        // Use the message's own emoji if present, otherwise prepend the default
        const prefix = EMOJI_RE.test(message) ? '' : `${EMOJI[level]} `;
        baseLogger[level](`${pad}${prefix}${message}`);
    };
}

export default logger;

import pino from 'pino';
import pinoPretty from 'pino-pretty';

const isDevelopment = process.env.NODE_ENV !== 'production';
const useEmoji = process.env.NO_EMOJI !== '1';

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

// Matches common Unicode emoji at the START of a string.
// Uses the Unicode Emoji property escape instead of hand-rolled ranges
// to avoid misleading-character-class lint errors.
const EMOJI_RE = /\p{Extended_Pictographic}/u;

const logger = {};
for (const level of ['debug', 'info', 'warn', 'error', 'fatal']) {
    logger[level] = (...args) => {
        const message = args.map(String).join(' ');
        const pad = SHORT_LEVELS.has(level) ? ' ' : '';
        // Use the message's own emoji if present, otherwise prepend the default
        const prefix = EMOJI_RE.test(message) ? '' : (useEmoji ? `${EMOJI[level]} ` : '');
        baseLogger[level](`${pad}${prefix}${message}`);
    };
}

export default logger;

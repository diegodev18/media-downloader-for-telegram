const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

function prefix(label: string, color: string): string {
  return `${color}${label}${C.reset}`;
}

export const logger = {
  info:  (...args: unknown[]) => console.log(prefix("[INFO]", C.cyan),    ...args),
  ok:    (...args: unknown[]) => console.log(prefix("[ OK ]", C.green),   ...args),
  warn:  (...args: unknown[]) => console.warn(prefix("[WARN]", C.yellow), ...args),
  error: (...args: unknown[]) => console.error(prefix("[ERR ]", C.red),   ...args),
  req:   (...args: unknown[]) => console.log(prefix("[ REQ]", C.blue),    ...args),
  dl:    (...args: unknown[]) => console.log(prefix("[ DL ]", C.magenta), ...args),
};

export function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

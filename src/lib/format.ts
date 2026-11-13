/** Small formatting helpers shared across the dashboard. */

const integerFormatter = new Intl.NumberFormat("en-US");

/** Formats an integer with thousand separators. */
export function formatNumber(value: number): string {
  return integerFormatter.format(Math.trunc(value));
}

/** Formats a byte count, e.g. `25.8 KB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Formats a `YYYYMMDD-HHMMSSZ` stamp into something readable. */
export function formatStamp(stamp: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})Z$/.exec(stamp);
  if (!match) return stamp;
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}

/** Shortens a long path for display, keeping the drive and the file name. */
export function shortenPath(path: string, maxLength = 64): string {
  if (path.length <= maxLength) return path;
  const separator = path.includes("\\") ? "\\" : "/";
  const parts = path.split(separator);
  const fileName = parts.pop() ?? "";
  let head = parts.join(separator);
  if (head.length > maxLength - fileName.length - 4) {
    head = `${head.slice(0, 3)}${separator}...${separator}${parts[parts.length - 1]}`;
  }
  return `${head}${separator}${fileName}`;
}

/** Formats a percentage with a single decimal place. */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${(Math.min(Math.max(ratio, 0), 1) * 100).toFixed(1)}%`;
}

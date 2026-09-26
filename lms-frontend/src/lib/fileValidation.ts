import { formatBytes } from './format';

// Checks a chosen file against the allowed types / size. Returns a friendly error, or null if it's fine.
// Exported so other components (e.g. a "Replace" button) can apply exactly the same rules.
export function validateFile(file: File, accept: string[], maxBytes: number, typeLabel: string): string | null {
  if (!accept.includes(file.type)) return `That file type isn't supported. Please choose ${typeLabel}.`;
  if (file.size > maxBytes) return `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(maxBytes)}.`;
  return null;
}

// "1536000" -> "1.5 MB"
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

// 0 -> "Free", "19.5" -> "$19.50". The backend returns decimals as strings, so always go through Number().
export function formatPrice(price: number | string): string {
  const value = Number(price);
  return value <= 0 ? 'Free' : `$${value.toFixed(2)}`;
}

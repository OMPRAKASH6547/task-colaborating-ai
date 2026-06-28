import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateUserColor(userId: string): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function compareVectorClocks(
  a: Record<string, number>,
  b: Record<string, number>,
): "before" | "after" | "concurrent" {
  let aGreater = false;
  let bGreater = false;

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const aVal = a[key] ?? 0;
    const bVal = b[key] ?? 0;
    if (aVal > bVal) aGreater = true;
    if (bVal > aVal) bGreater = true;
  }

  if (aGreater && !bGreater) return "after";
  if (bGreater && !aGreater) return "before";
  return "concurrent";
}

export function incrementVectorClock(
  clock: Record<string, number>,
  userId: string,
): Record<string, number> {
  return {
    ...clock,
    [userId]: (clock[userId] ?? 0) + 1,
  };
}

export function mergeVectorClocks(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    merged[key] = Math.max(merged[key] ?? 0, value);
  }
  return merged;
}

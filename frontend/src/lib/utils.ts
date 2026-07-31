import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind merge support.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates exponential backoff delay with optional jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay = 1000,
  maxDelay = 16000,
  maxJitter = 300
): number {
  const exponential = Math.pow(2, attempt);
  const calculated = baseDelay * exponential;
  const jitter = maxJitter > 0 ? Math.floor(Math.random() * maxJitter) : 0;
  return Math.min(calculated, maxDelay) + jitter;
}

/**
 * Copies text to system clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined" || !navigator?.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Checks if the given user is the owner of the room.
 */
export function isRoomOwner(
  room: { ownerId?: number; ownerName?: string } | null | undefined,
  user: { id?: number; fullName?: string } | null | undefined
): boolean {
  if (!room || !user) return false;
  if (user.id !== undefined && room.ownerId !== undefined) {
    return Number(user.id) === Number(room.ownerId);
  }
  return !!user.fullName && user.fullName === room.ownerName;
}

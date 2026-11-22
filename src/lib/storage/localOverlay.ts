import { z } from "zod";

const KEY_PREFIX = "muict_devclub_v1_";
const IDB_REF_PATTERN = /idb:\/\/([^\s"'`<>]+)/g;

function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return null;
    }
    return localStorage;
  } catch {
    return null;
  }
}

export function readOverlay<T, TInput = T>(
  key: string,
  schema: z.ZodType<T, z.ZodTypeDef, TInput>,
  fallback: T
): T {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return fallback;
  }

  try {
    const raw = storage.getItem(`${KEY_PREFIX}${key}`);
    if (raw === null) {
      return fallback;
    }

    const parsedJson: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsedJson);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeOverlay<T>(key: string, value: T): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(`${KEY_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage quota or serialization failures cleanly.
  }
}

export function clearAllOverlays(): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors cleanly.
  }
}

export function findIdbRefs(obj: unknown): string[] {
  const refs = new Set<string>();
  const visited = new Set<object>();

  function scan(value: unknown): void {
    if (typeof value === "string") {
      IDB_REF_PATTERN.lastIndex = 0;
      let match = IDB_REF_PATTERN.exec(value);
      while (match !== null) {
        if (match[1]) {
          refs.add(match[1]);
        }
        match = IDB_REF_PATTERN.exec(value);
      }
      return;
    }

    if (value === null || typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        scan(item);
      }
      return;
    }

    for (const propValue of Object.values(value)) {
      scan(propValue);
    }
  }

  scan(obj);
  return Array.from(refs);
}

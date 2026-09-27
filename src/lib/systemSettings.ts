import { prisma } from '@/lib/prisma';

// High-performance in-memory cache to eliminate repetitive DB queries (0ms access)
const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds cache

export async function getSystemSettings(keys: string[]) {
  const now = Date.now();
  const map: Record<string, string> = {};
  const missingKeys: string[] = [];

  for (const k of keys) {
    const cached = cache.get(k);
    if (cached && cached.expiresAt > now) {
      map[k] = cached.value;
    } else {
      missingKeys.push(k);
    }
  }

  if (missingKeys.length === 0) {
    return map;
  }

  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: missingKeys } },
      select: { key: true, value: true },
    });

    for (const row of rows) {
      map[row.key] = row.value;
      cache.set(row.key, { value: row.value, expiresAt: now + CACHE_TTL_MS });
    }

    // Set missing keys as empty in cache to prevent query loops
    for (const k of missingKeys) {
      if (!(k in map)) {
        map[k] = '';
        cache.set(k, { value: '', expiresAt: now + CACHE_TTL_MS });
      }
    }
  } catch (err) {
    console.error('[SystemSettings] Error querying settings from DB:', err);
  }

  return map;
}

export async function upsertSystemSetting(key: string, value: string, description?: string) {
  // Update cache immediately so next call is instant
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });

  return prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, description },
    update: { value, description: description ?? undefined },
  });
}

export function clearSystemSettingsCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}


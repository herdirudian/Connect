import { prisma } from '@/lib/prisma';

export async function getSystemSettings(keys: string[]) {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function upsertSystemSetting(key: string, value: string, description?: string) {
  return prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, description },
    update: { value, description: description ?? undefined },
  });
}


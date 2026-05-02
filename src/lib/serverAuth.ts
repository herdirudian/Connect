import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const payload = token ? (verifyToken(token) as any) : null;
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, permissions: true },
  });
  if (!user) return null;

  let permissions: string[] = [];
  try {
    if (user.permissions) permissions = JSON.parse(user.permissions);
  } catch {}

  return { userId: user.id, role: user.role, permissions };
}


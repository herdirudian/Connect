import { prisma } from './prisma';

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

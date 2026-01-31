import { prisma } from '@/lib/prisma';

export async function createNotification(userId: string, title: string, message: string) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw, just log. Notifications shouldn't break the main flow.
  }
}

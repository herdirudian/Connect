'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addPoints(userId: string, amount: number, description: string) {
  try {
    // Ensure amount is an integer
    const pointsToAdd = Math.floor(amount);
    
    if (pointsToAdd <= 0) {
      return { success: false, error: 'Points must be greater than 0' };
    }

    await prisma.$transaction(async (tx) => {
      // Update user points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: pointsToAdd
          }
        },
        select: { id: true, points: true }
      })

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          amount: pointsToAdd,
          type: 'EARN',
          description: description || 'Penambahan poin oleh Admin',
          source: 'ADMIN_ADJUSTMENT',
          balanceAfter: updatedUser.points,
        }
      })
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'ADD_POINTS',
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify({ amount: pointsToAdd, description }),
        }
      })
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error adding points:', error)
    return { success: false, error: 'Failed to add points' }
  }
}

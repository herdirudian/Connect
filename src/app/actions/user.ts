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
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: pointsToAdd
          }
        }
      })

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          amount: pointsToAdd,
          type: 'EARN',
          description: description || 'Penambahan poin oleh Admin',
          source: 'ADMIN_ADJUSTMENT'
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

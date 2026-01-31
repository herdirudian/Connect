'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export type PromoResult = {
  success: boolean
  error?: string
  data?: any
}

export async function createPromo(data: {
  title: string
  description: string
  imageUrl?: string
  validUntil?: string
  claimable?: boolean
  isPartner?: boolean
  showButton?: boolean
}): Promise<PromoResult> {
  try {
    const promo = await prisma.partnerPromo.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        active: true,
      },
    })
    
    // Update raw fields that might not be in the generated client yet
    const claimableVal = typeof data.claimable !== 'undefined' ? (data.claimable ? 1 : 0) : 0
    const isPartnerVal = typeof data.isPartner !== 'undefined' ? (data.isPartner ? 1 : 0) : 1
    const showButtonVal = typeof data.showButton !== 'undefined' ? (data.showButton ? 1 : 0) : 1
    
    await prisma.$executeRaw`UPDATE PartnerPromo SET claimable = ${claimableVal}, isPartner = ${isPartnerVal}, showButton = ${showButtonVal} WHERE id = ${promo.id}`

    revalidatePath('/admin/promos')
    revalidatePath('/dashboard/promos')
    return { success: true, data: { ...promo, claimable: !!data.claimable, isPartner: !!data.isPartner, showButton: !!data.showButton } }
  } catch (error) {
    console.error('Error creating promo:', error)
    return { success: false, error: 'Failed to create promo' }
  }
}

export async function updatePromo(id: string, data: {
  title: string
  description: string
  imageUrl?: string
  validUntil?: string
  claimable?: boolean
  isPartner?: boolean
  showButton?: boolean
}): Promise<PromoResult> {
  try {
    const promo = await prisma.partnerPromo.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    })
    
    // Update raw fields that might not be in the generated client yet
    const claimableVal = typeof data.claimable !== 'undefined' ? (data.claimable ? 1 : 0) : 0
    const isPartnerVal = typeof data.isPartner !== 'undefined' ? (data.isPartner ? 1 : 0) : 1
    const showButtonVal = typeof data.showButton !== 'undefined' ? (data.showButton ? 1 : 0) : 1
    
    await prisma.$executeRaw`UPDATE PartnerPromo SET claimable = ${claimableVal}, isPartner = ${isPartnerVal}, showButton = ${showButtonVal} WHERE id = ${id}`

    revalidatePath('/admin/promos')
    revalidatePath('/dashboard/promos')
    return { success: true, data: { ...promo, claimable: !!data.claimable, isPartner: !!data.isPartner, showButton: !!data.showButton } }
  } catch (error) {
    console.error('Error updating promo:', error)
    return { success: false, error: 'Failed to update promo' }
  }
}

export async function togglePromoStatus(id: string, active: boolean): Promise<PromoResult> {
  try {
    const promo = await prisma.partnerPromo.update({
      where: { id },
      data: { active },
    })
    revalidatePath('/admin/promos')
    revalidatePath('/dashboard/promos')
    return { success: true, data: promo }
  } catch (error) {
    console.error('Error updating promo:', error)
    return { success: false, error: 'Failed to update promo' }
  }
}

export async function deletePromo(id: string): Promise<PromoResult> {
  try {
    await prisma.partnerPromo.delete({
      where: { id },
    })
    revalidatePath('/admin/promos')
    revalidatePath('/dashboard/promos')
    return { success: true }
  } catch (error) {
    console.error('Error deleting promo:', error)
    return { success: false, error: 'Failed to delete promo' }
  }
}

export async function togglePromoClaimable(id: string, claimable: boolean): Promise<PromoResult> {
  try {
    await prisma.$executeRaw`UPDATE PartnerPromo SET claimable = ${claimable ? 1 : 0} WHERE id = ${id}`
    revalidatePath('/admin/promos')
    revalidatePath('/dashboard/promos')
    return { success: true, data: { id, claimable } }
  } catch (error) {
    console.error('Error updating promo claimable:', error)
    return { success: false, error: 'Failed to update claimable' }
  }
}

export async function claimPromo(promoId: string): Promise<PromoResult> {
  try {
    const { cookies } = await import('next/headers')
    const { verifyToken } = await import('@/lib/auth')
    const store = await cookies()
    const token = store.get('token')?.value || ''
    const decoded = verifyToken(token) as any
    if (!decoded) return { success: false, error: 'Unauthorized' }

    const promoRows = await prisma.$queryRaw<
      { title: string; active: number; claimable: number }[]
    >`SELECT title, active, claimable FROM PartnerPromo WHERE id = ${promoId} LIMIT 1`

    if (promoRows.length === 0 || !promoRows[0].active) {
      return { success: false, error: 'Promo not available' }
    }
    if (!promoRows[0].claimable) {
      return { success: false, error: 'Promo not claimable' }
    }

    const existing = await prisma.$queryRaw<
      { id: string; uniqueCode: string }[]
    >`SELECT id, uniqueCode FROM PartnerPromoClaim WHERE promoId = ${promoId} AND userId = ${decoded.userId} LIMIT 1`
    if (existing.length > 0) return { success: true, data: { id: existing[0].id, uniqueCode: existing[0].uniqueCode } }

    // Fetch user for email
    const userRows = await prisma.$queryRaw<
      { email: string; name: string }[]
    >`SELECT email, name FROM User WHERE id = ${decoded.userId} LIMIT 1`
    
    if (userRows.length === 0) return { success: false, error: 'User not found' }

    const claimId = crypto.randomUUID()
    const uniqueCode = 'PROMO-' + Math.random().toString(36).substring(2, 8).toUpperCase()

    // Insert without updatedAt since it's not in schema (and we didn't add it)
    await prisma.$executeRaw`
      INSERT INTO PartnerPromoClaim (id, promoId, userId, uniqueCode, status, createdAt)
      VALUES (${claimId}, ${promoId}, ${decoded.userId}, ${uniqueCode}, 'ACTIVE', NOW())
    `

    // Send email
    try {
      const { sendPartnerPromoEmail } = await import('@/lib/email')
      await sendPartnerPromoEmail(userRows[0].email, userRows[0].name, promoRows[0].title, uniqueCode)
    } catch (e) {
      console.error('Failed to send promo email', e)
    }

    revalidatePath('/dashboard/promos')
    return { success: true, data: { id: claimId, uniqueCode } }
  } catch (error) {
    console.error('Error claiming promo:', error)
    return { success: false, error: 'Failed to claim promo' }
  }
}

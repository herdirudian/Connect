import { prisma } from '@/lib/prisma'
import PromoClient from './PromoClient'

export const dynamic = 'force-dynamic'

export default async function AdminPromosPage() {
  const rawPromos = await prisma.$queryRaw<
    {
      id: string
      title: string
      description: string
      imageUrl: string | null
      validUntil: Date | null
      active: number
      claimable: number
      isPartner: number
      showButton: number
      createdAt: Date
    }[]
  >`SELECT id, title, description, imageUrl, validUntil, active, claimable, isPartner, showButton, createdAt FROM PartnerPromo ORDER BY createdAt DESC`

  const promos = rawPromos.map((p) => ({
    ...p,
    active: !!p.active,
    claimable: !!p.claimable,
    isPartner: p.isPartner !== 0,
    showButton: p.showButton !== 0, // Handle new column default
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Partner Promos</h1>
        <p className="text-gray-500">Manage partner promotions and deals.</p>
      </div>
      <PromoClient initialPromos={promos} />
    </div>
  )
}

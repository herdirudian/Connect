import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Tag } from 'lucide-react'
import Image from 'next/image'
import ClaimPromoButton from '@/components/ClaimPromoButton'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function PromosPage() {
  const rawPromos = await prisma.$queryRaw<
    {
      id: string
      title: string
      description: string
      imageUrl: string | null
      validUntil: Date | null
      active: number
      claimable: number
      createdAt: Date
    }[]
  >`SELECT id, title, description, imageUrl, validUntil, active, claimable, createdAt FROM PartnerPromo WHERE active = 1 AND isPartner = 1 ORDER BY createdAt DESC`

  const promos = rawPromos.map((p) => ({
    ...p,
    active: !!p.active,
    claimable: !!p.claimable,
  }))
  
  const store = await cookies()
  const token = store.get('token')?.value || ''
  const decoded = token ? (verifyToken(token) as any) : null
  let claimedMap = new Map<string, { id: string, uniqueCode: string | null }>()
  if (decoded?.userId) {
    const claims = await prisma.$queryRaw<{ id: string, promoId: string, uniqueCode: string | null }[]>`
      SELECT id, promoId, uniqueCode FROM PartnerPromoClaim WHERE userId = ${decoded.userId}
    `
    claims.forEach(c => claimedMap.set(c.promoId, { id: c.id, uniqueCode: c.uniqueCode }))
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Partner Promos</h1>
        <p className="text-gray-500 font-medium">Exclusive deals from our partners just for you.</p>
      </div>

      {promos.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
            <Tag className="h-8 w-8 text-gray-300" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">No Promos Available</h4>
          <p className="text-gray-500 mt-1">Check back later for new offers!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {promos.map((promo) => (
            <Card key={promo.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              {promo.imageUrl && (
                <div className="relative w-full h-48 bg-gray-100">
                  <img
                    src={promo.imageUrl}
                    alt={promo.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{promo.title}</h3>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {promo.description}
                </p>

                {promo.validUntil && (
                  <div className="flex items-center text-xs font-bold text-brand bg-brand-50 px-3 py-1.5 rounded-full w-fit">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Valid until {new Date(promo.validUntil).toLocaleDateString()}
                  </div>
                )}
                
                <div className="mt-4">
                  {promo.claimable ? (
                    decoded?.userId ? (
                      <ClaimPromoButton
                        promoId={promo.id}
                        promoTitle={promo.title}
                        userId={decoded.userId}
                        initiallyClaimed={claimedMap.has(promo.id)}
                        claimId={claimedMap.get(promo.id)?.id}
                        uniqueCode={claimedMap.get(promo.id)?.uniqueCode || undefined}
                      />
                    ) : (
                      <div className="text-xs text-gray-500">Login untuk claim promo</div>
                    )
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
